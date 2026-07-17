BEGIN;

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
  child_count integer;
  guardian_birthdate date;
  guardian_profile_id uuid;
  child_profile_id uuid;
BEGIN
  IF p_family_number IS NULL OR p_birthdate IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*)
    INTO child_count
  FROM public.section_members sm
  WHERE sm.family_number = p_family_number
    AND age(current_date, sm.birthdate) < interval '18 years';

  IF child_count = 0 THEN
    RETURN;
  END IF;

  SELECT p.id, p.birthdate
    INTO guardian_profile_id, guardian_birthdate
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
        AND age(current_date, sm.birthdate) < interval '18 years'
    );

  FOR child_profile_id IN
    SELECT p.id
    FROM public.profiles p
    JOIN public.section_members sm ON sm.membership_number = p.membership_number
    WHERE sm.family_number = p_family_number
      AND age(current_date, sm.birthdate) < interval '18 years'
      AND p.id <> guardian_profile_id
  LOOP
    INSERT INTO public.family_guardianship (
      guardian_profile_id,
      child_profile_id,
      is_verified_guardian
    ) VALUES (
      guardian_profile_id,
      child_profile_id,
      coalesce(date_part('year', age(current_date, guardian_birthdate)) > 25, false)
    )
    ON CONFLICT (guardian_profile_id, child_profile_id) DO UPDATE
      SET is_verified_guardian = EXCLUDED.is_verified_guardian;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_section_guardianship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM public.sync_section_family_guardianship(
    NEW.membership_number,
    NEW.family_number,
    NEW.birthdate
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_section_guardianship ON public.section_members;

CREATE TRIGGER trigger_sync_section_guardianship
AFTER INSERT OR UPDATE OF family_number, birthdate, membership_number
ON public.section_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_section_guardianship();

COMMENT ON FUNCTION public.sync_section_family_guardianship IS 'Derives guardian links from family-numbered section members.';
COMMENT ON FUNCTION public.trg_sync_section_guardianship IS 'Keeps family_guardianship aligned with imported section member data.';

COMMIT;