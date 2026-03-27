-- Migration: Schedule marketing drip cron jobs
-- Runs twice daily to send drip emails at optimal times per timezone
-- 2026-03-27

-- 1. Morning run: 00:00 UTC = 09:00 KST — targets Korean manufacturers
SELECT cron.schedule(
  'marketing-drip-morning',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/marketing-drip',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"timezone_group": "asia"}'::jsonb
  );
  $$
);

-- 2. Evening run: 12:00 UTC = 21:00 KST = 08:00 EST — targets US/EU buyers & manufacturers
SELECT cron.schedule(
  'marketing-drip-evening',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/marketing-drip',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"timezone_group": "americas_europe"}'::jsonb
  );
  $$
);

-- 3. Weekly lead collection: Sunday 03:00 UTC = 12:00 KST
SELECT cron.schedule(
  'collect-public-leads-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/collect-public-leads',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"sources": ["data_go_kr", "openfda"]}'::jsonb
  );
  $$
);
