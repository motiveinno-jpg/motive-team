-- Comtrade data cache table for UN Comtrade trade statistics
CREATE TABLE IF NOT EXISTS comtrade_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_comtrade_cache_key ON comtrade_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_comtrade_cache_expires ON comtrade_cache (expires_at);

-- RLS: allow service_role full access, no direct user access needed
ALTER TABLE comtrade_cache ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Edge Functions use service_role)
-- No user-facing policies needed since this is only accessed via Edge Function
