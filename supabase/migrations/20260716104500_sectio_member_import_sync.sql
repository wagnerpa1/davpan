BEGIN;

CREATE TABLE IF NOT EXISTS public.section_member_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  membership_number varchar(255) NOT NULL,
  family_number varchar(255),
  household_number varchar(255),
  salutation varchar(50),
  first_name varchar(255) NOT NULL,
  last_name varchar(255) NOT NULL,
  birthdate date NOT NULL,
  email varchar(255),
  phone_mobile varchar(255),
  zip_city varchar(255),
  iban varchar(255),
  bank_name varchar(255),
  membership_category_code varchar(10) NOT NULL,
  section_number varchar(10),
  stammsektion varchar(255),
  gastsektion varchar(255),
  is_active boolean NOT NULL DEFAULT true,
  source_row_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.section_member_imports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_section_member_imports_batch_id
  ON public.section_member_imports (import_batch_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_section_member_imports_row_hash
  ON public.section_member_imports (source_row_hash);

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
  age_years := date_part('year', age(age(current_date), birthdate));

  IF parsed_code BETWEEN 1000 AND 1999 THEN
    RETURN 'A';
  ELSIF parsed_code BETWEEN 2000 AND 2999 THEN
    RETURN 'B';
  ELSIF parsed_code BETWEEN 3000 AND 3999 THEN
    RETURN 'C';
  ELSIF parsed_code BETWEEN 4000 AND 4999 THEN
    RETURN 'D';
  ELSIF parsed_code BETWEEN 5000 AND 5999 OR parsed_code BETWEEN 7000 AND 7899 THEN
    IF age_years < 14 THEN
      RETURN 'K';
    END IF;

    RETURN 'J';
  ELSIF parsed_code = 7700 THEN
    IF age_years < 14 THEN
      RETURN 'K';
    ELSIF age_years < 18 THEN
      RETURN 'J';
    END IF;

    RETURN 'D';
  END IF;

  RETURN 'C';
END;
$$;

CREATE OR REPLACE FUNCTION public.import_section_member_row(
  p_membership_number varchar,
  p_family_number varchar,
  p_household_number varchar,
  p_salutation varchar,
  p_first_name varchar,
  p_last_name varchar,
  p_birthdate date,
  p_email varchar,
  p_phone_mobile varchar,
  p_zip_city varchar,
  p_iban varchar,
  p_bank_name varchar,
  p_membership_category_code varchar,
  p_section_number varchar,
  p_stammsektion varchar,
  p_gastsektion varchar,
  p_is_active boolean,
  p_source_row_hash text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_category public.membership_category_type;
  masked_iban text;
BEGIN
  normalized_category := public.normalize_section_membership_category(
    p_membership_category_code,
    p_birthdate
  );

  masked_iban := CASE
    WHEN coalesce(nullif(trim(p_iban), ''), '') = '' THEN NULL
    ELSE left(p_iban, 2) || repeat('*', greatest(length(p_iban) - 6, 0)) || right(p_iban, 4)
  END;

  INSERT INTO public.section_member_imports (
    membership_number,
    family_number,
    household_number,
    salutation,
    first_name,
    last_name,
    birthdate,
    email,
    phone_mobile,
    zip_city,
    iban,
    bank_name,
    membership_category_code,
    section_number,
    stammsektion,
    gastsektion,
    is_active,
    source_row_hash
  ) VALUES (
    p_membership_number,
    p_family_number,
    p_household_number,
    p_salutation,
    p_first_name,
    p_last_name,
    p_birthdate,
    p_email,
    p_phone_mobile,
    p_zip_city,
    masked_iban,
    p_bank_name,
    p_membership_category_code,
    p_section_number,
    p_stammsektion,
    p_gastsektion,
    coalesce(p_is_active, true),
    p_source_row_hash
  )
  ON CONFLICT (source_row_hash) DO UPDATE
    SET imported_at = now(),
        is_active = EXCLUDED.is_active;

  INSERT INTO public.section_members (
    membership_number,
    family_number,
    household_number,
    salutation,
    first_name,
    last_name,
    birthdate,
    email,
    phone_mobile,
    zip_city,
    iban_masked,
    bank_name,
    membership_category_code,
    membership_category,
    section_number,
    stammsektion,
    gastsektion,
    is_active,
    source_row_hash,
    imported_at,
    updated_at
  ) VALUES (
    p_membership_number,
    p_family_number,
    p_household_number,
    p_salutation,
    p_first_name,
    p_last_name,
    p_birthdate,
    p_email,
    p_phone_mobile,
    p_zip_city,
    masked_iban,
    p_bank_name,
    p_membership_category_code,
    normalized_category,
    p_section_number,
    p_stammsektion,
    p_gastsektion,
    coalesce(p_is_active, true),
    p_source_row_hash,
    now(),
    now()
  )
  ON CONFLICT (membership_number) DO UPDATE
    SET family_number = EXCLUDED.family_number,
        household_number = EXCLUDED.household_number,
        salutation = EXCLUDED.salutation,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        birthdate = EXCLUDED.birthdate,
        email = EXCLUDED.email,
        phone_mobile = EXCLUDED.phone_mobile,
        zip_city = EXCLUDED.zip_city,
        iban_masked = EXCLUDED.iban_masked,
        bank_name = EXCLUDED.bank_name,
        membership_category_code = EXCLUDED.membership_category_code,
        membership_category = EXCLUDED.membership_category,
        section_number = EXCLUDED.section_number,
        stammsektion = EXCLUDED.stammsektion,
        gastsektion = EXCLUDED.gastsektion,
        is_active = EXCLUDED.is_active,
        source_row_hash = EXCLUDED.source_row_hash,
        imported_at = EXCLUDED.imported_at,
        updated_at = EXCLUDED.updated_at;
END;
$$;

COMMENT ON TABLE public.section_member_imports IS 'Raw import staging table for Mavis export rows.';
COMMENT ON FUNCTION public.import_section_member_row IS 'Idempotent member import that normalizes raw rows into section_members.';

COMMIT;