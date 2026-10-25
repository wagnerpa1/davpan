BEGIN;

-- No SECURITY DEFINER function in the exposed public schema should inherit
-- PUBLIC/anon execution. Existing explicit authenticated grants are preserved.
DO $$
DECLARE
  v_function record;
BEGIN
  FOR v_function IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      v_function.schema_name,
      v_function.function_name,
      v_function.arguments
    );
  END LOOP;
END;
$$;

-- This worker reads Vault secrets and sends an authenticated outbound request.
-- It must only be callable by the scheduler/service role.
REVOKE EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_notification_outbox_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'app_site_url';

  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'http://localhost:3000';
  END IF;

  v_url := v_url || '/api/internal/notifications/outbox';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_cron_secret';

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'internal_cron_secret is not configured; outbox trigger skipped';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() TO service_role;

-- Explicitly scope the legacy PUBLIC policies to authenticated users.
DROP POLICY IF EXISTS allow_admin_delete ON public.resource_bookings;
DROP POLICY IF EXISTS allow_admin_update ON public.resource_bookings;
DROP POLICY IF EXISTS allow_insert ON public.resource_bookings;
DROP POLICY IF EXISTS allow_manager_select ON public.resource_bookings;
DROP POLICY IF EXISTS allow_owner_delete ON public.resource_bookings;
DROP POLICY IF EXISTS allow_owner_select ON public.resource_bookings;
DROP POLICY IF EXISTS allow_owner_update ON public.resource_bookings;
DROP POLICY IF EXISTS admin_manage_section_members ON public.section_members;
DROP POLICY IF EXISTS select_own_section_member_data ON public.section_members;
DROP POLICY IF EXISTS guardian_manage_family_links ON public.family_guardianship;
DROP POLICY IF EXISTS guardian_read_family_links ON public.family_guardianship;
DROP POLICY IF EXISTS section_members_select_authenticated ON public.section_members;
DROP POLICY IF EXISTS section_members_manage_authenticated ON public.section_members;
DROP POLICY IF EXISTS family_guardianship_select_authenticated ON public.family_guardianship;
DROP POLICY IF EXISTS family_guardianship_manage_authenticated ON public.family_guardianship;
DROP POLICY IF EXISTS section_member_imports_admin_select ON public.section_member_imports;

CREATE POLICY resource_bookings_owner_select_authenticated
  ON public.resource_bookings
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY resource_bookings_manager_select_authenticated
  ON public.resource_bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'materialwart')
    )
    OR EXISTS (
      SELECT 1
      FROM public.tour_guides AS tg
      WHERE tg.tour_id = resource_bookings.tour_id
        AND tg.user_id = auth.uid()
    )
  );

CREATE POLICY resource_bookings_insert_authenticated
  ON public.resource_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY resource_bookings_owner_update_authenticated
  ON public.resource_bookings
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY resource_bookings_admin_update_authenticated
  ON public.resource_bookings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY resource_bookings_owner_delete_authenticated
  ON public.resource_bookings
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY resource_bookings_admin_delete_authenticated
  ON public.resource_bookings
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

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

ALTER TABLE public.section_member_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_member_imports_admin_select
  ON public.section_member_imports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.section_member_imports FROM anon, authenticated;
GRANT SELECT ON TABLE public.section_member_imports TO authenticated;

-- Index every public foreign-key column reported by the Supabase advisor.
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_child_notification_preferences_parent_id
  ON public.child_notification_preferences (parent_id);
CREATE INDEX IF NOT EXISTS idx_material_inventory_material_type_id
  ON public.material_inventory (material_type_id);
CREATE INDEX IF NOT EXISTS idx_material_pricing_material_type_id
  ON public.material_pricing (material_type_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_child_profile_id
  ON public.material_reservations (child_profile_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_material_inventory_id
  ON public.material_reservations (material_inventory_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_tour_id
  ON public.material_reservations (tour_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_user_id
  ON public.material_reservations (user_id);
CREATE INDEX IF NOT EXISTS idx_news_posts_published_by
  ON public.news_posts (published_by);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_aggregate_id
  ON public.notification_outbox (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_news_post_id
  ON public.notifications (news_post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_group_id
  ON public.notifications (related_group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_tour_id
  ON public.notifications (related_tour_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parental_approval_by
  ON public.profiles (parental_approval_by);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_created_by
  ON public.resource_bookings (created_by);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_tour_id
  ON public.resource_bookings (tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_material_requirements_material_type_id
  ON public.tour_material_requirements (material_type_id);
CREATE INDEX IF NOT EXISTS idx_tour_material_requirements_tour_id
  ON public.tour_material_requirements (tour_id);
CREATE INDEX IF NOT EXISTS idx_tours_category
  ON public.tours (category);
CREATE INDEX IF NOT EXISTS idx_tours_group
  ON public.tours ("group");

COMMIT;
