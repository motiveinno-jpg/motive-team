-- Migration: Schedule escrow-auto-release cron (every 6 hours)
-- and ensure escrow_auto_log table + RLS policies exist.

-- 1. Create escrow_auto_log table (if not exists)
CREATE TABLE IF NOT EXISTS escrow_auto_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on escrow_auto_log
ALTER TABLE escrow_auto_log ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy: service_role can insert (used by Edge Functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'escrow_auto_log' AND policyname = 'escrow_auto_log_service_insert'
  ) THEN
    CREATE POLICY escrow_auto_log_service_insert
      ON escrow_auto_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END$$;

-- 4. RLS policy: authenticated users can read logs for their own orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'escrow_auto_log' AND policyname = 'escrow_auto_log_user_read'
  ) THEN
    CREATE POLICY escrow_auto_log_user_read
      ON escrow_auto_log
      FOR SELECT
      TO authenticated
      USING (
        order_id IN (
          SELECT id FROM orders
          WHERE buyer_id = auth.uid() OR user_id = auth.uid()
        )
      );
  END IF;
END$$;

-- 5. Unschedule existing hourly cron job (if it exists)
SELECT cron.unschedule('escrow-auto-release-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escrow-auto-release-hourly');

-- 6. Schedule escrow-auto-release every 6 hours
-- Handles: auto-cancel (3 biz days), auto-confirm delivery (14 days),
-- and Stripe auth expiry prevention (6 days)
SELECT cron.schedule(
  'escrow-auto-release-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/escrow-auto-release',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
