BEGIN;

DO $$
BEGIN
  CREATE TYPE public.membership_category_type AS ENUM ('A', 'B', 'C', 'D', 'J', 'K');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE TABLE IF NOT EXISTS public.section_members (
  membership_number varchar(255) PRIMARY KEY,
  family_number varchar(255),
  household_number varchar(255),
  salutation varchar(50),
  first_name varchar(255) NOT NULL,
  last_name varchar(255) NOT NULL,
  birthdate date NOT NULL,
  email varchar(255),
  phone_mobile varchar(255),
  zip_city varchar(255),
  iban_masked varchar(255),
  bank_name varchar(255),
  membership_category_code varchar(10) NOT NULL,
  membership_category public.membership_category_type NOT NULL,
  section_number varchar(10),
  stammsektion varchar(255),
  gastsektion varchar(255),
  is_active boolean NOT NULL DEFAULT true,
  imported_at timestamptz NOT NULL DEFAULT now(),
  source_row_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.section_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.family_guardianship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_verified_guardian boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_guardianship UNIQUE (guardian_profile_id, child_profile_id)
);

ALTER TABLE public.family_guardianship ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_activated boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_number varchar(255);

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_membership_number_key UNIQUE (membership_number);
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_membership_number_fkey
    FOREIGN KEY (membership_number)
    REFERENCES public.section_members (membership_number)
    NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE INDEX IF NOT EXISTS idx_section_members_family_number
  ON public.section_members (family_number);

CREATE INDEX IF NOT EXISTS idx_section_members_household_number
  ON public.section_members (household_number);

CREATE INDEX IF NOT EXISTS idx_family_guardianship_guardian_profile_id
  ON public.family_guardianship (guardian_profile_id);

CREATE INDEX IF NOT EXISTS idx_family_guardianship_child_profile_id
  ON public.family_guardianship (child_profile_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'select_own_section_member_data'
      AND polrelid = 'public.section_members'::regclass
  ) THEN
    CREATE POLICY select_own_section_member_data
      ON public.section_members
      FOR SELECT
      USING (
        membership_number = (
          SELECT p.membership_number
          FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'admin_manage_section_members'
      AND polrelid = 'public.section_members'::regclass
  ) THEN
    CREATE POLICY admin_manage_section_members
      ON public.section_members
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'guardian_read_family_links'
      AND polrelid = 'public.family_guardianship'::regclass
  ) THEN
    CREATE POLICY guardian_read_family_links
      ON public.family_guardianship
      FOR SELECT
      USING (
        guardian_profile_id = auth.uid()
        OR child_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'guardian_manage_family_links'
      AND polrelid = 'public.family_guardianship'::regclass
  ) THEN
    CREATE POLICY guardian_manage_family_links
      ON public.family_guardianship
      FOR ALL
      USING (
        guardian_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
      WITH CHECK (
        guardian_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_membership_number_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END$$;

COMMIT;