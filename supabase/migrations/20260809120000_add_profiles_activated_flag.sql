BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activated boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET activated = COALESCE(is_activated, false)
WHERE activated IS DISTINCT FROM COALESCE(is_activated, false);

COMMENT ON COLUMN public.profiles.activated IS 'Whether the user has completed the activation review and should no longer see the review screen.';

COMMIT;
