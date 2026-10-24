CREATE OR REPLACE FUNCTION public.book_resource_standalone_atomic(
  p_resource_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_start_date > p_end_date OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'invalid booking input' USING ERRCODE = '22000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'guide', 'materialwart')
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Serialize all bookings for this resource before checking availability.
  PERFORM 1 FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resource not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.resource_bookings
    WHERE resource_id = p_resource_id
      AND status <> 'released'
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  ) THEN
    RAISE EXCEPTION 'resource already booked in this time range' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.resource_bookings (
    resource_id, tour_id, start_date, end_date, reason, status, created_by
  ) VALUES (
    p_resource_id, NULL, p_start_date, p_end_date, btrim(p_reason), 'booked', auth.uid()
  ) RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('booking_id', v_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.book_resource_standalone_atomic(uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_resource_standalone_atomic(uuid, timestamptz, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.import_section_member_rows(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row record;
  v_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT * FROM jsonb_to_recordset(p_rows) AS rows(
      membership_number varchar, family_number varchar, household_number varchar,
      salutation varchar, first_name varchar, last_name varchar, birthdate date,
      email varchar, phone_mobile varchar, zip_city varchar, iban varchar,
      bank_name varchar, membership_category_code varchar, section_number varchar,
      stammsektion varchar, gastsektion varchar, is_active boolean, source_row_hash text
    )
  LOOP
    PERFORM public.import_section_member_row(
      v_row.membership_number, v_row.family_number, v_row.household_number,
      v_row.salutation, v_row.first_name, v_row.last_name, v_row.birthdate,
      v_row.email, v_row.phone_mobile, v_row.zip_city, v_row.iban,
      v_row.bank_name, v_row.membership_category_code, v_row.section_number,
      v_row.stammsektion, v_row.gastsektion, v_row.is_active, v_row.source_row_hash
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_section_member_rows(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_section_member_rows(jsonb) TO authenticated, service_role;

-- The single-row primitive handles sensitive membership data and must never
-- be callable by a browser role directly.
REVOKE ALL ON FUNCTION public.import_section_member_row(
  varchar, varchar, varchar, varchar, varchar, varchar, date, varchar,
  varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
  boolean, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_section_member_row(
  varchar, varchar, varchar, varchar, varchar, varchar, date, varchar,
  varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
  boolean, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_material_type_atomic(p_type_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'materialwart')
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.material_pricing WHERE material_type_id = p_type_id;
  DELETE FROM public.material_inventory WHERE material_type_id = p_type_id;
  DELETE FROM public.material_types WHERE id = p_type_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_material_type_atomic(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_material_type_atomic(uuid) TO authenticated;
