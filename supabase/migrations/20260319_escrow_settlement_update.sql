-- Add columns to payments table for full-capture escrow model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='settled_at') THEN
    ALTER TABLE payments ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='platform_fee') THEN
    ALTER TABLE payments ADD COLUMN platform_fee NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='net_amount') THEN
    ALTER TABLE payments ADD COLUMN net_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='refunded_at') THEN
    ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='refund_reason') THEN
    ALTER TABLE payments ADD COLUMN refund_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stripe_connect_account_id') THEN
    ALTER TABLE users ADD COLUMN stripe_connect_account_id TEXT;
  END IF;
END$$;

-- Update auto-settle cron job to use x-cron-secret header
-- First unschedule existing job if it exists
SELECT cron.unschedule('auto-settle-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-settle-daily');

-- Re-create with CRON_SECRET auth header
SELECT cron.schedule(
  'auto-settle-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-settle',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
