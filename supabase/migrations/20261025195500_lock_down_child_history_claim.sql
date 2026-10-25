BEGIN;

REVOKE EXECUTE
  ON FUNCTION public.claim_child_history_on_registration(uuid, varchar)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.claim_child_history_on_registration(uuid, varchar)
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_child_history_on_registration(
  p_user_id uuid,
  p_membership_number varchar
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_child_id uuid;
  v_claimed_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'This function is restricted to trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_membership_number IS NULL OR btrim(p_membership_number) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_parameters');
  END IF;

  FOR v_child_id IN
    SELECT id
    FROM public.child_profiles
    WHERE membership_number = p_membership_number
  LOOP
    UPDATE public.child_profiles
    SET user_id = p_user_id
    WHERE id = v_child_id;

    UPDATE public.tour_participants
    SET user_id = p_user_id
    WHERE child_profile_id = v_child_id
      AND (user_id IS NULL OR user_id <> p_user_id);

    v_claimed_count := v_claimed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_child_profiles', v_claimed_count
  );
END;
$$;

COMMIT;
