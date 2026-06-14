-- Enable pg_cron extension (requires Supabase Pro or pg_cron enabled in project settings)
-- Run this in the Supabase SQL Editor after enabling pg_cron in your project

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule poll-consensus to run every 30 seconds
-- Note: pg_cron minimum interval is 1 minute. For 30s, we schedule twice per minute.
SELECT cron.schedule(
  'poll-consensus-1',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/poll-consensus',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);

-- To verify the cron job:
-- SELECT * FROM cron.job;

-- To remove if needed:
-- SELECT cron.unschedule('poll-consensus-1');
