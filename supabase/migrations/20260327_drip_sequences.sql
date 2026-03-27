-- Migration: Drip sequences for automated 24/7 marketing pipeline
-- 2026-03-27

-- 1. Drip sequence definitions
CREATE TABLE IF NOT EXISTS drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('korean_mfg', 'global_mfg', 'global_buyer')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Steps within each sequence
CREATE TABLE IF NOT EXISTS drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  delay_days INT NOT NULL DEFAULT 0,
  subject_ko TEXT,
  subject_en TEXT,
  template_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

-- 3. Enrollment tracking
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'unsubscribed', 'paused', 'failed')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(contact_id, sequence_id)
);

-- 4. Marketing automations (referenced by admin.html but missing)
CREATE TABLE IF NOT EXISTS marketing_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('drip', 'scheduled_campaign', 'daily_batch', 'lead_collection')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_active ON drip_enrollments(status, next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_contact ON drip_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_sequence ON drip_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_drip_steps_sequence ON drip_steps(sequence_id, step_number);

-- 6. Enable RLS
ALTER TABLE drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;

-- 7. RLS: service_role full access
CREATE POLICY "service_role_drip_sequences" ON drip_sequences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_drip_steps" ON drip_steps FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_drip_enrollments" ON drip_enrollments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_marketing_automations" ON marketing_automations FOR ALL USING (auth.role() = 'service_role');

-- 8. RLS: admin read access
CREATE POLICY "admin_read_drip_sequences" ON drip_sequences
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_read_drip_steps" ON drip_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_read_drip_enrollments" ON drip_enrollments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_read_marketing_automations" ON marketing_automations
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ─── Seed: 3 Drip Sequences × 4 Steps ───────────────────

-- Korean Manufacturer Drip
INSERT INTO drip_sequences (id, name, audience_type, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'korean_mfg_drip', 'korean_mfg',
   '한국 제조사 대상 4단계 드립: 소개 → HS코드/FTA → 성공사례 → 무료체험')
ON CONFLICT (name) DO NOTHING;

INSERT INTO drip_steps (sequence_id, step_number, delay_days, subject_ko, subject_en, template_key) VALUES
  ('a1000000-0000-0000-0000-000000000001', 0, 0,
   'AI로 수출 서류 자동화 — Whistle AI 무료 체험', NULL, 'korean_mfg_intro'),
  ('a1000000-0000-0000-0000-000000000001', 1, 3,
   'HS코드 자동 분류 & FTA 혜택, 아직 수작업 하세요?', NULL, 'korean_mfg_feature'),
  ('a1000000-0000-0000-0000-000000000001', 2, 7,
   '화장품 제조사 A사, 수출 서류 시간 80% 절감한 방법', NULL, 'korean_mfg_case_study'),
  ('a1000000-0000-0000-0000-000000000001', 3, 14,
   '지금 무료 AI 수출 분석을 받아보세요', NULL, 'korean_mfg_cta')
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- Global Manufacturer Drip
INSERT INTO drip_sequences (id, name, audience_type, description) VALUES
  ('a2000000-0000-0000-0000-000000000002', 'global_mfg_drip', 'global_mfg',
   'Global manufacturer 4-step drip: Intro → AI features → Case study → Free trial CTA')
ON CONFLICT (name) DO NOTHING;

INSERT INTO drip_steps (sequence_id, step_number, delay_days, subject_ko, subject_en, template_key) VALUES
  ('a2000000-0000-0000-0000-000000000002', 0, 0,
   NULL, 'Automate Your Export Documents with AI — Free Trial', 'global_mfg_intro'),
  ('a2000000-0000-0000-0000-000000000002', 1, 3,
   NULL, 'Stop Guessing HS Codes — Let AI Handle It in 60 Seconds', 'global_mfg_feature'),
  ('a2000000-0000-0000-0000-000000000002', 2, 7,
   NULL, 'How Exporters Save 10+ Hours/Week with Whistle AI', 'global_mfg_case_study'),
  ('a2000000-0000-0000-0000-000000000002', 3, 14,
   NULL, 'Your Free AI Export Analysis Is Waiting', 'global_mfg_cta')
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- Global Buyer Drip
INSERT INTO drip_sequences (id, name, audience_type, description) VALUES
  ('a3000000-0000-0000-0000-000000000003', 'global_buyer_drip', 'global_buyer',
   'Global buyer 4-step drip: Intro → Verified suppliers → Escrow safety → Start sourcing CTA')
ON CONFLICT (name) DO NOTHING;

INSERT INTO drip_steps (sequence_id, step_number, delay_days, subject_ko, subject_en, template_key) VALUES
  ('a3000000-0000-0000-0000-000000000003', 0, 0,
   NULL, 'Source Quality Products from Asia — AI-Powered Platform', 'global_buyer_intro'),
  ('a3000000-0000-0000-0000-000000000003', 1, 3,
   NULL, 'Every Supplier Verified — Here''s How We Do It', 'global_buyer_feature'),
  ('a3000000-0000-0000-0000-000000000003', 2, 7,
   NULL, 'Your Money Is Safe — How Escrow Protects Every Transaction', 'global_buyer_case_study'),
  ('a3000000-0000-0000-0000-000000000003', 3, 14,
   NULL, 'Start Sourcing from Asia — Free, No Commitment', 'global_buyer_cta')
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- ─── Seed: Marketing Automations ─────────────────────────

INSERT INTO marketing_automations (name, type, config, is_active) VALUES
  ('Drip Engine — Morning (KST 09:00)', 'drip',
   '{"timezone_group": "asia", "cron": "0 0 * * *"}'::jsonb, true),
  ('Drip Engine — Evening (KST 21:00)', 'drip',
   '{"timezone_group": "americas_europe", "cron": "0 12 * * *"}'::jsonb, true),
  ('Public DB Lead Collection — Weekly', 'lead_collection',
   '{"sources": ["data.go.kr", "openfda"], "cron": "0 3 * * 0"}'::jsonb, true)
ON CONFLICT DO NOTHING;
