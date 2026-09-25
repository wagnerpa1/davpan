BEGIN;

-- 1. Safely add 'guest' to public.user_role enum
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'guest';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- 2. Enhance public.profiles with dynamic parent status & youth parental approval tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_parental_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_approval_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parental_approval_at timestamptz;

-- 3. Enhance public.child_profiles with membership_number, link to user account, and age-out status
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS membership_number varchar(255),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aged_out_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_child_profiles_membership_number
  ON public.child_profiles (membership_number);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id
  ON public.child_profiles (user_id);

-- 4. Atomic function to dynamically recalculate a user's is_parent status
CREATE OR REPLACE FUNCTION public.recalculate_user_parent_status(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET is_parent = EXISTS (
    SELECT 1
    FROM public.parent_child_relations pcr
    JOIN public.child_profiles cp ON cp.id = pcr.child_id
    WHERE pcr.parent_id = p_user_id
      AND cp.is_active = true
      AND cp.birthdate > CURRENT_DATE - INTERVAL '18 years'
  )
  WHERE id = p_user_id;
END;
$$;

-- 5. Triggers to maintain is_parent flag automatically
CREATE OR REPLACE FUNCTION public.trg_recalculate_parent_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_user_parent_status(OLD.parent_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_user_parent_status(NEW.parent_id);
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      PERFORM public.recalculate_user_parent_status(OLD.parent_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_parent_on_relation ON public.parent_child_relations;
CREATE TRIGGER trigger_recalculate_parent_on_relation
AFTER INSERT OR UPDATE OR DELETE ON public.parent_child_relations
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_parent_status();

CREATE OR REPLACE FUNCTION public.trg_recalculate_parents_on_child_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  FOR v_parent_id IN
    SELECT parent_id FROM public.parent_child_relations WHERE child_id = NEW.id
    UNION
    SELECT NEW.parent_id WHERE NEW.parent_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_user_parent_status(v_parent_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_parents_on_child_change ON public.child_profiles;
CREATE TRIGGER trigger_recalculate_parents_on_child_change
AFTER UPDATE OF birthdate, is_active ON public.child_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_parents_on_child_change();

-- 6. Atomic function to process age-out (daily automation)
CREATE OR REPLACE FUNCTION public.process_child_age_out()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_aged_out_count integer := 0;
  v_cleared_youth_approval_count integer := 0;
  v_parent_id uuid;
BEGIN
  -- 1. Deactivate child profiles reaching 18 years (keep records and tour history intact!)
  WITH aged_children AS (
    UPDATE public.child_profiles
    SET is_active = false,
        aged_out_at = COALESCE(aged_out_at, now())
    WHERE is_active = true
      AND birthdate <= CURRENT_DATE - INTERVAL '18 years'
    RETURNING id, parent_id
  )
  SELECT count(*) INTO v_aged_out_count FROM aged_children;

  -- 2. Clear parental approval requirement on youth accounts reaching 18
  WITH graduated_youth AS (
    UPDATE public.profiles
    SET requires_parental_approval = false
    WHERE requires_parental_approval = true
      AND birthdate <= CURRENT_DATE - INTERVAL '18 years'
    RETURNING id
  )
  SELECT count(*) INTO v_cleared_youth_approval_count FROM graduated_youth;

  -- 3. Recalculate parent status for all parents currently flagged as is_parent
  FOR v_parent_id IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.is_parent = true
  LOOP
    PERFORM public.recalculate_user_parent_status(v_parent_id);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'aged_out_children', v_aged_out_count,
    'cleared_youth_approvals', v_cleared_youth_approval_count
  );
END;
$$;

-- 7. Atomic function to associate child history with newly registered user accounts
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
  IF p_user_id IS NULL OR p_membership_number IS NULL OR p_membership_number = '' THEN
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

-- 8. Deprecate & clean up old invite code logic
DROP FUNCTION IF EXISTS public.redeem_child_invite(uuid, date, timestamp with time zone);
DROP TABLE IF EXISTS public.child_profile_invites CASCADE;

-- 9. Role backfill ('parent' → 'member'/'guest') and is_parent recalculation are in
--    20260923130001_backfill_guest_role.sql — they must run in a separate transaction
--    because PostgreSQL (SQLSTATE 55P04) does not allow referencing a newly-added enum
--    value in the same transaction where ALTER TYPE … ADD VALUE executed.

-- 10. Execution grants
GRANT EXECUTE ON FUNCTION public.recalculate_user_parent_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_child_age_out() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_child_history_on_registration(uuid, varchar) TO service_role, authenticated;

COMMIT;
