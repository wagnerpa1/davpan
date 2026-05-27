-- Fix deployed notification outbox cron function to use the correct pg_net API.

CREATE OR REPLACE FUNCTION public.trigger_notification_outbox_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
    RAISE WARNING 'Vault secret "internal_cron_secret" is not configured. Outbox trigger skipped.';
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