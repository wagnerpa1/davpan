-- Create migration: Setup asynchrounous notification outbox worker in pg_cron
-- Uses Supabase Vault (vault extension) for secure storage of secrets:
--   - 'app_site_url': The base URL of the app (e.g. 'https://davpan.appwrite.network')
--   - 'internal_cron_secret': Authorization token for internal cron worker

-- 1. Enable required extensions if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA net;
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- 2. Safely initialize default secrets in Supabase Vault if they do not exist
DO $$
BEGIN
  -- Initialize app_site_url default secret
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'app_site_url') THEN
    PERFORM vault.create_secret('http://localhost:3000', 'app_site_url', 'Base URL of the application');
  END IF;

  -- Initialize internal_cron_secret default secret
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'internal_cron_secret') THEN
    PERFORM vault.create_secret('3a31a769e0b1e3ae7b22d204104b7846b9e3c6151257383700a083cld38e66cb', 'internal_cron_secret', 'Authorization token for the internal notification outbox cron worker');
  END IF;
END $$;

-- 3. Create the worker trigger function
CREATE OR REPLACE FUNCTION public.trigger_notification_outbox_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  -- Retrieve site URL from Supabase Vault
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'app_site_url';

  -- Fallback to local default if empty
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'http://localhost:3000';
  END IF;

  -- Append the outbox api route endpoint path
  v_url := v_url || '/api/internal/notifications/outbox';

  -- Retrieve cron secret from Supabase Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_cron_secret';

  -- Abort if the secret is not configured
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'Vault secret "internal_cron_secret" is not configured. Outbox trigger skipped.';
    RETURN;
  END IF;

  -- Trigger the asynchronous HTTP POST request using pg_net
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_notification_outbox_worker() TO service_role;

-- 4. Safe conditional unschedule if job already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications-outbox') THEN
    PERFORM cron.unschedule('process-notifications-outbox');
  END IF;
END $$;

-- 5. Schedule the worker in pg_cron (runs every minute)
SELECT cron.schedule(
  'process-notifications-outbox',
  '* * * * *', -- every minute
  $$ SELECT public.trigger_notification_outbox_worker(); $$
);
