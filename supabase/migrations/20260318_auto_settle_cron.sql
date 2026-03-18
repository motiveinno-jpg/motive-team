-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-settle to run daily at midnight UTC
-- This calls the auto-settle Edge Function via pg_net
SELECT cron.schedule(
  'auto-settle-daily',
  '0 0 * * *',  -- Every day at 00:00 UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-settle',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add columns to matchings table for payment tracking (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='sample_payment_status') THEN
    ALTER TABLE matchings ADD COLUMN sample_payment_status TEXT DEFAULT 'unpaid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='sample_paid_at') THEN
    ALTER TABLE matchings ADD COLUMN sample_paid_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='deposit_payment_status') THEN
    ALTER TABLE matchings ADD COLUMN deposit_payment_status TEXT DEFAULT 'unpaid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='deposit_paid_at') THEN
    ALTER TABLE matchings ADD COLUMN deposit_paid_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='full_paid_at') THEN
    ALTER TABLE matchings ADD COLUMN full_paid_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='settlement_status') THEN
    ALTER TABLE matchings ADD COLUMN settlement_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='settled_at') THEN
    ALTER TABLE matchings ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='delivered_at') THEN
    ALTER TABLE matchings ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchings' AND column_name='buyer_confirmed_at') THEN
    ALTER TABLE matchings ADD COLUMN buyer_confirmed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_type') THEN
    ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'sample';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='auto_settled') THEN
    ALTER TABLE payments ADD COLUMN auto_settled BOOLEAN DEFAULT FALSE;
  END IF;
END$$;
