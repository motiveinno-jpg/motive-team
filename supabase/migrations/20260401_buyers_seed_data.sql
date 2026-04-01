-- H11: B/L 바이어 테이블 시드 데이터 — 주요 HS코드별 글로벌 수입업체 20개사

INSERT INTO buyers (company_name, contact_name, country, categories, moq_range, trust_score, source) VALUES
('BeautyMart USA LLC',          'Sarah Kim',           'US', ARRAY['cosmetics','skincare','K-beauty'],                '500-2000 units',   85, 'seed'),
('EuroGlow Distribution GmbH',  'Klaus Mueller',       'DE', ARRAY['cosmetics','skincare','beauty'],                  '1000-5000 units',  88, 'seed'),
('Tokyo Beauty Import Co.',     'Yuki Tanaka',         'JP', ARRAY['cosmetics','K-beauty','skincare','makeup'],       '300-1500 units',   90, 'seed'),
('SG Beauty Hub Pte Ltd',       'Rachel Lim',          'SG', ARRAY['cosmetics','skincare','wellness'],                '500-3000 units',   82, 'seed'),
('Gulf Beauty Trading LLC',     'Mohammed Al-Rashid',  'AE', ARRAY['cosmetics','skincare','halal-beauty'],            '1000-5000 units',  79, 'seed'),
('GlobalTech Distributors Inc', 'Michael Chen',        'US', ARRAY['electronics','components','consumer-electronics'],'100-1000 units',   87, 'seed'),
('ElektroHandel GmbH',          'Hans Weber',          'DE', ARRAY['electronics','appliances','components'],          '200-2000 units',   85, 'seed'),
('ASEAN Electronics Import',    'Ahmad Zulkifli',      'MY', ARRAY['electronics','consumer-electronics'],             '500-5000 units',   80, 'seed'),
('Mercado Tech Argentina SA',   'Juan Carlos Lopez',   'AR', ARRAY['electronics','appliances','IT-equipment'],        '200-1500 units',   75, 'seed'),
('H-Mart International Corp',   'Jennifer Park',       'US', ARRAY['food','snacks','Korean-food','beverages'],        '1000-10000 units', 92, 'seed'),
('Pan Asian Foods Ltd',         'Wei Zhang',           'GB', ARRAY['food','Asian-food','snacks','noodles'],           '500-5000 units',   83, 'seed'),
('Natur Import Pty Ltd',        'Emma Wilson',         'AU', ARRAY['food','health-food','snacks','beverages'],        '500-3000 units',   81, 'seed'),
('Dubai Food Distribution LLC', 'Fatima Al-Mansoori',  'AE', ARRAY['food','halal-food','snacks','beverages'],         '2000-10000 units', 78, 'seed'),
('Fashion Forward LLC',         'Amanda Torres',       'US', ARRAY['fashion','apparel','sportswear'],                 '300-3000 units',   80, 'seed'),
('Mode Distribution SARL',      'Pierre Dubois',       'FR', ARRAY['fashion','luxury','apparel','accessories'],       '200-1000 units',   86, 'seed'),
('Textile Hub Pvt Ltd',         'Ravi Sharma',         'IN', ARRAY['textiles','apparel','fabric','garments'],         '1000-10000 units', 77, 'seed'),
('Industrial Parts Direct LLC', 'Robert Johnson',      'US', ARRAY['machinery','industrial','auto-parts'],            '50-500 units',     88, 'seed'),
('Maschinenbau Handel GmbH',    'Wolfgang Schneider',  'DE', ARRAY['machinery','industrial-equipment'],               '10-200 units',     91, 'seed'),
('MedSupply International Inc', 'Dr. Lisa Park',       'US', ARRAY['medical-devices','healthcare','diagnostics'],     '100-1000 units',   93, 'seed'),
('HealthTech Europe BV',        'Jan de Vries',        'NL', ARRAY['medical-devices','healthcare','wellness'],        '50-500 units',     89, 'seed');
