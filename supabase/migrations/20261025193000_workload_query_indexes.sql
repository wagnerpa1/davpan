BEGIN;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_child_created_at
  ON public.notifications (recipient_child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_material_reservations_tour_status
  ON public.material_reservations (tour_id, status);

CREATE INDEX IF NOT EXISTS idx_tour_participants_tour_status
  ON public.tour_participants (tour_id, status);

CREATE INDEX IF NOT EXISTS idx_tour_guides_tour_user
  ON public.tour_guides (tour_id, user_id);

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_active
  ON public.child_profiles (parent_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending_available
  ON public.notification_outbox (available_at, id)
  WHERE status = 'pending';

COMMIT;
