-- Marketing outreach tables for automated email campaigns
-- 2026-03-23

-- Campaign definitions
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'korean_mfg', 'global_buyer', 'global_mfg', 'newsletter', 'custom'
  )),
  template_type TEXT NOT NULL CHECK (template_type IN (
    'korean_manufacturer_intro', 'global_buyer_intro', 'global_manufacturer_intro',
    'welcome', 'product_intro', 'buyer_matching', 'newsletter', 'custom'
  )),
  subject_override TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'running', 'paused', 'completed', 'failed'
  )),
  target_countries TEXT[] DEFAULT '{}',
  target_tags TEXT[] DEFAULT '{}',
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing contact list
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  country TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('ko', 'en', 'ja', 'zh', 'vi', 'th', 'de', 'fr', 'pt', 'es')),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('manufacturer', 'buyer', 'partner', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_subscribed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email)
);

-- Event log for each email send
CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed'
  )),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS marketing_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start TIMESTAMPTZ NOT NULL,
  send_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_email ON marketing_contacts(email);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_type ON marketing_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_country ON marketing_contacts(country);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_subscribed ON marketing_contacts(is_subscribed) WHERE is_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON marketing_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_status ON marketing_events(status);
CREATE INDEX IF NOT EXISTS idx_marketing_events_sent_at ON marketing_events(sent_at);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_rate_limits_window ON marketing_rate_limits(window_start);

-- RLS policies
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role has full access (edge functions use service_role key)
CREATE POLICY "service_role_marketing_campaigns" ON marketing_campaigns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_marketing_contacts" ON marketing_contacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_marketing_events" ON marketing_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_marketing_rate_limits" ON marketing_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Admin users can read campaigns and events
CREATE POLICY "admin_read_marketing_campaigns" ON marketing_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_read_marketing_events" ON marketing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
