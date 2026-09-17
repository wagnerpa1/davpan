-- Migration: 20260917170000_participant_material_sync_and_transitions.sql
-- Description: Enforce material reservation state transitions in DB and provide atomic participant material sync RPC

-- 1. Enforce allowed state transitions in apply_material_reservation_transition_atomic
CREATE OR REPLACE FUNCTION public.apply_material_reservation_transition_atomic(
  p_reservation_id uuid,
  p_expected_status text,
  p_new_status text,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_res RECORD;
  v_inventory RECORD;
  v_delta INTEGER := 0;
  v_qty INTEGER := 1;
  v_cached_response JSONB;
  v_result JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    SELECT response
    INTO v_cached_response
    FROM public.mutation_idempotency
    WHERE scope = 'material_reservation_transition'
      AND idempotency_key = p_idempotency_key;

    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'p_reservation_id is required';
  END IF;

  SELECT id, status, quantity, tour_id, user_id, child_profile_id, material_inventory_id
  INTO v_res
  FROM public.material_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'Reservation not found' USING ERRCODE = '02000';
  END IF;

  IF COALESCE(v_res.status, 'requested') IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'Reservation status changed concurrently' USING ERRCODE = '40001';
  END IF;

  -- Enforce valid status transition state machine
  IF NOT (
    (p_expected_status = 'requested' AND p_new_status IN ('reserved', 'cancelled')) OR
    (p_expected_status = 'reserved' AND p_new_status IN ('on loan', 'cancelled')) OR
    (p_expected_status = 'on loan' AND p_new_status IN ('returned', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid reservation status transition from % to %', p_expected_status, p_new_status USING ERRCODE = '22023';
  END IF;

  v_qty := GREATEST(COALESCE(v_res.quantity, 1), 1);

  IF p_expected_status = 'requested' AND p_new_status = 'reserved' THEN
    v_delta := -v_qty;
  ELSIF p_expected_status IN ('reserved', 'on loan') AND p_new_status IN ('returned', 'cancelled') THEN
    v_delta := v_qty;
  END IF;

  IF v_delta <> 0 THEN
    SELECT id, quantity_available
    INTO v_inventory
    FROM public.material_inventory
    WHERE id = v_res.material_inventory_id
    FOR UPDATE;

    IF v_inventory IS NULL THEN
      RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
    END IF;

    IF v_inventory.quantity_available + v_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient inventory' USING ERRCODE = '08000';
    END IF;

    UPDATE public.material_inventory
    SET quantity_available = quantity_available + v_delta
    WHERE id = v_res.material_inventory_id;
  END IF;

  UPDATE public.material_reservations
  SET status = p_new_status
  WHERE id = p_reservation_id;

  v_result := jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'tour_id', v_res.tour_id,
    'user_id', v_res.user_id,
    'child_profile_id', v_res.child_profile_id,
    'old_status', p_expected_status,
    'new_status', p_new_status,
    'inventory_delta', v_delta
  );

  PERFORM public.store_mutation_idempotency_response(
    'material_reservation_transition',
    p_idempotency_key,
    v_result
  );

  RETURN v_result;
END;
$function$;

-- 2. Atomic participant material synchronization RPC
CREATE OR REPLACE FUNCTION public.sync_participant_material_reservations_atomic(
  p_tour_id uuid,
  p_user_id uuid,
  p_child_profile_id uuid,
  p_new_status text,
  p_previous_status text,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_res RECORD;
  v_inv RECORD;
  v_cached_response jsonb;
  v_cancelled_count integer := 0;
  v_restored_count integer := 0;
  v_result jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    SELECT response
      INTO v_cached_response
      FROM public.mutation_idempotency
     WHERE scope = 'participant_material_sync'
       AND idempotency_key = p_idempotency_key;

    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  IF p_new_status = 'cancelled' THEN
    -- Cancel active reservations and return inventory
    FOR v_res IN
      SELECT id, material_inventory_id, status, COALESCE(quantity, 1) as quantity
        FROM public.material_reservations
       WHERE tour_id = p_tour_id
         AND user_id = p_user_id
         AND (
           (p_child_profile_id IS NOT NULL AND child_profile_id = p_child_profile_id)
           OR (p_child_profile_id IS NULL AND child_profile_id IS NULL)
         )
       FOR UPDATE
    LOOP
      IF v_res.status IN ('reserved', 'on loan') THEN
        SELECT id, quantity_available
          INTO v_inv
          FROM public.material_inventory
         WHERE id = v_res.material_inventory_id
         FOR UPDATE;

        IF v_inv IS NOT NULL THEN
          UPDATE public.material_inventory
             SET quantity_available = quantity_available + v_res.quantity
           WHERE id = v_res.material_inventory_id;
        END IF;

        UPDATE public.material_reservations
           SET status = 'cancelled'
         WHERE id = v_res.id;

        v_cancelled_count := v_cancelled_count + 1;
      ELSIF v_res.status <> 'cancelled' THEN
        UPDATE public.material_reservations
           SET status = 'cancelled'
         WHERE id = v_res.id;

        v_cancelled_count := v_cancelled_count + 1;
      END IF;
    END LOOP;

  ELSIF p_previous_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    -- Verify inventory availability for all cancelled reservations before mutating
    FOR v_res IN
      SELECT id, material_inventory_id, status, COALESCE(quantity, 1) as quantity
        FROM public.material_reservations
       WHERE tour_id = p_tour_id
         AND user_id = p_user_id
         AND (
           (p_child_profile_id IS NOT NULL AND child_profile_id = p_child_profile_id)
           OR (p_child_profile_id IS NULL AND child_profile_id IS NULL)
         )
         AND status = 'cancelled'
       FOR UPDATE
    LOOP
      SELECT id, quantity_available
        INTO v_inv
        FROM public.material_inventory
       WHERE id = v_res.material_inventory_id
       FOR UPDATE;

      IF v_inv IS NULL OR v_inv.quantity_available < v_res.quantity THEN
        RAISE EXCEPTION 'Wiederherstellung nicht möglich: reserviertes Material ist aktuell nicht verfügbar.' USING ERRCODE = '08000';
      END IF;

      UPDATE public.material_inventory
         SET quantity_available = quantity_available - v_res.quantity
       WHERE id = v_res.material_inventory_id;

      UPDATE public.material_reservations
         SET status = 'reserved'
       WHERE id = v_res.id;

      v_restored_count := v_restored_count + 1;
    END LOOP;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count,
    'restored_count', v_restored_count
  );

  PERFORM public.store_mutation_idempotency_response(
    'participant_material_sync',
    p_idempotency_key,
    v_result
  );

  RETURN v_result;
END;
$function$;
