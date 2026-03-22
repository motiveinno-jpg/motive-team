CREATE TABLE IF NOT EXISTS public.sanctions_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  queried_name text NOT NULL,
  queried_country text,
  queried_type text DEFAULT 'entity',
  result text NOT NULL CHECK (result IN ('clear', 'flagged', 'error')),
  match_count integer DEFAULT 0,
  matches jsonb DEFAULT '[]',
  sources_checked text[],
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sanctions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.sanctions_log FOR ALL USING (true);
CREATE POLICY "Users can read own screenings" ON public.sanctions_log FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_sanctions_log_result ON public.sanctions_log(result);
CREATE INDEX idx_sanctions_log_created ON public.sanctions_log(created_at DESC);
