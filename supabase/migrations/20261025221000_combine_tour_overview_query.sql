BEGIN;

CREATE OR REPLACE FUNCTION public.get_tour_overview(
  p_category uuid DEFAULT NULL,
  p_difficulty public.tour_difficulty DEFAULT NULL,
  p_group uuid DEFAULT NULL,
  p_guide uuid DEFAULT NULL,
  p_visibility_date date DEFAULT NULL,
  p_apply_visibility_limit boolean DEFAULT false,
  p_sort_by text DEFAULT 'date_asc'
)
RETURNS TABLE (
  id uuid,
  title text,
  category uuid,
  status public.tour_status,
  start_date date,
  end_date date,
  target_area text,
  max_participants integer,
  difficulty public.tour_difficulty,
  "group" uuid,
  tour_guides jsonb,
  tour_groups jsonb,
  tour_categorys jsonb,
  confirmed_participants_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    t.id,
    t.title,
    t.category,
    t.status,
    t.start_date,
    t.end_date,
    t.target_area,
    t.max_participants,
    t.difficulty,
    t."group",
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', tg.user_id,
            'profiles',
              CASE
                WHEN p.id IS NULL THEN NULL
                ELSE jsonb_build_object('full_name', p.full_name)
              END
          )
          ORDER BY tg.user_id
        )
        FROM public.tour_guides tg
        LEFT JOIN public.profiles p ON p.id = tg.user_id
        WHERE tg.tour_id = t.id
      ),
      '[]'::jsonb
    ) AS tour_guides,
    CASE
      WHEN g.id IS NULL THEN NULL
      ELSE jsonb_build_object('group_name', g.group_name)
    END AS tour_groups,
    CASE
      WHEN c.id IS NULL THEN NULL
      ELSE jsonb_build_object('category', c.category)
    END AS tour_categorys,
    (
      SELECT COUNT(*)::integer
      FROM public.tour_participants tp
      WHERE tp.tour_id = t.id
        AND tp.status = 'confirmed'::public.participant_status
    ) AS confirmed_participants_count
  FROM public.tours t
  LEFT JOIN public.tour_groups g ON g.id = t."group"
  LEFT JOIN public.tour_categorys c ON c.id = t.category
  WHERE auth.uid() IS NOT NULL
    AND t.status <> 'completed'::public.tour_status
    AND (p_category IS NULL OR t.category = p_category)
    AND (p_difficulty IS NULL OR t.difficulty = p_difficulty)
    AND (p_group IS NULL OR t."group" = p_group)
    AND (
      p_guide IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.tour_guides filter_tg
        WHERE filter_tg.tour_id = t.id
          AND filter_tg.user_id = p_guide
      )
    )
    AND (
      NOT p_apply_visibility_limit
      OR p_visibility_date IS NULL
      OR t.start_date < p_visibility_date
    )
  ORDER BY
    CASE WHEN p_sort_by = 'date_desc' THEN t.start_date END DESC,
    CASE WHEN p_sort_by <> 'date_desc' THEN t.start_date END ASC;
$function$;

REVOKE ALL ON FUNCTION public.get_tour_overview(
  uuid,
  public.tour_difficulty,
  uuid,
  uuid,
  date,
  boolean,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_tour_overview(
  uuid,
  public.tour_difficulty,
  uuid,
  uuid,
  date,
  boolean,
  text
) TO authenticated;

COMMIT;
