-- Escrow reminders: daily at 09:00 UTC (18:00 KST)
-- Sends reminder emails before auto-cancel / auto-confirm deadlines

select cron.schedule(
  'escrow-reminders-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/escrow-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
