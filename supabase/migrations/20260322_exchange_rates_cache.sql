CREATE TABLE IF NOT EXISTS exchange_rates_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'USD',
  rates jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '6 hours')
);

ALTER TABLE exchange_rates_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON exchange_rates_cache
  FOR ALL USING (true);
