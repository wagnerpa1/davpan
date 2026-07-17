BEGIN;

ALTER TABLE public.family_guardianship
  ADD COLUMN IF NOT EXISTS guardian_request_status text NOT NULL DEFAULT 'verified';

DO $$
BEGIN
  ALTER TABLE public.family_guardianship
    ADD CONSTRAINT family_guardianship_request_status_check
    CHECK (guardian_request_status IN ('verified', 'pending', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE OR REPLACE FUNCTION public.sync_section_family_guardianship(
  p_membership_number varchar,
  p_family_number varchar,
  p_birthdate date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guardian_age integer;
  guardian_profile_id uuid;
  child_profile_id uuid;
BEGIN
  IF p_family_number IS NULL OR p_birthdate IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id, date_part('year', age(current_date, p.birthdate))::integer
    INTO guardian_profile_id, guardian_age
  FROM public.profiles p
  WHERE p.membership_number = p_membership_number;

  IF guardian_profile_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.family_guardianship fg
  WHERE fg.guardian_profile_id = guardian_profile_id
    AND fg.child_profile_id IN (
      SELECT p.id
      FROM public.profiles p
      JOIN public.section_members sm ON sm.membership_number = p.membership_number
      WHERE sm.family_number = p_family_number
        AND date_part('year', age(current_date, sm.birthdate))::integer < 18
    );

  FOR child_profile_id IN
    SELECT p.id
    FROM public.profiles p
    JOIN public.section_members sm ON sm.membership_number = p.membership_number
    WHERE sm.family_number = p_family_number
      AND date_part('year', age(current_date, sm.birthdate))::integer < 18
      AND p.id <> guardian_profile_id
  LOOP
    INSERT INTO public.family_guardianship (
      guardian_profile_id,
      child_profile_id,
      is_verified_guardian,
      guardian_request_status
    ) VALUES (
      guardian_profile_id,
      child_profile_id,
      guardian_age > 25,
      CASE
        WHEN guardian_age > 25 THEN 'verified'
        WHEN guardian_age BETWEEN 18 AND 25 THEN 'pending'
        ELSE 'rejected'
      END
    )
    ON CONFLICT (guardian_profile_id, child_profile_id) DO UPDATE
      SET is_verified_guardian = EXCLUDED.is_verified_guardian,
          guardian_request_status = EXCLUDED.guardian_request_status;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.family_guardianship.guardian_request_status IS 'Tracks whether a guardian link is verified, pending review, or rejected.';

COMMIT;