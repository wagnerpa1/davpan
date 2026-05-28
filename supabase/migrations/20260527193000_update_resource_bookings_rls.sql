-- Migration: Update RLS for resource_bookings
-- Ensures that:
--  - Owners (created_by) can see and manage their bookings
--  - Admins and Materialwart can view and manage all bookings
--  - Guides can view bookings for tours they lead
--  - Only owners or admins can delete bookings

BEGIN;

-- Enable row-level security if not already enabled
ALTER TABLE IF EXISTS public.resource_bookings ENABLE ROW LEVEL SECURITY;

-- SELECT: owners can see their rows
DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_owner_select' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_owner_select ON public.resource_bookings
        FOR SELECT
        USING (created_by = auth.uid());
    END IF;
END$$;

-- SELECT: managers (admin/materialwart) or guides-of-tour can see rows
DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_manager_select' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_manager_select ON public.resource_bookings
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','materialwart')
          )
          OR EXISTS (
            SELECT 1 FROM public.tour_guides tg WHERE tg.tour_id = public.resource_bookings.tour_id AND tg.user_id = auth.uid()
          )
        );
    END IF;
END$$;

-- INSERT: require created_by to be the authenticated user
DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_insert' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_insert ON public.resource_bookings
        FOR INSERT
        WITH CHECK (created_by = auth.uid());
    END IF;
END$$;

-- UPDATE: owners may update their own rows; admins may update any row
DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_owner_update' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_owner_update ON public.resource_bookings
        FOR UPDATE
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    END IF;
END$$;

DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_admin_update' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_admin_update ON public.resource_bookings
        FOR UPDATE
        USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
    END IF;
END$$;

-- DELETE: owners or admins only
DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_owner_delete' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_owner_delete ON public.resource_bookings
        FOR DELETE
        USING (created_by = auth.uid());
    END IF;
END$$;

DO $$BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'allow_admin_delete' AND polrelid = 'public.resource_bookings'::regclass
    ) THEN
      CREATE POLICY allow_admin_delete ON public.resource_bookings
        FOR DELETE
        USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
    END IF;
END$$;

COMMIT;
