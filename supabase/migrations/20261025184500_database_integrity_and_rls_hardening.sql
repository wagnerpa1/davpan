BEGIN;

-- The expanded material model is canonical. Backfill legacy rows before making
-- the legacy tables read-only and removing their typoed enum dependencies.
INSERT INTO public.material_types (name)
SELECT DISTINCT btrim(m.name::text)
FROM public.materials AS m
WHERE btrim(m.name::text) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.material_types AS mt
    WHERE lower(btrim(mt.name)) = lower(btrim(m.name::text))
  );

INSERT INTO public.material_inventory (
  material_type_id,
  size,
  quantity_total,
  quantity_available
)
SELECT
  mt.id,
  m.size::text,
  m.total_quantity,
  m.total_quantity
FROM public.materials AS m
JOIN public.material_types AS mt
  ON lower(btrim(mt.name)) = lower(btrim(m.name::text))
WHERE NOT EXISTS (
  SELECT 1
  FROM public.material_inventory AS mi
  WHERE mi.material_type_id = mt.id
    AND mi.size IS NOT DISTINCT FROM m.size::text
);

DO $$
DECLARE
  duplicate_count bigint;
BEGIN
  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT lower(btrim(name))
    FROM public.material_types
    GROUP BY lower(btrim(name))
    HAVING count(*) > 1
  ) AS duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: material_types contains % duplicate names', duplicate_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS material_types_name_lower_key
  ON public.material_types (lower(btrim(name)));

DO $$
DECLARE
  duplicate_count bigint;
BEGIN
  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT tour_id, material_type_id
    FROM public.tour_material_requirements
    WHERE tour_id IS NOT NULL AND material_type_id IS NOT NULL
    GROUP BY tour_id, material_type_id
    HAVING count(*) > 1
  ) AS duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: tour_material_requirements contains % duplicate tour/type pairs', duplicate_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tour_material_requirements_tour_type_key
  ON public.tour_material_requirements (tour_id, material_type_id);

INSERT INTO public.tour_material_requirements (tour_id, material_type_id)
SELECT DISTINCT
  tm.tour_id,
  mt.id
FROM public.tour_materials AS tm
JOIN public.materials AS m ON m.id = tm.material_id
JOIN public.material_types AS mt
  ON lower(btrim(mt.name)) = lower(btrim(m.name::text))
WHERE tm.tour_id IS NOT NULL
  AND tm.material_id IS NOT NULL
ON CONFLICT (tour_id, material_type_id) DO NOTHING;

COMMENT ON TABLE public.materials IS
  'Deprecated compatibility table. Use material_types, material_inventory, and material_pricing.';
COMMENT ON TABLE public.tour_materials IS
  'Deprecated compatibility table. Use tour_material_requirements.';

ALTER TABLE public.materials
  ALTER COLUMN name TYPE text USING name::text,
  ALTER COLUMN size TYPE text USING size::text;

DROP TYPE IF EXISTS public.materal_typ;
DROP TYPE IF EXISTS public.material_size;

REVOKE ALL ON TABLE public.materials, public.tour_materials FROM anon, authenticated;

-- Keep both activation columns temporarily for application compatibility, but
-- make activated canonical and keep the legacy column synchronized.
UPDATE public.profiles
SET activated = COALESCE(activated, is_activated, false),
    is_activated = COALESCE(activated, is_activated, false)
WHERE activated IS DISTINCT FROM COALESCE(activated, is_activated, false)
   OR is_activated IS DISTINCT FROM COALESCE(activated, is_activated, false);

CREATE OR REPLACE FUNCTION public.sync_profile_activation_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.activated IS DISTINCT FROM OLD.activated THEN
    NEW.is_activated := NEW.activated;
  ELSIF NEW.is_activated IS DISTINCT FROM OLD.is_activated THEN
    NEW.activated := NEW.is_activated;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_activation_flags ON public.profiles;
CREATE TRIGGER sync_profile_activation_flags
BEFORE UPDATE OF activated, is_activated ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_activation_flags();

COMMENT ON COLUMN public.profiles.activated IS
  'Canonical activation state. is_activated remains a synchronized compatibility column.';
COMMENT ON COLUMN public.profiles.is_activated IS
  'Deprecated compatibility column; synchronized with activated.';

-- Reject invalid legacy rows before tightening the columns used by domain
-- mutations. No rows are deleted or silently repaired.
DO $$
DECLARE
  invalid_count bigint;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM public.tour_guides
  WHERE tour_id IS NULL OR user_id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: tour_guides contains % rows with NULL tour_id/user_id', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.tour_participants
  WHERE tour_id IS NULL OR user_id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: tour_participants contains % rows with NULL tour_id/user_id', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.resource_bookings
  WHERE resource_id IS NULL
     OR start_date IS NULL
     OR end_date IS NULL
     OR created_by IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: resource_bookings contains % incomplete rows', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.material_inventory
  WHERE material_type_id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: material_inventory contains % rows without material_type_id', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.material_pricing
  WHERE material_type_id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: material_pricing contains % rows without material_type_id', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.material_reservations
  WHERE material_inventory_id IS NULL
     OR user_id IS NULL
     OR quantity IS NULL
     OR quantity < 1
     OR status IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: material_reservations contains % incomplete rows', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.tour_material_requirements
  WHERE tour_id IS NULL OR material_type_id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'database cleanup blocked: tour_material_requirements contains % incomplete rows', invalid_count;
  END IF;
END;
$$;

ALTER TABLE public.tour_guides
  ALTER COLUMN tour_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.tour_participants
  ALTER COLUMN tour_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.resource_bookings
  ALTER COLUMN resource_id SET NOT NULL,
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE public.material_inventory
  ALTER COLUMN material_type_id SET NOT NULL;

ALTER TABLE public.material_pricing
  ALTER COLUMN material_type_id SET NOT NULL;

ALTER TABLE public.material_reservations
  ALTER COLUMN material_inventory_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN quantity SET DEFAULT 1,
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'requested',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.tour_material_requirements
  ALTER COLUMN tour_id SET NOT NULL,
  ALTER COLUMN material_type_id SET NOT NULL;

ALTER TABLE public.material_inventory
  ADD CONSTRAINT material_inventory_quantity_check
    CHECK (quantity_total >= 0 AND quantity_available >= 0 AND quantity_available <= quantity_total);

ALTER TABLE public.material_reservations
  ADD CONSTRAINT material_reservations_quantity_check CHECK (quantity > 0);

-- Remove policies created without an explicit role (which means PUBLIC).
DROP POLICY IF EXISTS allow_owner_select ON public.resource_bookings;
DROP POLICY IF EXISTS allow_manager_select ON public.resource_bookings;
DROP POLICY IF EXISTS allow_insert ON public.resource_bookings;
DROP POLICY IF EXISTS allow_owner_update ON public.resource_bookings;
DROP POLICY IF EXISTS allow_admin_update ON public.resource_bookings;
DROP POLICY IF EXISTS allow_owner_delete ON public.resource_bookings;
DROP POLICY IF EXISTS allow_admin_delete ON public.resource_bookings;
DROP POLICY IF EXISTS select_own_section_member_data ON public.section_members;
DROP POLICY IF EXISTS admin_manage_section_members ON public.section_members;
DROP POLICY IF EXISTS guardian_read_family_links ON public.family_guardianship;
DROP POLICY IF EXISTS guardian_manage_family_links ON public.family_guardianship;

REVOKE ALL ON TABLE public.resource_bookings FROM anon;
REVOKE ALL ON TABLE public.section_members, public.family_guardianship FROM anon;

CREATE POLICY section_members_select_authenticated
  ON public.section_members
  FOR SELECT
  TO authenticated
  USING (
    membership_number = (
      SELECT p.membership_number
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY section_members_manage_authenticated
  ON public.section_members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY family_guardianship_select_authenticated
  ON public.family_guardianship
  FOR SELECT
  TO authenticated
  USING (
    guardian_profile_id = auth.uid()
    OR child_profile_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY family_guardianship_manage_authenticated
  ON public.family_guardianship
  FOR ALL
  TO authenticated
  USING (guardian_profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (guardian_profile_id = auth.uid() OR public.is_admin());

CREATE POLICY section_member_imports_admin_select
  ON public.section_member_imports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY section_member_imports_deny_anon
  ON public.section_member_imports
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.section_member_imports FROM anon;

COMMENT ON TABLE public.section_member_imports IS
  'Sensitive import staging table. Browser access is limited to admin preview reads; writes use the service-role import RPC.';

-- SECURITY DEFINER RPCs must enforce the caller boundary themselves. RLS
-- cannot protect writes performed by a definer function.
CREATE OR REPLACE FUNCTION public.process_expired_waitlist_promotions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN
    SELECT id, tour_id
    FROM public.tour_participants
    WHERE status = 'pending_confirmation'
      AND waitlist_promoted_at < now() - interval '24 hours'
  LOOP
    UPDATE public.tour_participants
    SET status = 'cancelled'
    WHERE id = v_participant.id;
    PERFORM public.promote_first_waitlist(v_participant.tour_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_tour_atomic(
  p_tour_id uuid,
  p_user_id uuid,
  p_child_profile_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(registration_id uuid, status public.participant_status, is_waitlisted boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_tour_status public.tour_status;
  v_max_participants integer;
  v_min_age integer;
  v_birthdate date;
  v_confirmed_count integer;
  v_registration_id uuid;
  v_is_waitlisted boolean;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT t.status, t.max_participants, t.min_age
  INTO v_tour_status, v_max_participants, v_min_age
  FROM public.tours AS t
  WHERE t.id = p_tour_id;

  IF v_tour_status IS NULL THEN
    RAISE EXCEPTION 'Tour not found' USING ERRCODE = '02000';
  END IF;

  IF v_tour_status NOT IN ('open'::public.tour_status, 'full'::public.tour_status) THEN
    RAISE EXCEPTION 'Tour is not open for registration';
  END IF;

  IF p_child_profile_id IS NOT NULL THEN
    SELECT cp.birthdate
    INTO v_birthdate
    FROM public.child_profiles AS cp
    WHERE cp.id = p_child_profile_id
      AND (cp.parent_id = p_user_id OR cp.user_id = p_user_id);
    IF v_birthdate IS NULL THEN
      RAISE EXCEPTION 'Child profile not found' USING ERRCODE = '42501';
    END IF;
    IF v_min_age IS NOT NULL
       AND date_part('year', age(current_date, v_birthdate))::integer < v_min_age THEN
      RAISE EXCEPTION 'Child too young for this tour';
    END IF;
  END IF;

  SELECT count(*)
  INTO v_confirmed_count
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND status = 'confirmed'::public.participant_status;

  v_is_waitlisted := v_max_participants IS NOT NULL
    AND v_confirmed_count >= v_max_participants;

  INSERT INTO public.tour_participants (tour_id, user_id, child_profile_id, status)
  VALUES (
    p_tour_id,
    p_user_id,
    p_child_profile_id,
    'pending'::public.participant_status
  )
  RETURNING id INTO v_registration_id;

  IF v_is_waitlisted THEN
    INSERT INTO public.waitlist (tour_id, user_id, position)
    VALUES (
      p_tour_id,
      p_user_id,
      (SELECT coalesce(max(position), 0) + 1 FROM public.waitlist WHERE tour_id = p_tour_id)
    );
  END IF;

  PERFORM public.sync_tour_status_explicit(p_tour_id);

  RETURN QUERY SELECT
    v_registration_id,
    'pending'::public.participant_status,
    v_is_waitlisted,
    CASE WHEN v_is_waitlisted THEN 'Added to waitlist' ELSE 'Registration pending confirmation' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_section_membership_category(
  category_code text,
  birthdate date
) RETURNS public.membership_category_type
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  parsed_code integer;
  age_years integer;
BEGIN
  parsed_code := NULLIF(trim(category_code), '')::integer;
  age_years := date_part('year', age(current_date, birthdate))::integer;

  IF parsed_code BETWEEN 1000 AND 1999 THEN
    RETURN 'A';
  ELSIF parsed_code BETWEEN 2000 AND 2999 THEN
    RETURN 'B';
  ELSIF parsed_code BETWEEN 3000 AND 3999 THEN
    RETURN 'C';
  ELSIF parsed_code BETWEEN 4000 AND 4999 THEN
    RETURN 'D';
  ELSIF parsed_code BETWEEN 5000 AND 5999 OR parsed_code BETWEEN 7000 AND 7899 THEN
    RETURN CASE WHEN age_years < 14 THEN 'K' ELSE 'J' END;
  END IF;
  RETURN 'C';
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_section_family_guardianship(
  p_membership_number varchar,
  p_family_number varchar,
  p_birthdate date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_guardian_age integer;
  v_guardian_profile_id uuid;
  v_child_profile_id uuid;
BEGIN
  IF p_family_number IS NULL OR p_birthdate IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id, date_part('year', age(current_date, p.birthdate))::integer
  INTO v_guardian_profile_id, v_guardian_age
  FROM public.profiles AS p
  WHERE p.membership_number = p_membership_number;

  IF v_guardian_profile_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.family_guardianship AS fg
  WHERE fg.guardian_profile_id = v_guardian_profile_id
    AND fg.child_profile_id IN (
      SELECT p.id
      FROM public.profiles AS p
      JOIN public.section_members AS sm ON sm.membership_number = p.membership_number
      WHERE sm.family_number = p_family_number
        AND date_part('year', age(current_date, sm.birthdate))::integer < 18
    );

  FOR v_child_profile_id IN
    SELECT p.id
    FROM public.profiles AS p
    JOIN public.section_members AS sm ON sm.membership_number = p.membership_number
    WHERE sm.family_number = p_family_number
      AND date_part('year', age(current_date, sm.birthdate))::integer < 18
      AND p.id <> v_guardian_profile_id
  LOOP
    INSERT INTO public.family_guardianship (
      guardian_profile_id, child_profile_id, is_verified_guardian, guardian_request_status
    ) VALUES (
      v_guardian_profile_id,
      v_child_profile_id,
      v_guardian_age > 25,
      CASE
        WHEN v_guardian_age > 25 THEN 'verified'
        WHEN v_guardian_age BETWEEN 18 AND 25 THEN 'pending'
        ELSE 'rejected'
      END
    )
    ON CONFLICT (guardian_profile_id, child_profile_id) DO UPDATE
    SET is_verified_guardian = EXCLUDED.is_verified_guardian,
        guardian_request_status = EXCLUDED.guardian_request_status;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_resource_booking_atomic(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT id, tour_id, resource_id, created_by
  INTO v_booking
  FROM public.resource_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = '02000';
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT (
       public.is_admin()
       OR public.is_materialwart_or_admin()
       OR (v_booking.tour_id IS NOT NULL AND public.can_manage_tour(v_booking.tour_id))
       OR v_booking.created_by = auth.uid()
     ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.resource_bookings
  SET status = 'released'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'resource_id', v_booking.resource_id,
    'tour_id', v_booking.tour_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_material_for_tour_atomic(
  p_tour_id uuid,
  p_user_id uuid,
  p_child_id uuid,
  p_material_inventory_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_inventory record;
  v_reservation_id uuid;
BEGIN
  IF auth.role() <> 'service_role'
     AND (
       auth.uid() IS NULL
       OR (
         auth.uid() IS DISTINCT FROM p_user_id
         AND NOT public.is_materialwart_or_admin()
         AND NOT public.can_manage_tour(p_tour_id)
       )
     ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023';
  END IF;

  IF p_child_id IS NOT NULL
     AND auth.role() <> 'service_role'
     AND NOT public.is_materialwart_or_admin()
     AND NOT public.can_manage_tour(p_tour_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.child_profiles AS cp
       WHERE cp.id = p_child_id
         AND (cp.parent_id = auth.uid() OR cp.user_id = auth.uid())
     ) THEN
    RAISE EXCEPTION 'unauthorized child profile' USING ERRCODE = '42501';
  END IF;

  SELECT id, quantity_available
  INTO v_inventory
  FROM public.material_inventory
  WHERE id = p_material_inventory_id
  FOR UPDATE;

  IF v_inventory IS NULL THEN
    RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
  END IF;

  IF v_inventory.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory' USING ERRCODE = '08000';
  END IF;

  INSERT INTO public.material_reservations (
    tour_id, material_inventory_id, user_id, child_profile_id,
    quantity, status
  ) VALUES (
    p_tour_id, p_material_inventory_id, p_user_id, p_child_id,
    p_quantity, 'reserved'
  )
  RETURNING id INTO v_reservation_id;

  UPDATE public.material_inventory
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_material_inventory_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'material_inventory_id', p_material_inventory_id,
    'quantity', p_quantity
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_material_independent_atomic(
  p_user_id uuid,
  p_child_id uuid,
  p_material_inventory_id uuid,
  p_loan_date date,
  p_return_date date,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_inventory record;
  v_reservation_id uuid;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1
     OR (p_return_date IS NOT NULL AND p_loan_date IS NOT NULL AND p_return_date < p_loan_date) THEN
    RAISE EXCEPTION 'invalid reservation input' USING ERRCODE = '22023';
  END IF;

  IF p_child_id IS NOT NULL
     AND auth.role() <> 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.child_profiles AS cp
       WHERE cp.id = p_child_id
         AND (cp.parent_id = auth.uid() OR cp.user_id = auth.uid())
     ) THEN
    RAISE EXCEPTION 'unauthorized child profile' USING ERRCODE = '42501';
  END IF;

  SELECT id, quantity_available
  INTO v_inventory
  FROM public.material_inventory
  WHERE id = p_material_inventory_id
  FOR UPDATE;

  IF v_inventory IS NULL THEN
    RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
  END IF;

  IF v_inventory.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory' USING ERRCODE = '08000';
  END IF;

  INSERT INTO public.material_reservations (
    tour_id, material_inventory_id, user_id, child_profile_id,
    quantity, status, loan_date, return_date
  ) VALUES (
    NULL, p_material_inventory_id, p_user_id, p_child_id,
    p_quantity, 'requested', p_loan_date, p_return_date
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'status', 'requested'
  );
END;
$$;

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
AS $$
DECLARE
  v_res record;
  v_inventory record;
  v_delta integer := 0;
  v_quantity integer;
  v_cached_response jsonb;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT response INTO v_cached_response
    FROM public.mutation_idempotency
    WHERE scope = 'material_reservation_transition'
      AND idempotency_key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  SELECT id, status, quantity, tour_id, user_id, child_profile_id, material_inventory_id
  INTO v_res
  FROM public.material_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'Reservation not found' USING ERRCODE = '02000';
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT (
       v_res.user_id = auth.uid()
       OR public.is_materialwart_or_admin()
       OR (v_res.tour_id IS NOT NULL AND public.can_manage_tour(v_res.tour_id))
       OR (v_res.child_profile_id IS NOT NULL AND EXISTS (
         SELECT 1
         FROM public.child_profiles AS cp
         WHERE cp.id = v_res.child_profile_id
           AND (cp.parent_id = auth.uid() OR cp.user_id = auth.uid())
       ))
     ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_res.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'Reservation status changed concurrently' USING ERRCODE = '40001';
  END IF;

  IF NOT (
    (p_expected_status = 'requested' AND p_new_status IN ('reserved', 'cancelled'))
    OR (p_expected_status = 'reserved' AND p_new_status IN ('on loan', 'cancelled'))
    OR (p_expected_status = 'on loan' AND p_new_status IN ('returned', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid reservation status transition' USING ERRCODE = '22023';
  END IF;

  v_quantity := greatest(v_res.quantity, 1);
  IF p_expected_status = 'requested' AND p_new_status = 'reserved' THEN
    v_delta := -v_quantity;
  ELSIF p_expected_status IN ('reserved', 'on loan')
        AND p_new_status IN ('returned', 'cancelled') THEN
    v_delta := v_quantity;
  END IF;

  IF v_delta <> 0 THEN
    SELECT id, quantity_available INTO v_inventory
    FROM public.material_inventory
    WHERE id = v_res.material_inventory_id
    FOR UPDATE;
    IF v_inventory IS NULL OR v_inventory.quantity_available + v_delta < 0 THEN
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
    'old_status', p_expected_status,
    'new_status', p_new_status,
    'inventory_delta', v_delta
  );
  PERFORM public.store_mutation_idempotency_response(
    'material_reservation_transition', p_idempotency_key, v_result
  );
  RETURN v_result;
END;
$$;

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
AS $$
DECLARE
  v_res record;
  v_inventory record;
  v_cached_response jsonb;
  v_cancelled_count integer := 0;
  v_restored_count integer := 0;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF auth.role() <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_materialwart_or_admin()
     AND NOT public.can_manage_tour(p_tour_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_child_profile_id IS NOT NULL
     AND auth.role() <> 'service_role'
     AND NOT public.is_materialwart_or_admin()
     AND NOT public.can_manage_tour(p_tour_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.child_profiles AS cp
       WHERE cp.id = p_child_profile_id
         AND (cp.parent_id = auth.uid() OR cp.user_id = auth.uid())
     ) THEN
    RAISE EXCEPTION 'unauthorized child profile' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT response INTO v_cached_response
    FROM public.mutation_idempotency
    WHERE scope = 'participant_material_sync'
      AND idempotency_key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  IF p_new_status = 'cancelled' THEN
    FOR v_res IN
      SELECT id, material_inventory_id, status, coalesce(quantity, 1) AS quantity
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
        SELECT id, quantity_available INTO v_inventory
        FROM public.material_inventory
        WHERE id = v_res.material_inventory_id
        FOR UPDATE;
        IF v_inventory IS NOT NULL THEN
          UPDATE public.material_inventory
          SET quantity_available = quantity_available + v_res.quantity
          WHERE id = v_res.material_inventory_id;
        END IF;
      END IF;
      IF v_res.status <> 'cancelled' THEN
        UPDATE public.material_reservations
        SET status = 'cancelled'
        WHERE id = v_res.id;
        v_cancelled_count := v_cancelled_count + 1;
      END IF;
    END LOOP;
  ELSIF p_previous_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    FOR v_res IN
      SELECT id, material_inventory_id, coalesce(quantity, 1) AS quantity
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
      SELECT id, quantity_available INTO v_inventory
      FROM public.material_inventory
      WHERE id = v_res.material_inventory_id
      FOR UPDATE;
      IF v_inventory IS NULL OR v_inventory.quantity_available < v_res.quantity THEN
        RAISE EXCEPTION 'Material is not available for restoration' USING ERRCODE = '08000';
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
    'participant_material_sync', p_idempotency_key, v_result
  );
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_material_independent_atomic(uuid, uuid, uuid, date, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_material_independent_atomic(uuid, uuid, uuid, date, date, integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.register_tour_atomic(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tour_atomic(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.process_expired_waitlist_promotions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_expired_waitlist_promotions() TO service_role;
REVOKE EXECUTE ON FUNCTION public.reserve_material_for_tour_atomic(uuid, uuid, uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_material_for_tour_atomic(uuid, uuid, uuid, uuid, integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.release_resource_booking_atomic(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_resource_booking_atomic(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.apply_material_reservation_transition_atomic(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_material_reservation_transition_atomic(uuid, text, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.sync_participant_material_reservations_atomic(uuid, uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_participant_material_reservations_atomic(uuid, uuid, uuid, text, text, text) TO authenticated, service_role;

COMMIT;
