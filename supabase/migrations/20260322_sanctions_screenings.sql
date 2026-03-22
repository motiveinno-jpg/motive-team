CREATE TABLE IF NOT EXISTS sanctions_screenings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  queried_name text NOT NULL,
  queried_country text,
  queried_type text DEFAULT 'entity',
  result text NOT NULL DEFAULT 'pending',
  match_count int DEFAULT 0,
  matches jsonb DEFAULT '[]',
  sources_checked text[] DEFAULT '{}',
  cached boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id),
  project_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sanctions_name ON sanctions_screenings(queried_name);
CREATE INDEX idx_sanctions_result ON sanctions_screenings(result);
CREATE INDEX idx_sanctions_created_at ON sanctions_screenings(created_at);

ALTER TABLE sanctions_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON sanctions_screenings FOR ALL USING (true);
