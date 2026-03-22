-- ============================================================
-- Whistle AI Global Localization Engine
-- Country-specific export process configuration
-- ============================================================

-- 1. country_profiles — Master country data
CREATE TABLE IF NOT EXISTS country_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text UNIQUE NOT NULL,
  country_name_en text NOT NULL,
  country_name_local text,
  flag_emoji text,
  region text,
  language_primary text NOT NULL DEFAULT 'en',
  languages_supported text[] DEFAULT '{}',
  currency_code text NOT NULL DEFAULT 'USD',
  stripe_available boolean DEFAULT true,
  readiness_score int DEFAULT 1 CHECK (readiness_score BETWEEN 1 AND 10),
  tier int DEFAULT 4 CHECK (tier BETWEEN 1 AND 4),
  is_active boolean DEFAULT false,
  manufacturing_sme_count text,
  key_export_sectors text[],
  customs_authority_name text,
  customs_authority_url text,
  export_doc_standard text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. country_certifications — Required certifications per country
CREATE TABLE IF NOT EXISTS country_certifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text REFERENCES country_profiles(country_code),
  cert_name text NOT NULL,
  cert_full_name text,
  cert_authority text,
  cert_url text,
  categories text[],
  is_mandatory boolean DEFAULT true,
  typical_duration_days int,
  typical_cost_usd numeric,
  description_en text,
  description_local text,
  created_at timestamptz DEFAULT now()
);

-- 3. country_ftas — FTA network per country
CREATE TABLE IF NOT EXISTS country_ftas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text REFERENCES country_profiles(country_code),
  fta_name text NOT NULL,
  fta_full_name text,
  partner_countries text[],
  tariff_reduction_avg numeric,
  key_benefits text,
  effective_date date,
  status text DEFAULT 'active',
  rules_of_origin_summary text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE country_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_ftas ENABLE ROW LEVEL SECURITY;

-- Public read access (country data is non-sensitive)
CREATE POLICY "Public read" ON country_profiles FOR SELECT USING (true);
CREATE POLICY "Public read" ON country_certifications FOR SELECT USING (true);
CREATE POLICY "Public read" ON country_ftas FOR SELECT USING (true);

-- Service role full access for admin operations
CREATE POLICY "Service write" ON country_profiles FOR ALL USING (true);
CREATE POLICY "Service write" ON country_certifications FOR ALL USING (true);
CREATE POLICY "Service write" ON country_ftas FOR ALL USING (true);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_cp_code ON country_profiles(country_code);
CREATE INDEX idx_cp_active ON country_profiles(is_active);
CREATE INDEX idx_cp_tier ON country_profiles(tier);
CREATE INDEX idx_cp_region ON country_profiles(region);
CREATE INDEX idx_cc_country ON country_certifications(country_code);
CREATE INDEX idx_cc_mandatory ON country_certifications(country_code, is_mandatory);
CREATE INDEX idx_cf_country ON country_ftas(country_code);
CREATE INDEX idx_cf_status ON country_ftas(country_code, status);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_country_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_country_profiles_updated_at
  BEFORE UPDATE ON country_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_country_profiles_updated_at();
