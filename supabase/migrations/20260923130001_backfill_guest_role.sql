-- Backfill: migrate existing 'parent' roles to 'member' or 'guest' and recalculate is_parent.
--
-- This must run in a SEPARATE transaction from the migration that added the 'guest'
-- enum value (20260923130000). PostgreSQL requires ALTER TYPE … ADD VALUE to commit
-- before the new label can be referenced in DML (SQLSTATE 55P04).

BEGIN;

-- 9. Migrate existing static 'parent' roles to 'member' or 'guest' and backfill is_parent
UPDATE public.profiles
SET role = CASE
  WHEN membership_number IS NOT NULL AND membership_number <> '' THEN 'member'::public.user_role
  ELSE 'guest'::public.user_role
END
WHERE role = 'parent'::public.user_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalculate_user_parent_status(r.id);
  END LOOP;
END$$;

COMMIT;
