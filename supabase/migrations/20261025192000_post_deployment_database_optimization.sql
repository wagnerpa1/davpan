BEGIN;

CREATE INDEX IF NOT EXISTS idx_parent_child_relations_child_id
  ON public.parent_child_relations (child_id);

DROP POLICY IF EXISTS "Parents can view their own child relations"
  ON public.parent_child_relations;

CREATE POLICY "Parents can view their own child relations"
  ON public.parent_child_relations
  AS permissive
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = parent_id);

CREATE OR REPLACE FUNCTION public.normalize_section_membership_category(
  category_code text,
  birthdate date
) RETURNS public.membership_category_type
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  parsed_code integer;
  age_years integer;
BEGIN
  parsed_code := NULLIF(trim(category_code), '')::integer;
  age_years := date_part('year', age(current_date, birthdate))::integer;

  IF parsed_code BETWEEN 1000 AND 1999 THEN
    RETURN 'A';
  ELSIF parsed_code BETWEEN 2000 AND 2999 THEN
    RETURN 'B';
  ELSIF parsed_code BETWEEN 3000 AND 3999 THEN
    RETURN 'C';
  ELSIF parsed_code BETWEEN 4000 AND 4999 THEN
    RETURN 'D';
  ELSIF parsed_code BETWEEN 5000 AND 5999 OR parsed_code BETWEEN 7000 AND 7899 THEN
    RETURN CASE WHEN age_years < 14 THEN 'K' ELSE 'J' END;
  END IF;

  RETURN 'C';
END;
$$;

COMMIT;
