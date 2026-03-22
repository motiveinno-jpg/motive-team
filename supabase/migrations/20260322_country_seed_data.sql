-- ============================================================
-- Whistle AI Global Localization Engine — Seed Data
-- 31 countries + certifications + FTAs
-- ============================================================

-- ============================================================
-- TIER 1 — Readiness 8-10, is_active = true
-- ============================================================

INSERT INTO country_profiles (country_code, country_name_en, country_name_local, flag_emoji, region, language_primary, languages_supported, currency_code, stripe_available, readiness_score, tier, is_active, manufacturing_sme_count, key_export_sectors, customs_authority_name, customs_authority_url, export_doc_standard, notes) VALUES
('KR', 'South Korea', '한국', '🇰🇷', 'East Asia', 'ko', ARRAY['ko','en'], 'KRW', true, 10, 1, true, '7.4M', ARRAY['Electronics','Automotive','Semiconductors','Petrochemicals','Shipbuilding','Steel','Cosmetics','Food'], 'Korea Customs Service', 'https://www.customs.go.kr', 'Korea Customs Service format', 'Home market. Full localization complete. 21 FTAs in force.'),
('US', 'United States', 'United States', '🇺🇸', 'North America', 'en', ARRAY['en','es'], 'USD', true, 9, 1, true, '250K+', ARRAY['Aerospace','Pharmaceuticals','Tech Hardware','Agriculture','Automotive','Medical Devices','Chemicals'], 'U.S. Customs and Border Protection', 'https://www.cbp.gov', 'CBP ACE format', 'Largest import market. Complex regulatory landscape (FDA, FCC, EPA, USDA).'),
('GB', 'United Kingdom', 'United Kingdom', '🇬🇧', 'Europe', 'en', ARRAY['en'], 'GBP', true, 9, 1, true, '140K+', ARRAY['Pharmaceuticals','Aerospace','Automotive','Financial Services','Food & Beverage'], 'HM Revenue & Customs', 'https://www.gov.uk/government/organisations/hm-revenue-customs', 'HMRC CDS format', 'Post-Brexit: UKCA marking replaces CE. New trade agreements in progress.'),
('CA', 'Canada', 'Canada', '🇨🇦', 'North America', 'en', ARRAY['en','fr'], 'CAD', true, 8, 1, true, '50K+', ARRAY['Energy','Mining','Automotive','Aerospace','Agriculture','Forestry'], 'Canada Border Services Agency', 'https://www.cbsa-asfc.gc.ca', 'CBSA CERS format', 'USMCA member. Bilingual requirements (EN/FR) for consumer products.'),
('AU', 'Australia', 'Australia', '🇦🇺', 'Oceania', 'en', ARRAY['en'], 'AUD', true, 8, 1, true, '48K+', ARRAY['Mining','Agriculture','Food Processing','Medical Devices','Wine'], 'Australian Border Force', 'https://www.abf.gov.au', 'ABF ICS format', 'Strong Korea-Australia FTA (KAFTA). Strict biosecurity controls.'),
('SG', 'Singapore', 'Singapore', '🇸🇬', 'Southeast Asia', 'en', ARRAY['en','zh','ms','ta'], 'SGD', true, 8, 1, true, '20K+', ARRAY['Electronics','Petrochemicals','Pharmaceuticals','Precision Engineering','Logistics'], 'Singapore Customs', 'https://www.customs.gov.sg', 'TradeNet format', 'ASEAN hub. Zero tariff on most goods. Efficient customs clearance.');

-- ============================================================
-- TIER 2 — Readiness 5-7, is_active = false
-- ============================================================

INSERT INTO country_profiles (country_code, country_name_en, country_name_local, flag_emoji, region, language_primary, languages_supported, currency_code, stripe_available, readiness_score, tier, is_active, manufacturing_sme_count, key_export_sectors, customs_authority_name, customs_authority_url, export_doc_standard, notes) VALUES
('JP', 'Japan', '日本', '🇯🇵', 'East Asia', 'ja', ARRAY['ja','en'], 'JPY', true, 7, 2, false, '380K+', ARRAY['Automotive','Electronics','Machinery','Chemicals','Robotics','Precision Instruments'], 'Japan Customs', 'https://www.customs.go.jp', 'NACCS format', 'Strict JIS/PSE standards. RCEP and CPTPP member. Complex non-tariff barriers.'),
('DE', 'Germany', 'Deutschland', '🇩🇪', 'Europe', 'de', ARRAY['de','en'], 'EUR', true, 7, 2, false, '200K+', ARRAY['Automotive','Machinery','Chemicals','Pharmaceuticals','Electronics','Renewable Energy'], 'German Customs (Zoll)', 'https://www.zoll.de', 'EU ATLAS format', 'EU gateway. CE marking mandatory. REACH/RoHS compliance required.'),
('VN', 'Vietnam', 'Việt Nam', '🇻🇳', 'Southeast Asia', 'vi', ARRAY['vi','en'], 'VND', false, 6, 2, false, '500K+', ARRAY['Textiles','Electronics Assembly','Footwear','Seafood','Furniture','Coffee'], 'Vietnam Customs', 'https://www.customs.gov.vn', 'VNACCS format', 'Fast-growing export economy. CPTPP, RCEP, EVFTA member. Korean investment hub.'),
('TH', 'Thailand', 'ไทย', '🇹🇭', 'Southeast Asia', 'th', ARRAY['th','en'], 'THB', true, 6, 2, false, '300K+', ARRAY['Automotive','Electronics','Food Processing','Petrochemicals','Rubber','Tourism Equipment'], 'Thai Customs Department', 'https://www.customs.go.th', 'Thai NSW format', 'ASEAN manufacturing base. Korea-ASEAN FTA benefits.'),
('MY', 'Malaysia', 'Malaysia', '🇲🇾', 'Southeast Asia', 'ms', ARRAY['ms','en','zh'], 'MYR', true, 6, 2, false, '50K+', ARRAY['Electronics','Palm Oil','Rubber','Petrochemicals','Medical Devices','Islamic Finance'], 'Royal Malaysian Customs', 'https://www.customs.gov.my', 'MyGTrade format', 'Halal certification hub. RCEP and CPTPP member.'),
('ID', 'Indonesia', 'Indonesia', '🇮🇩', 'Southeast Asia', 'id', ARRAY['id','en'], 'IDR', false, 5, 2, false, '4M+', ARRAY['Palm Oil','Textiles','Automotive','Electronics','Mining','Furniture'], 'Directorate General of Customs', 'https://www.beacukai.go.id', 'INSW format', 'Largest ASEAN economy. Complex import licensing (SNI, Halal). RCEP member.'),
('IN', 'India', 'भारत', '🇮🇳', 'South Asia', 'hi', ARRAY['hi','en','ta','te','bn'], 'INR', true, 5, 2, false, '63M+', ARRAY['Textiles','Pharmaceuticals','IT Services','Gems & Jewelry','Chemicals','Agriculture','Automotive'], 'Central Board of Indirect Taxes and Customs', 'https://www.cbic.gov.in', 'ICEGATE format', 'Massive market. BIS mandatory for many products. India-Korea CEPA in force.'),
('TW', 'Taiwan', '台灣', '🇹🇼', 'East Asia', 'zh', ARRAY['zh','en'], 'TWD', false, 6, 2, false, '150K+', ARRAY['Semiconductors','Electronics','Machinery','Petrochemicals','ICT','Bicycles'], 'Customs Administration', 'https://web.customs.gov.tw', 'CPT Single Window format', 'Key semiconductor supply chain. BSMI certification required for electronics.'),
('PH', 'Philippines', 'Pilipinas', '🇵🇭', 'Southeast Asia', 'fil', ARRAY['fil','en'], 'PHP', false, 5, 2, false, '1M+', ARRAY['Electronics Assembly','BPO','Agriculture','Garments','Furniture','Food Processing'], 'Bureau of Customs', 'https://customs.gov.ph', 'PH TradeNet format', 'English-speaking market. Korea-ASEAN FTA. Growing manufacturing base.');

-- ============================================================
-- TIER 3 — Readiness 4-5, is_active = false
-- ============================================================

INSERT INTO country_profiles (country_code, country_name_en, country_name_local, flag_emoji, region, language_primary, languages_supported, currency_code, stripe_available, readiness_score, tier, is_active, manufacturing_sme_count, key_export_sectors, customs_authority_name, customs_authority_url, export_doc_standard, notes) VALUES
('BR', 'Brazil', 'Brasil', '🇧🇷', 'Latin America', 'pt', ARRAY['pt'], 'BRL', true, 4, 3, false, '6.4M+', ARRAY['Agriculture','Mining','Automotive','Aerospace','Food Processing','Textiles'], 'Receita Federal', 'https://www.gov.br/receitafederal', 'Siscomex format', 'ANVISA and INMETRO certifications mandatory. Complex tax system (ICMS, IPI, PIS/COFINS).'),
('MX', 'Mexico', 'México', '🇲🇽', 'Latin America', 'es', ARRAY['es','en'], 'MXN', true, 4, 3, false, '4.2M+', ARRAY['Automotive','Electronics','Aerospace','Agriculture','Mining','Oil & Gas'], 'SAT Aduanas', 'https://www.sat.gob.mx', 'VUCEM format', 'USMCA nearshoring boom. NOM certification required for many products.'),
('TR', 'Turkey', 'Türkiye', '🇹🇷', 'Middle East', 'tr', ARRAY['tr','en'], 'TRY', true, 5, 3, false, '3.5M+', ARRAY['Textiles','Automotive','Electronics','Steel','Agriculture','Construction Materials'], 'Turkish Customs', 'https://www.ticaret.gov.tr', 'BILGE format', 'EU Customs Union member. Bridge between Europe and Asia. Korea-Turkey FTA in force.'),
('PL', 'Poland', 'Polska', '🇵🇱', 'Europe', 'pl', ARRAY['pl','en'], 'PLN', true, 5, 3, false, '2.1M+', ARRAY['Automotive','Electronics','Furniture','Food Processing','Machinery','IT'], 'National Revenue Administration', 'https://www.gov.pl/web/kas', 'EU ATLAS format', 'EU member. CE marking. Fast-growing manufacturing hub in Central Europe.'),
('CZ', 'Czech Republic', 'Česká republika', '🇨🇿', 'Europe', 'cs', ARRAY['cs','en'], 'CZK', true, 5, 3, false, '1.1M+', ARRAY['Automotive','Machinery','Electronics','Glass','Ceramics','Aerospace'], 'Czech Customs Administration', 'https://www.celnisprava.cz', 'EU ATLAS format', 'EU member. Strong automotive sector (Skoda). CE marking required.'),
('AE', 'UAE', 'الإمارات', '🇦🇪', 'Middle East', 'ar', ARRAY['ar','en'], 'AED', true, 4, 3, false, '350K+', ARRAY['Oil & Gas','Logistics','Construction','Finance','Tourism','Re-export'], 'Federal Customs Authority', 'https://www.fca.gov.ae', 'Dubai Trade format', 'Major re-export hub. ESMA certification. Halal mandatory for food. Korea-GCC FTA negotiations.'),
('SA', 'Saudi Arabia', 'المملكة العربية السعودية', '🇸🇦', 'Middle East', 'ar', ARRAY['ar','en'], 'SAR', true, 4, 3, false, '1M+', ARRAY['Oil & Gas','Petrochemicals','Mining','Construction','Agriculture'], 'Saudi Customs (ZATCA)', 'https://zatca.gov.sa', 'Fasah format', 'Vision 2030 diversification. SASO/SABER certification. Halal mandatory. Korea-GCC FTA negotiations.'),
('ZA', 'South Africa', 'South Africa', '🇿🇦', 'Africa', 'en', ARRAY['en','af','zu','xh'], 'ZAR', true, 4, 3, false, '2.3M+', ARRAY['Mining','Automotive','Agriculture','Wine','Chemicals','Manufacturing'], 'South African Revenue Service', 'https://www.sars.gov.za', 'SARS Customs format', 'Gateway to Sub-Saharan Africa. NRCS compliance. Korea-SACU PTA in place.');

-- ============================================================
-- TIER 4 — Readiness 2-3, is_active = false
-- ============================================================

INSERT INTO country_profiles (country_code, country_name_en, country_name_local, flag_emoji, region, language_primary, languages_supported, currency_code, stripe_available, readiness_score, tier, is_active, manufacturing_sme_count, key_export_sectors, customs_authority_name, customs_authority_url, export_doc_standard, notes) VALUES
('BD', 'Bangladesh', 'বাংলাদেশ', '🇧🇩', 'South Asia', 'bn', ARRAY['bn','en'], 'BDT', false, 3, 4, false, '7.8M+', ARRAY['Textiles','Garments','Jute','Leather','Pharmaceuticals','Shrimp'], 'National Board of Revenue', 'https://nbr.gov.bd', 'ASYCUDA World format', 'RMG export powerhouse. BSTI certification. LDC trade preferences.'),
('PK', 'Pakistan', 'پاکستان', '🇵🇰', 'South Asia', 'ur', ARRAY['ur','en'], 'PKR', false, 3, 4, false, '3.2M+', ARRAY['Textiles','Rice','Leather','Surgical Instruments','Sports Goods','Carpets'], 'Pakistan Customs', 'https://www.fbr.gov.pk', 'WeBOC format', 'Strong textile exports. PSQCA certification. Korea-Pakistan trade growing.'),
('LK', 'Sri Lanka', 'ශ්‍රී ලංකා', '🇱🇰', 'South Asia', 'si', ARRAY['si','ta','en'], 'LKR', false, 2, 4, false, '1M+', ARRAY['Textiles','Tea','Rubber','Gems','Coconut Products','Spices'], 'Sri Lanka Customs', 'https://www.customs.gov.lk', 'ASYCUDA World format', 'Niche exports. SLSI certification. Recovering from economic crisis.'),
('EG', 'Egypt', 'مصر', '🇪🇬', 'Africa', 'ar', ARRAY['ar','en'], 'EGP', false, 3, 4, false, '2.5M+', ARRAY['Textiles','Petrochemicals','Agriculture','Construction Materials','Pharmaceuticals'], 'Egyptian Customs Authority', 'https://www.customs.gov.eg', 'NAFEZA format', 'Suez Canal advantage. EOS certification. ACI system for imports.'),
('NG', 'Nigeria', 'Nigeria', '🇳🇬', 'Africa', 'en', ARRAY['en','ha','yo','ig'], 'NGN', false, 2, 4, false, '37M+', ARRAY['Oil & Gas','Agriculture','Textiles','Cement','Food Processing'], 'Nigeria Customs Service', 'https://customs.gov.ng', 'NICIS II format', 'Largest African economy. SON/SONCAP certification. AfCFTA member.'),
('CO', 'Colombia', 'Colombia', '🇨🇴', 'Latin America', 'es', ARRAY['es'], 'COP', true, 3, 4, false, '2.5M+', ARRAY['Coffee','Oil','Cut Flowers','Mining','Agriculture','Textiles'], 'DIAN', 'https://www.dian.gov.co', 'MUISCA format', 'Pacific Alliance member. INVIMA for health products. Korea-Colombia FTA in force.'),
('CL', 'Chile', 'Chile', '🇨🇱', 'Latin America', 'es', ARRAY['es'], 'CLP', true, 3, 4, false, '1M+', ARRAY['Mining','Agriculture','Wine','Salmon','Forestry','Lithium'], 'National Customs Service', 'https://www.aduana.cl', 'SICEX format', 'Most open economy in LatAm. 30+ FTAs. Korea-Chile FTA (first Asian FTA for Korea). CPTPP member.'),
('AR', 'Argentina', 'Argentina', '🇦🇷', 'Latin America', 'es', ARRAY['es'], 'ARS', false, 2, 4, false, '650K+', ARRAY['Agriculture','Food Processing','Automotive','Mining','Lithium','Wine'], 'AFIP Aduanas', 'https://www.afip.gob.ar', 'MALVINA format', 'Mercosur member. Complex import controls. IRAM certification. Currency volatility.');


-- ============================================================
-- CERTIFICATIONS — Tier 1 Countries
-- ============================================================

-- KR (South Korea) certifications — certifications NEEDED to export FROM Korea
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('KR', 'KC', 'Korea Certification', 'Korean Agency for Technology and Standards (KATS)', 'https://www.kats.go.kr', ARRAY['Electronics','Appliances','Safety Products'], true, 30, 3000, 'Mandatory safety certification for electrical/electronic products sold in Korea.'),
('KR', 'KS', 'Korean Industrial Standards', 'Korean Standards Association', 'https://www.ksa.or.kr', ARRAY['Industrial','Manufacturing','Materials'], false, 60, 2000, 'Voluntary quality standard. Recognized mark of quality for Korean products.'),
('KR', 'HACCP', 'Hazard Analysis Critical Control Points', 'Ministry of Food and Drug Safety', 'https://www.mfds.go.kr', ARRAY['Food','Beverages','Food Processing'], true, 90, 5000, 'Mandatory for food manufacturers. Required for food exports.'),
('KR', 'GMP', 'Good Manufacturing Practice', 'Ministry of Food and Drug Safety', 'https://www.mfds.go.kr', ARRAY['Cosmetics','Pharmaceuticals','Medical Devices'], true, 120, 8000, 'Required for cosmetics and pharma export. ISO 22716 aligned.'),
('KR', 'Halal', 'Halal Certification', 'Korea Muslim Federation (KMF)', 'https://www.koreahalal.org', ARRAY['Food','Cosmetics','Pharmaceuticals'], false, 45, 2500, 'Required for export to Muslim-majority countries. KMF recognized by JAKIM, MUI.'),
('KR', 'Organic', 'Organic Certification', 'National Agricultural Products Quality Management Service', 'https://www.naqs.go.kr', ARRAY['Agriculture','Food','Cosmetics'], false, 90, 3000, 'Required for organic labeling. Mutual recognition with EU, US organic standards.');

-- US certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('US', 'FDA', 'Food and Drug Administration Approval', 'U.S. Food and Drug Administration', 'https://www.fda.gov', ARRAY['Food','Pharmaceuticals','Medical Devices','Cosmetics'], true, 180, 15000, 'Required for food, drugs, cosmetics, and medical devices. 510(k) for medical devices.'),
('US', 'FCC', 'Federal Communications Commission Certification', 'Federal Communications Commission', 'https://www.fcc.gov', ARRAY['Electronics','Telecommunications','Wireless Devices'], true, 45, 5000, 'Required for all electronic devices that emit RF energy.'),
('US', 'UL', 'Underwriters Laboratories Certification', 'UL LLC', 'https://www.ul.com', ARRAY['Electronics','Appliances','Industrial Equipment','Fire Safety'], false, 60, 8000, 'De facto required by retailers and insurers. Safety certification for electrical products.'),
('US', 'EPA', 'Environmental Protection Agency Registration', 'U.S. Environmental Protection Agency', 'https://www.epa.gov', ARRAY['Chemicals','Pesticides','Automotive','Industrial'], true, 120, 10000, 'Required for chemicals, pesticides, automotive emissions compliance.'),
('US', 'USDA', 'USDA Organic/Grade Certification', 'U.S. Department of Agriculture', 'https://www.usda.gov', ARRAY['Agriculture','Food','Organic Products'], true, 90, 5000, 'Required for agricultural imports, organic labeling, and meat/poultry.'),
('US', 'DOT', 'Department of Transportation Certification', 'U.S. Department of Transportation', 'https://www.transportation.gov', ARRAY['Automotive','Tires','Hazardous Materials'], true, 90, 7000, 'FMVSS compliance for vehicles and components. DOT marking for tires.'),
('US', 'CPSC', 'Consumer Product Safety Commission Compliance', 'Consumer Product Safety Commission', 'https://www.cpsc.gov', ARRAY['Toys','Children Products','Furniture','Textiles'], true, 60, 4000, 'Mandatory for consumer products. CPSIA for children products.');

-- GB certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('GB', 'UKCA', 'UK Conformity Assessed', 'Office for Product Safety and Standards', 'https://www.gov.uk/guidance/using-the-ukca-marking', ARRAY['Electronics','Machinery','Medical Devices','Construction','PPE'], true, 60, 6000, 'Post-Brexit replacement for CE marking. Required for products sold in Great Britain.'),
('GB', 'CE', 'Conformité Européenne (Legacy)', 'EU Notified Bodies', 'https://ec.europa.eu/growth/single-market/ce-marking_en', ARRAY['Electronics','Machinery','Medical Devices'], false, 60, 5000, 'Still accepted for some product categories during transition period.'),
('GB', 'BSI', 'British Standards Institution Kitemark', 'BSI Group', 'https://www.bsigroup.com', ARRAY['Fire Safety','PPE','Management Systems','Construction'], false, 90, 8000, 'Voluntary quality mark. Widely recognized and trusted by UK consumers.');

-- CA certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('CA', 'CSA', 'Canadian Standards Association', 'CSA Group', 'https://www.csagroup.org', ARRAY['Electronics','Appliances','Industrial Equipment','Gas Equipment'], true, 60, 6000, 'Mandatory safety certification for electrical and gas products.'),
('CA', 'CFIA', 'Canadian Food Inspection Agency Approval', 'CFIA', 'https://www.inspection.canada.ca', ARRAY['Food','Agriculture','Animal Products','Plants'], true, 90, 5000, 'Required for food imports. Bilingual labeling (EN/FR) mandatory.'),
('CA', 'HC', 'Health Canada Approval', 'Health Canada', 'https://www.canada.ca/en/health-canada.html', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics','NHP'], true, 180, 12000, 'Required for drugs, medical devices, natural health products.');

-- AU certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('AU', 'TGA', 'Therapeutic Goods Administration', 'Department of Health', 'https://www.tga.gov.au', ARRAY['Pharmaceuticals','Medical Devices','Biologicals'], true, 180, 15000, 'Required for therapeutic goods including medical devices and medicines.'),
('AU', 'ACMA', 'Australian Communications and Media Authority', 'ACMA', 'https://www.acma.gov.au', ARRAY['Electronics','Telecommunications','Radio Equipment'], true, 45, 4000, 'RCM compliance mark for electrical and telecom equipment.'),
('AU', 'DAFF', 'Department of Agriculture Biosecurity', 'Department of Agriculture', 'https://www.agriculture.gov.au', ARRAY['Food','Agriculture','Timber','Animal Products'], true, 30, 2000, 'Strict biosecurity requirements. Fumigation/treatment often required.');

-- SG certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('SG', 'SFA', 'Singapore Food Agency License', 'Singapore Food Agency', 'https://www.sfa.gov.sg', ARRAY['Food','Beverages','Food Processing'], true, 30, 2000, 'Required for food imports. Facility registration and product approval.'),
('SG', 'HSA', 'Health Sciences Authority', 'HSA', 'https://www.hsa.gov.sg', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics','Health Supplements'], true, 120, 8000, 'Required for health products. Aligned with international standards.'),
('SG', 'SAFETY', 'Safety Mark', 'Enterprise Singapore', 'https://www.enterprisesg.gov.sg', ARRAY['Electronics','Appliances','Gas Equipment'], true, 30, 3000, 'Mandatory for 33 categories of controlled goods.');

-- ============================================================
-- CERTIFICATIONS — Tier 2 Countries
-- ============================================================

-- JP certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('JP', 'PSE', 'Product Safety Electrical Appliance', 'Ministry of Economy, Trade and Industry (METI)', 'https://www.meti.go.jp', ARRAY['Electronics','Appliances','Electrical Equipment'], true, 60, 6000, 'Mandatory for electrical products. Diamond PSE for high-risk, Circle PSE for others.'),
('JP', 'JIS', 'Japanese Industrial Standards', 'Japanese Standards Association', 'https://www.jsa.or.jp', ARRAY['Industrial','Manufacturing','Materials','Construction'], false, 90, 5000, 'Voluntary but widely expected. Factory audit required.'),
('JP', 'JFRL', 'Japan Food Research Laboratories', 'JFRL', 'https://www.jfrl.or.jp', ARRAY['Food','Beverages','Food Additives'], true, 45, 3000, 'Food safety testing and certification for imports.'),
('JP', 'MHLW', 'Ministry of Health, Labour and Welfare Approval', 'MHLW', 'https://www.mhlw.go.jp', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics','Food Additives'], true, 360, 20000, 'PMDA review for pharmaceuticals. Shonin approval for medical devices.'),
('JP', 'TELEC', 'Telecom Engineering Center', 'TELEC', 'https://www.telec.or.jp', ARRAY['Telecommunications','Wireless Devices','Radio Equipment'], true, 30, 4000, 'Required for wireless/radio equipment under Radio Law.');

-- DE (Germany/EU) certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('DE', 'CE', 'Conformité Européenne', 'EU Notified Bodies', 'https://ec.europa.eu/growth/single-market/ce-marking_en', ARRAY['Electronics','Machinery','Medical Devices','Toys','Construction','PPE'], true, 60, 5000, 'Mandatory for most products sold in EU. Self-declaration or third-party assessment.'),
('DE', 'REACH', 'Registration, Evaluation, Authorization of Chemicals', 'European Chemicals Agency (ECHA)', 'https://echa.europa.eu', ARRAY['Chemicals','Textiles','Electronics','Cosmetics','Plastics'], true, 180, 15000, 'Chemical substance registration. Applies to articles containing >0.1% SVHC.'),
('DE', 'RoHS', 'Restriction of Hazardous Substances', 'EU Commission', 'https://ec.europa.eu/environment/topics/waste-and-recycling/rohs-directive_en', ARRAY['Electronics','Electrical Equipment'], true, 30, 2000, 'Restricts lead, mercury, cadmium, etc. in electrical/electronic equipment.'),
('DE', 'GS', 'Geprüfte Sicherheit (Tested Safety)', 'TÜV, VDE, and other bodies', 'https://www.tuv.com', ARRAY['Electronics','Appliances','Machinery','Tools'], false, 60, 6000, 'Voluntary but highly valued in Germany. TÜV/GS mark increases consumer trust.'),
('DE', 'BfR', 'Federal Institute for Risk Assessment', 'BfR', 'https://www.bfr.bund.de', ARRAY['Food Contact Materials','Cosmetics','Consumer Products'], true, 60, 4000, 'German-specific requirements for food contact materials.'),
('DE', 'WEEE', 'Waste Electrical and Electronic Equipment', 'stiftung EAR', 'https://www.stiftung-ear.de', ARRAY['Electronics','Electrical Equipment','Batteries'], true, 30, 1500, 'Producer registration for e-waste recycling. Mandatory for electronics importers.');

-- VN certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('VN', 'QCVN', 'National Technical Regulation', 'Ministry of Science and Technology', 'https://www.most.gov.vn', ARRAY['Electronics','Food','Chemicals','Construction Materials'], true, 45, 3000, 'Mandatory technical regulations. CR mark for conformity.'),
('VN', 'TCVN', 'Vietnamese National Standards', 'STAMEQ', 'https://www.stameq.gov.vn', ARRAY['Industrial','Manufacturing','Materials'], false, 30, 2000, 'Voluntary standards. Recommended for market acceptance.'),
('VN', 'VFA', 'Vietnam Food Administration', 'Ministry of Health', 'https://vfa.gov.vn', ARRAY['Food','Beverages','Food Supplements','Cosmetics'], true, 60, 2500, 'Product registration for food and cosmetics imports.');

-- TH certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('TH', 'TISI', 'Thai Industrial Standards Institute', 'TISI', 'https://www.tisi.go.th', ARRAY['Electronics','Industrial','Construction','Food'], true, 60, 3000, 'TIS mark mandatory for regulated products. Voluntary for others.'),
('TH', 'FDA-TH', 'Thai FDA', 'Thai Food and Drug Administration', 'https://www.fda.moph.go.th', ARRAY['Food','Pharmaceuticals','Cosmetics','Medical Devices'], true, 90, 4000, 'Product registration and import licensing for health products.'),
('TH', 'NBTC', 'National Broadcasting and Telecommunications Commission', 'NBTC', 'https://www.nbtc.go.th', ARRAY['Telecommunications','Wireless Devices'], true, 45, 3000, 'Type approval for telecom equipment.');

-- MY certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('MY', 'SIRIM', 'Standards and Industrial Research Institute of Malaysia', 'SIRIM QAS', 'https://www.sirim.my', ARRAY['Electronics','Appliances','Industrial Equipment'], true, 60, 4000, 'Product certification and testing. MS mark for Malaysian standards.'),
('MY', 'JAKIM', 'Jabatan Kemajuan Islam Malaysia', 'JAKIM', 'https://www.halal.gov.my', ARRAY['Food','Beverages','Cosmetics','Pharmaceuticals'], true, 90, 3000, 'Gold standard Halal certification. Recognized worldwide.'),
('MY', 'NPRA', 'National Pharmaceutical Regulatory Agency', 'Ministry of Health', 'https://www.npra.gov.my', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics','Health Supplements'], true, 180, 8000, 'Product registration for pharmaceutical and health products.');

-- ID certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('ID', 'SNI', 'Standar Nasional Indonesia', 'Badan Standardisasi Nasional', 'https://www.bsn.go.id', ARRAY['Electronics','Food','Textiles','Steel','Toys'], true, 90, 5000, 'Mandatory national standard for regulated products. Factory audit required.'),
('ID', 'MUI Halal', 'Majelis Ulama Indonesia Halal', 'BPJPH/MUI', 'https://www.halal.go.id', ARRAY['Food','Beverages','Cosmetics','Pharmaceuticals'], true, 120, 4000, 'Mandatory Halal certification under 2019 JPH Law. All food products must be certified.'),
('ID', 'BPOM', 'Badan Pengawas Obat dan Makanan', 'BPOM', 'https://www.pom.go.id', ARRAY['Food','Pharmaceuticals','Cosmetics','Traditional Medicine'], true, 90, 3000, 'Registration for food, drugs, and cosmetics. ML number for imports.');

-- IN certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('IN', 'BIS', 'Bureau of Indian Standards', 'BIS', 'https://www.bis.gov.in', ARRAY['Electronics','Steel','Cement','Chemicals','IT Products','Toys'], true, 120, 5000, 'ISI mark mandatory for 370+ products. Factory inspection required.'),
('IN', 'FSSAI', 'Food Safety and Standards Authority of India', 'FSSAI', 'https://www.fssai.gov.in', ARRAY['Food','Beverages','Food Additives','Food Supplements'], true, 60, 2000, 'FSSAI license mandatory for food importers. Product approval for new products.'),
('IN', 'CDSCO', 'Central Drugs Standard Control Organisation', 'CDSCO', 'https://cdsco.gov.in', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics'], true, 180, 10000, 'Drug registration and medical device approval. Import license required.'),
('IN', 'WPC', 'Wireless Planning and Coordination Wing', 'Ministry of Communications', 'https://www.wpc.gov.in', ARRAY['Telecommunications','Wireless Devices','Radio Equipment'], true, 60, 3000, 'ETA (Equipment Type Approval) for wireless devices.'),
('IN', 'PESO', 'Petroleum and Explosives Safety Organisation', 'PESO', 'https://peso.gov.in', ARRAY['Explosives','Petroleum','Gas Cylinders','Pressure Vessels'], true, 90, 4000, 'Required for petroleum products and pressurized equipment.');

-- TW certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('TW', 'BSMI', 'Bureau of Standards, Metrology and Inspection', 'BSMI', 'https://www.bsmi.gov.tw', ARRAY['Electronics','Appliances','Toys','IT Equipment','Medical Devices'], true, 45, 4000, 'Mandatory inspection mark for regulated products. Type approval or batch inspection.'),
('TW', 'NCC', 'National Communications Commission', 'NCC', 'https://www.ncc.gov.tw', ARRAY['Telecommunications','Wireless Devices','Radio Equipment'], true, 30, 3000, 'Type approval for telecom and RF equipment.'),
('TW', 'TFDA', 'Taiwan Food and Drug Administration', 'TFDA', 'https://www.fda.gov.tw', ARRAY['Food','Pharmaceuticals','Medical Devices','Cosmetics'], true, 120, 6000, 'Product registration for food, drugs, and medical devices.');

-- PH certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('PH', 'BPS', 'Bureau of Philippine Standards', 'DTI-BPS', 'https://www.bps.dti.gov.ph', ARRAY['Electronics','Construction','Industrial','Consumer Products'], true, 60, 3000, 'Philippine Standard (PS) mark and Import Commodity Clearance (ICC).'),
('PH', 'FDA-PH', 'Philippine FDA', 'Food and Drug Administration', 'https://www.fda.gov.ph', ARRAY['Food','Pharmaceuticals','Medical Devices','Cosmetics','Household Products'], true, 90, 4000, 'Certificate of Product Registration (CPR) for health products.'),
('PH', 'NTC', 'National Telecommunications Commission', 'NTC', 'https://www.ntc.gov.ph', ARRAY['Telecommunications','Wireless Devices'], true, 30, 2000, 'Type approval for telecom equipment.');

-- ============================================================
-- CERTIFICATIONS — Key Tier 3 Countries
-- ============================================================

-- BR certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('BR', 'ANVISA', 'Agência Nacional de Vigilância Sanitária', 'ANVISA', 'https://www.gov.br/anvisa', ARRAY['Pharmaceuticals','Medical Devices','Cosmetics','Food','Sanitizers'], true, 180, 12000, 'Health product registration. GMP certification required. In-country representative mandatory.'),
('BR', 'INMETRO', 'Instituto Nacional de Metrologia', 'INMETRO', 'https://www.gov.br/inmetro', ARRAY['Electronics','Appliances','Toys','Automotive Parts','PPE','Textiles'], true, 120, 8000, 'Mandatory certification for regulated products. In-country testing often required.'),
('BR', 'ANATEL', 'Agência Nacional de Telecomunicações', 'ANATEL', 'https://www.gov.br/anatel', ARRAY['Telecommunications','Wireless Devices','Radio Equipment'], true, 90, 5000, 'Homologation for telecom products. In-country testing required.');

-- AE certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('AE', 'ESMA', 'Emirates Authority for Standardization and Metrology', 'ESMA', 'https://www.esma.gov.ae', ARRAY['Electronics','Building Materials','Toys','Food','Automotive'], true, 60, 4000, 'Mandatory quality mark. ECAS scheme for regulated products.'),
('AE', 'Halal-UAE', 'UAE Halal Certification', 'ESMA / Emirates Authority', 'https://www.esma.gov.ae', ARRAY['Food','Cosmetics','Pharmaceuticals'], true, 45, 3000, 'Mandatory for all food imports. Aligned with GSO/OIC standards.'),
('AE', 'TDRA', 'Telecommunications and Digital Government Regulatory Authority', 'TDRA', 'https://www.tdra.gov.ae', ARRAY['Telecommunications','Wireless Devices'], true, 30, 3000, 'Type approval for telecom equipment in UAE.');

-- SA certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('SA', 'SASO', 'Saudi Standards, Metrology and Quality Organization', 'SASO', 'https://www.saso.gov.sa', ARRAY['Electronics','Appliances','Toys','Building Materials','Automotive'], true, 60, 5000, 'Mandatory quality mark via SABER platform. CoC required for all imports.'),
('SA', 'SFDA', 'Saudi Food and Drug Authority', 'SFDA', 'https://www.sfda.gov.sa', ARRAY['Food','Pharmaceuticals','Medical Devices','Cosmetics'], true, 120, 8000, 'Product registration for food and health products.'),
('SA', 'Halal-SA', 'Saudi Halal Certification', 'SFDA / SASO', 'https://www.sfda.gov.sa', ARRAY['Food','Cosmetics','Pharmaceuticals'], true, 45, 3000, 'Mandatory Halal certification. Strict requirements aligned with GSO.');

-- TR certifications
INSERT INTO country_certifications (country_code, cert_name, cert_full_name, cert_authority, cert_url, categories, is_mandatory, typical_duration_days, typical_cost_usd, description_en) VALUES
('TR', 'TSE', 'Turkish Standards Institution', 'TSE', 'https://www.tse.org.tr', ARRAY['Electronics','Food','Construction','Industrial'], true, 60, 4000, 'TSE mark. CE marking also accepted due to EU Customs Union.'),
('TR', 'CE-TR', 'CE Marking (Turkey)', 'Ministry of Trade', 'https://www.ticaret.gov.tr', ARRAY['Electronics','Machinery','Medical Devices','Toys'], true, 60, 5000, 'CE marking required under EU Customs Union alignment.');


-- ============================================================
-- FTAs — Tier 1 Countries
-- ============================================================

-- KR FTAs (South Korea has one of the most extensive FTA networks)
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('KR', 'KORUS', 'Korea-US Free Trade Agreement', ARRAY['US'], 85, 'Eliminates tariffs on 95% of goods within 5 years. Zero tariff on electronics, machinery.', '2012-03-15', 'active', 'Substantial transformation + regional value content (35-55%). Product-specific rules for auto/textiles.'),
('KR', 'Korea-EU', 'Korea-EU Free Trade Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ','SE','AT','IE','PT','DK','FI','GR','HU','RO','BG','HR','SK','SI','LT','LV','EE','CY','LU','MT'], 95, 'Virtually all tariffs eliminated. Strong IP protection. Services liberalization.', '2011-07-01', 'active', 'Wholly obtained or sufficient processing. Product-specific value-added thresholds.'),
('KR', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','AU','NZ','ID','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 70, 'Cumulative rules of origin across 15 countries. Simplified customs procedures.', '2022-02-01', 'active', 'Regional value content 40% or change in tariff classification. Cumulation across all RCEP parties.'),
('KR', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','SG','VN','MY','MX','CL','PE','BN'], 80, 'High-standard FTA. Access to Americas and Asia-Pacific markets.', '2025-12-01', 'active', 'Strict rules of origin. Yarn-forward for textiles. Regional value content varies by product.'),
('KR', 'Korea-ASEAN', 'Korea-ASEAN FTA', ARRAY['ID','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 75, 'Progressive tariff elimination for ASEAN markets. Services and investment chapters.', '2007-06-01', 'active', 'Regional value content 40% + change in tariff classification (dual requirement for sensitive items).'),
('KR', 'Korea-China', 'Korea-China FTA', ARRAY['CN'], 60, 'Covers 85% of products over 20 years. Services opening in follow-up negotiations.', '2015-12-20', 'active', 'Product-specific rules. Regional value content or change in tariff heading.'),
('KR', 'Korea-Australia', 'Korea-Australia FTA (KAFTA)', ARRAY['AU'], 90, 'Zero tariff on 99.8% of Australian goods. Korean auto/electronics tariffs eliminated.', '2014-12-12', 'active', 'Regional value content 45-55%. Product-specific rules for agriculture.'),
('KR', 'Korea-Canada', 'Korea-Canada FTA', ARRAY['CA'], 85, 'Eliminates tariffs on 98.2% of tariff lines. Strong auto sector benefits.', '2015-01-01', 'active', 'Regional value content 35-50%. Change in tariff classification for most goods.'),
('KR', 'Korea-UK', 'Korea-UK FTA', ARRAY['GB'], 90, 'Continuity agreement post-Brexit. Same terms as Korea-EU.', '2021-01-01', 'active', 'Same rules of origin as Korea-EU FTA.'),
('KR', 'Korea-EFTA', 'Korea-EFTA FTA', ARRAY['CH','NO','IS','LI'], 80, 'Covers Switzerland, Norway, Iceland, Liechtenstein. Strong pharma/chemicals benefits.', '2006-09-01', 'active', 'Wholly obtained or substantial transformation with product-specific rules.'),
('KR', 'Korea-Turkey', 'Korea-Turkey FTA', ARRAY['TR'], 75, 'Covers goods trade. Framework for services and investment.', '2013-05-01', 'active', 'Change in tariff classification. Regional value content for select items.'),
('KR', 'Korea-Colombia', 'Korea-Colombia FTA', ARRAY['CO'], 70, 'First FTA for Korea in Latin America South. Agriculture and industrial goods.', '2016-07-15', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('KR', 'Korea-Chile', 'Korea-Chile FTA', ARRAY['CL'], 85, 'Korea first FTA ever. Model for subsequent agreements. Zero tariff on most goods.', '2004-04-01', 'active', 'Change in tariff heading or regional value content 45%.'),
('KR', 'Korea-Peru', 'Korea-Peru FTA', ARRAY['PE'], 70, 'Covers goods, services, and investment. Mining and agriculture focus.', '2011-08-01', 'active', 'Regional value content 40%. Change in tariff classification.'),
('KR', 'Korea-NZ', 'Korea-New Zealand FTA', ARRAY['NZ'], 85, 'Zero tariff on 97% of goods. Agriculture phase-out over 15 years.', '2015-12-20', 'active', 'Regional value content 45%. Product-specific rules for dairy/agriculture.'),
('KR', 'Korea-Vietnam', 'Korea-Vietnam FTA', ARRAY['VN'], 80, 'Bilateral FTA supplementing Korea-ASEAN. Deeper tariff cuts.', '2015-12-20', 'active', 'Regional value content 40%. Change in tariff classification. Bilateral cumulation.'),
('KR', 'Korea-Singapore', 'Korea-Singapore FTA', ARRAY['SG'], 95, 'Virtually all tariffs eliminated. E-commerce and digital trade chapters.', '2006-03-02', 'active', 'Regional value content 45% or change in tariff heading.'),
('KR', 'Korea-India', 'Korea-India CEPA', ARRAY['IN'], 60, 'Comprehensive Economic Partnership. Covers goods, services, investment.', '2010-01-01', 'active', 'Regional value content 35%. Change in tariff classification at 4-digit level.'),
('KR', 'Korea-Israel', 'Korea-Israel FTA', ARRAY['IL'], 75, 'Tech and innovation focus. Eliminates tariffs on 95% of goods.', '2022-12-01', 'active', 'Regional value content 40-50%. Product-specific rules for agriculture.'),
('KR', 'Korea-CAM', 'Korea-Central America FTA', ARRAY['PA','CR','SV','HN','NI'], 70, 'Access to Central American markets. Agriculture and manufacturing.', '2019-10-01', 'active', 'Regional value content 40%. Change in tariff heading.'),
('KR', 'Korea-Indonesia', 'Korea-Indonesia CEPA', ARRAY['ID'], 65, 'Bilateral CEPA supplementing Korea-ASEAN. Services and investment provisions.', '2023-01-01', 'active', 'Regional value content 40%. Product-specific rules.');

-- US FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('US', 'USMCA', 'United States-Mexico-Canada Agreement', ARRAY['CA','MX'], 90, 'Replaces NAFTA. 75% auto content rule. Digital trade provisions. Labor provisions.', '2020-07-01', 'active', 'Regional value content 75% for autos. Strict labor value content requirements.'),
('US', 'KORUS', 'Korea-US Free Trade Agreement', ARRAY['KR'], 85, 'Zero tariff on 95% of Korean goods. Strong IP protection.', '2012-03-15', 'active', 'Substantial transformation + regional value content 35-55%.'),
('US', 'US-Australia', 'US-Australia FTA', ARRAY['AU'], 90, 'Virtually all tariffs eliminated. Strong investment protections.', '2005-01-01', 'active', 'Regional value content 35-55%. Product-specific rules.'),
('US', 'US-Singapore', 'US-Singapore FTA', ARRAY['SG'], 95, 'Comprehensive FTA. Zero tariffs on virtually all goods.', '2004-01-01', 'active', 'Change in tariff classification. Regional value content varies.'),
('US', 'US-Israel', 'US-Israel FTA', ARRAY['IL'], 90, 'One of first US FTAs. Zero tariffs on most goods.', '1985-09-01', 'active', 'Substantial transformation in either country. 35% domestic content.'),
('US', 'US-Chile', 'US-Chile FTA', ARRAY['CL'], 85, 'Comprehensive FTA. Strong environmental/labor chapters.', '2004-01-01', 'active', 'Change in tariff classification. Regional value content 35%.'),
('US', 'US-Colombia', 'US-Colombia TPA', ARRAY['CO'], 80, 'Trade Promotion Agreement. Broad tariff elimination.', '2012-05-15', 'active', 'Regional value content 35%. Product-specific rules.'),
('US', 'CAFTA-DR', 'Central America-Dominican Republic FTA', ARRAY['CR','SV','GT','HN','NI','DO'], 80, 'Access to Central American markets. Textile/apparel benefits with yarn-forward.', '2006-03-01', 'active', 'Yarn-forward for textiles. Regional value content varies.');

-- GB FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('GB', 'UK-EU TCA', 'UK-EU Trade and Cooperation Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ','SE','AT','IE','PT','DK','FI'], 95, 'Zero tariffs and quotas on goods meeting rules of origin. Post-Brexit framework.', '2021-01-01', 'active', 'Product-specific rules. Bilateral cumulation with EU only.'),
('GB', 'UK-Korea', 'UK-Korea FTA', ARRAY['KR'], 90, 'Continuity of Korea-EU FTA benefits post-Brexit.', '2021-01-01', 'active', 'Same rules of origin as Korea-EU FTA.'),
('GB', 'UK-Japan', 'UK-Japan CEPA', ARRAY['JP'], 85, 'Comprehensive EPA. Goes beyond EU-Japan EPA in digital trade.', '2021-01-01', 'active', 'Product-specific rules. Regional value content for key sectors.'),
('GB', 'UK-Australia', 'UK-Australia FTA', ARRAY['AU'], 90, 'First post-Brexit FTA negotiated from scratch. Eliminates virtually all tariffs.', '2023-05-31', 'active', 'Product-specific rules. Regional value content varies.'),
('GB', 'UK-NZ', 'UK-New Zealand FTA', ARRAY['NZ'], 85, 'Comprehensive FTA. Progressive tariff elimination.', '2023-05-31', 'active', 'Product-specific rules. Regional value content varies.'),
('GB', 'CPTPP-UK', 'CPTPP (UK Accession)', ARRAY['JP','AU','CA','NZ','SG','VN','MY','MX','CL','PE','BN'], 80, 'UK accession to CPTPP. Access to Indo-Pacific markets.', '2024-12-15', 'active', 'CPTPP standard rules. Regional value content. Cumulation across members.');

-- CA FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('CA', 'USMCA', 'United States-Mexico-Canada Agreement', ARRAY['US','MX'], 90, 'Trilateral agreement. 75% auto content. Digital trade. Labor provisions.', '2020-07-01', 'active', 'Regional value content 75% for autos. Product-specific rules.'),
('CA', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','NZ','SG','VN','MY','MX','CL','PE','BN','KR','GB'], 80, 'Access to Asia-Pacific markets. High-standard provisions.', '2018-12-30', 'active', 'Regional value content varies. Cumulation across members.'),
('CA', 'CETA', 'Canada-EU Comprehensive Economic and Trade Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ','SE','AT','IE','PT','DK','FI'], 90, 'Eliminates 98% of tariffs with EU. Investment and services provisions.', '2017-09-21', 'active', 'Product-specific rules. Regional value content. Bilateral cumulation.'),
('CA', 'Canada-Korea', 'Canada-Korea FTA', ARRAY['KR'], 85, 'Strong auto and agriculture benefits. Services liberalization.', '2015-01-01', 'active', 'Regional value content 35-50%. Change in tariff classification.');

-- AU FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('AU', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','NZ','ID','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 70, 'Cumulative rules of origin. Simplified customs across Asia-Pacific.', '2022-01-01', 'active', 'Regional value content 40%. Cumulation across all RCEP members.'),
('AU', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','CA','NZ','SG','VN','MY','MX','CL','PE','BN','KR','GB'], 80, 'High-standard FTA. Broad market access.', '2018-12-30', 'active', 'Regional value content varies. Cumulation across members.'),
('AU', 'KAFTA', 'Korea-Australia FTA', ARRAY['KR'], 90, 'Strong Korean auto/electronics tariff elimination. Agriculture access.', '2014-12-12', 'active', 'Regional value content 45-55%. Product-specific rules.'),
('AU', 'ChAFTA', 'China-Australia FTA', ARRAY['CN'], 75, 'Tariff elimination on most goods. Services chapter.', '2015-12-20', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('AU', 'JAEPA', 'Japan-Australia EPA', ARRAY['JP'], 85, 'Strong tariff cuts. Investment provisions.', '2015-01-15', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('AU', 'AUSFTA', 'Australia-US FTA', ARRAY['US'], 90, 'Virtually all tariffs eliminated.', '2005-01-01', 'active', 'Regional value content 35-55%. Product-specific rules.');

-- SG FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('SG', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','ID','TH','VN','MY','PH','BN','KH','LA','MM'], 70, 'Regional cumulation. Simplified customs.', '2022-01-01', 'active', 'Regional value content 40%. Cumulation across RCEP members.'),
('SG', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','VN','MY','MX','CL','PE','BN','KR','GB'], 80, 'High-standard FTA. Digital trade chapter.', '2018-12-30', 'active', 'Regional value content varies. Cumulation across members.'),
('SG', 'Korea-SG', 'Korea-Singapore FTA', ARRAY['KR'], 95, 'Virtually zero tariffs. Digital trade provisions.', '2006-03-02', 'active', 'Regional value content 45% or change in tariff heading.'),
('SG', 'USSFTA', 'US-Singapore FTA', ARRAY['US'], 95, 'Zero tariffs virtually all goods. Strong IP protection.', '2004-01-01', 'active', 'Change in tariff classification. Regional value content varies.'),
('SG', 'EUSFTA', 'EU-Singapore FTA', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ'], 90, 'Comprehensive FTA. Investment protection agreement.', '2019-11-21', 'active', 'Product-specific rules. Regional value content varies.');

-- ============================================================
-- FTAs — Tier 2 Countries
-- ============================================================

-- JP FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('JP', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['CN','KR','AU','NZ','ID','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 70, 'First FTA linking Japan, China, Korea. Cumulative rules of origin.', '2022-01-01', 'active', 'Regional value content 40%. Cumulation across all RCEP members.'),
('JP', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['AU','CA','NZ','SG','VN','MY','MX','CL','PE','BN','KR','GB'], 80, 'High-standard FTA. Market access across Pacific.', '2018-12-30', 'active', 'Regional value content varies. Strict rules for auto sector.'),
('JP', 'Japan-EU EPA', 'Japan-EU Economic Partnership Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ','SE','AT','IE','PT','DK','FI'], 90, 'Eliminates most tariffs. Covers 1/3 of world GDP.', '2019-02-01', 'active', 'Product-specific rules. Regional value content varies.'),
('JP', 'Japan-UK CEPA', 'Japan-UK Comprehensive Economic Partnership', ARRAY['GB'], 85, 'Post-Brexit continuity. Enhanced digital trade provisions.', '2021-01-01', 'active', 'Product-specific rules. Regional value content.'),
('JP', 'JAEPA', 'Japan-Australia EPA', ARRAY['AU'], 85, 'Strong tariff elimination. Energy and resources focus.', '2015-01-15', 'active', 'Regional value content 40-50%. Product-specific rules.');

-- DE FTAs (via EU)
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('DE', 'EU-Korea', 'EU-Korea FTA', ARRAY['KR'], 95, 'Virtually all tariffs eliminated. Auto sector benefits.', '2011-07-01', 'active', 'Wholly obtained or sufficient processing. Product-specific thresholds.'),
('DE', 'EU-Japan EPA', 'EU-Japan EPA', ARRAY['JP'], 90, 'Eliminates most tariffs. Covers 1/3 of world GDP.', '2019-02-01', 'active', 'Product-specific rules. Regional value content varies.'),
('DE', 'EU-Canada CETA', 'EU-Canada CETA', ARRAY['CA'], 90, 'Eliminates 98% of tariffs. Investment and services.', '2017-09-21', 'active', 'Product-specific rules. Bilateral cumulation.'),
('DE', 'EU-Singapore', 'EU-Singapore FTA', ARRAY['SG'], 90, 'Gateway to ASEAN. Comprehensive coverage.', '2019-11-21', 'active', 'Product-specific rules. Regional value content varies.'),
('DE', 'EU-Vietnam', 'EU-Vietnam FTA (EVFTA)', ARRAY['VN'], 85, 'Progressive tariff elimination over 10 years. Strong development provisions.', '2020-08-01', 'active', 'Product-specific rules. Bilateral cumulation.'),
('DE', 'EU-UK TCA', 'EU-UK Trade and Cooperation Agreement', ARRAY['GB'], 95, 'Zero tariffs on goods meeting rules of origin.', '2021-01-01', 'active', 'Product-specific rules. Bilateral cumulation.');

-- VN FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('VN', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','SG','MY','MX','CL','PE','BN','KR','GB'], 80, 'Access to developed markets. Tariff elimination on 95%+ of goods.', '2019-01-14', 'active', 'Regional value content varies. Yarn-forward for textiles.'),
('VN', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','ID','TH','MY','PH','SG','BN','KH','LA','MM'], 70, 'Regional cumulation. Simplified customs with Asia-Pacific.', '2022-01-01', 'active', 'Regional value content 40%. Cumulation across RCEP members.'),
('VN', 'EVFTA', 'EU-Vietnam FTA', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ','SE','AT','IE','PT','DK','FI'], 85, 'EU eliminates 99% of tariffs. Vietnam eliminates 65% immediately, rest over 10 years.', '2020-08-01', 'active', 'Product-specific rules. Bilateral cumulation with EU.'),
('VN', 'Vietnam-Korea', 'Vietnam-Korea FTA', ARRAY['KR'], 80, 'Deeper bilateral cuts beyond Korea-ASEAN FTA. Electronics/textile benefits.', '2015-12-20', 'active', 'Regional value content 40%. Change in tariff classification. Bilateral cumulation.'),
('VN', 'ASEAN-China', 'ASEAN-China FTA (ACFTA)', ARRAY['CN'], 70, 'Zero tariff on 90%+ of goods between ASEAN and China.', '2010-01-01', 'active', 'Regional value content 40%. Change in tariff classification.'),
('VN', 'UK-Vietnam', 'UK-Vietnam FTA', ARRAY['GB'], 80, 'Continuity of EVFTA benefits post-Brexit.', '2021-01-01', 'active', 'Same rules as EVFTA adapted bilaterally.');

-- IN FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('IN', 'India-Korea CEPA', 'India-Korea Comprehensive Economic Partnership Agreement', ARRAY['KR'], 60, 'Covers goods, services, investment. Tariff reduction on 85% of goods over 10 years.', '2010-01-01', 'active', 'Regional value content 35%. Change in tariff classification at 4-digit level.'),
('IN', 'India-ASEAN', 'India-ASEAN FTA', ARRAY['ID','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 50, 'Tariff reduction on 80% of goods. Services and investment in separate agreements.', '2010-01-01', 'active', 'Regional value content 35%. Product-specific rules.'),
('IN', 'India-Japan CEPA', 'India-Japan CEPA', ARRAY['JP'], 55, 'Covers 90% of bilateral trade. Auto and pharma focus.', '2011-08-01', 'active', 'Regional value content 35%. Change in tariff classification.'),
('IN', 'India-Singapore CECA', 'India-Singapore Comprehensive Economic Cooperation Agreement', ARRAY['SG'], 60, 'Comprehensive agreement. Zero tariff on most goods from Singapore.', '2005-08-01', 'active', 'Regional value content 40%. Product-specific rules.'),
('IN', 'India-UAE CEPA', 'India-UAE Comprehensive Economic Partnership', ARRAY['AE'], 65, 'Covers 80% of goods. Strong trade and investment links.', '2022-05-01', 'active', 'Regional value content 40%. Product-specific rules.'),
('IN', 'India-Australia ECTA', 'India-Australia Economic Cooperation and Trade Agreement', ARRAY['AU'], 60, 'Tariff elimination on 85% of Australian goods immediately.', '2022-12-29', 'active', 'Regional value content 35-45%. Product-specific rules.');

-- TW FTAs (limited due to political status)
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('TW', 'ECFA', 'Economic Cooperation Framework Agreement (China-Taiwan)', ARRAY['CN'], 40, 'Early Harvest list with tariff reduction on ~800 items. Politically sensitive.', '2010-09-12', 'active', 'Product-specific rules. Limited coverage.'),
('TW', 'Taiwan-NZ', 'Agreement between NZ and Separate Customs Territory of Taiwan', ARRAY['NZ'], 75, 'Comprehensive agreement. Covers goods, services, investment.', '2013-12-01', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('TW', 'Taiwan-SG', 'ASTEP (Agreement between Singapore and Taiwan)', ARRAY['SG'], 80, 'Economic partnership. Covers customs cooperation and trade facilitation.', '2014-04-19', 'active', 'Regional value content varies.');

-- ID FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('ID', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','TH','VN','MY','PH','SG','BN','KH','LA','MM'], 70, 'Cumulative rules of origin. Simplified customs.', '2023-01-02', 'active', 'Regional value content 40%. Cumulation across RCEP members.'),
('ID', 'Korea-Indonesia CEPA', 'Korea-Indonesia CEPA', ARRAY['KR'], 65, 'Bilateral CEPA. Deeper cuts than Korea-ASEAN. Services and investment.', '2023-01-01', 'active', 'Regional value content 40%. Product-specific rules.'),
('ID', 'IA-CEPA', 'Indonesia-Australia CEPA', ARRAY['AU'], 70, 'Comprehensive agreement. Education, investment chapters.', '2020-07-05', 'active', 'Regional value content 40%. Product-specific rules.'),
('ID', 'ASEAN-China', 'ASEAN-China FTA', ARRAY['CN'], 70, 'Zero tariff on 90%+ of goods.', '2010-01-01', 'active', 'Regional value content 40%. Change in tariff classification.');

-- TH FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('TH', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','ID','VN','MY','PH','SG','BN','KH','LA','MM'], 70, 'Cumulative rules. Simplified customs.', '2022-01-01', 'active', 'Regional value content 40%. Cumulation across members.'),
('TH', 'ASEAN-China', 'ASEAN-China FTA', ARRAY['CN'], 70, 'Zero tariff on 90%+ of goods.', '2010-01-01', 'active', 'Regional value content 40%. Change in tariff classification.'),
('TH', 'Thailand-Australia', 'Thailand-Australia FTA (TAFTA)', ARRAY['AU'], 80, 'Comprehensive FTA. Strong auto sector benefits.', '2005-01-01', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('TH', 'Thailand-Japan', 'Japan-Thailand EPA', ARRAY['JP'], 75, 'Strong auto and electronics benefits.', '2007-11-01', 'active', 'Regional value content 40%. Product-specific rules.');

-- MY FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('MY', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','ID','TH','VN','PH','SG','BN','KH','LA','MM'], 70, 'Cumulative rules. Simplified customs.', '2022-03-18', 'active', 'Regional value content 40%. Cumulation across members.'),
('MY', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','SG','VN','MX','CL','PE','BN','KR','GB'], 80, 'High-standard FTA. Digital trade provisions.', '2022-11-29', 'active', 'Regional value content varies. Cumulation across members.'),
('MY', 'ASEAN-China', 'ASEAN-China FTA', ARRAY['CN'], 70, 'Zero tariff on 90%+ of goods.', '2010-01-01', 'active', 'Regional value content 40%. Change in tariff classification.'),
('MY', 'Malaysia-Australia', 'Malaysia-Australia FTA (MAFTA)', ARRAY['AU'], 80, 'Comprehensive agreement. Strong agriculture/mining benefits.', '2013-01-01', 'active', 'Regional value content 40%. Product-specific rules.');

-- PH FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('PH', 'RCEP', 'Regional Comprehensive Economic Partnership', ARRAY['JP','CN','KR','AU','NZ','ID','TH','VN','MY','SG','BN','KH','LA','MM'], 70, 'Philippines ratified RCEP in 2023. Cumulative rules of origin.', '2023-06-02', 'active', 'Regional value content 40%. Cumulation across members.'),
('PH', 'ASEAN-China', 'ASEAN-China FTA', ARRAY['CN'], 70, 'Zero tariff on 90%+ of goods.', '2010-01-01', 'active', 'Regional value content 40%. Change in tariff classification.'),
('PH', 'PH-Japan EPA', 'Philippines-Japan EPA', ARRAY['JP'], 75, 'Bilateral EPA. Services, investment, movement of natural persons.', '2008-12-11', 'active', 'Regional value content 40%. Product-specific rules.');

-- ============================================================
-- FTAs — Key Tier 3 Countries
-- ============================================================

-- BR FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('BR', 'Mercosur', 'Southern Common Market', ARRAY['AR','UY','PY'], 85, 'Common external tariff. Free movement of goods within bloc.', '1991-03-26', 'active', 'Regional value content 60%. Change in tariff classification.'),
('BR', 'Mercosur-EU', 'Mercosur-EU Trade Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ'], 70, 'Framework agreement reached 2019. Awaiting ratification.', NULL, 'pending', 'Product-specific rules. Regional value content varies.'),
('BR', 'Mercosur-Israel', 'Mercosur-Israel FTA', ARRAY['IL'], 60, 'First Mercosur FTA outside South America.', '2010-04-01', 'active', 'Regional value content 40-60%. Product-specific rules.');

-- MX FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('MX', 'USMCA', 'United States-Mexico-Canada Agreement', ARRAY['US','CA'], 90, '75% auto content. Digital trade. Labor provisions.', '2020-07-01', 'active', 'Regional value content 75% for autos. Strict labor value content.'),
('MX', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','SG','VN','MY','CL','PE','BN','KR','GB'], 80, 'Access to Asia-Pacific markets.', '2018-12-30', 'active', 'Regional value content varies. Cumulation across members.'),
('MX', 'Mexico-EU', 'Mexico-EU Global Agreement (Modernized)', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ'], 85, 'Modernized agreement. Broader coverage than original.', '2000-07-01', 'active', 'Product-specific rules. Regional value content varies.');

-- TR FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('TR', 'EU-Turkey CU', 'EU-Turkey Customs Union', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ'], 90, 'Customs union for industrial goods. Common external tariff alignment.', '1995-12-31', 'active', 'EU origin rules apply for industrial goods. Agricultural goods excluded.'),
('TR', 'Korea-Turkey', 'Korea-Turkey FTA', ARRAY['KR'], 75, 'Goods trade. Framework for services and investment.', '2013-05-01', 'active', 'Change in tariff classification. Regional value content for select items.');

-- AE FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('AE', 'GCC', 'Gulf Cooperation Council Common Market', ARRAY['SA','KW','QA','BH','OM'], 95, 'Common market. Free movement of goods, services, people within GCC.', '2008-01-01', 'active', 'GCC origin: 40% value added within GCC. Common external tariff 5%.'),
('AE', 'India-UAE CEPA', 'India-UAE Comprehensive Economic Partnership', ARRAY['IN'], 65, 'Covers 80% of goods. Strong bilateral trade.', '2022-05-01', 'active', 'Regional value content 40%. Product-specific rules.');

-- SA FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('SA', 'GCC', 'Gulf Cooperation Council Common Market', ARRAY['AE','KW','QA','BH','OM'], 95, 'Common market within GCC. Free trade among members.', '2008-01-01', 'active', 'GCC origin: 40% value added within GCC.'),
('SA', 'GCC-SG', 'GCC-Singapore FTA', ARRAY['SG'], 80, 'GCC collective FTA with Singapore.', '2013-09-01', 'active', 'Regional value content 35-40%. Product-specific rules.');

-- CL FTAs (Chile has one of the largest FTA networks)
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('CL', 'Chile-Korea', 'Chile-Korea FTA', ARRAY['KR'], 85, 'Korea first Asian FTA. Model agreement.', '2004-04-01', 'active', 'Change in tariff heading or regional value content 45%.'),
('CL', 'CPTPP', 'Comprehensive and Progressive Trans-Pacific Partnership', ARRAY['JP','AU','CA','NZ','SG','VN','MY','MX','PE','BN','KR','GB'], 80, 'Access to Asia-Pacific.', '2018-12-30', 'active', 'Regional value content varies. Cumulation across members.'),
('CL', 'Chile-US', 'Chile-US FTA', ARRAY['US'], 85, 'Comprehensive FTA. Strong environmental/labor chapters.', '2004-01-01', 'active', 'Change in tariff classification. Regional value content 35%.'),
('CL', 'Chile-EU', 'Chile-EU Association Agreement', ARRAY['DE','FR','IT','ES','NL','BE','PL','CZ'], 85, 'Broad FTA covering goods, services, and political cooperation.', '2003-02-01', 'active', 'Product-specific rules. Regional value content varies.'),
('CL', 'Pacific Alliance', 'Pacific Alliance', ARRAY['MX','CO','PE'], 90, 'Deep integration. Free movement of goods, services, people, capital.', '2016-05-01', 'active', 'Regional value content varies. Cumulation among members.');

-- CO FTAs
INSERT INTO country_ftas (country_code, fta_name, fta_full_name, partner_countries, tariff_reduction_avg, key_benefits, effective_date, status, rules_of_origin_summary) VALUES
('CO', 'Korea-Colombia', 'Korea-Colombia FTA', ARRAY['KR'], 70, 'Agriculture and industrial goods. Growing bilateral trade.', '2016-07-15', 'active', 'Regional value content 40-50%. Product-specific rules.'),
('CO', 'Pacific Alliance', 'Pacific Alliance', ARRAY['MX','CL','PE'], 90, 'Deep integration with Latin American partners.', '2016-05-01', 'active', 'Regional value content varies. Cumulation among members.'),
('CO', 'US-Colombia', 'US-Colombia Trade Promotion Agreement', ARRAY['US'], 80, 'Broad tariff elimination. Strong IP protection.', '2012-05-15', 'active', 'Regional value content 35%. Product-specific rules.');
