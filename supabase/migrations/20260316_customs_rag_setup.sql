-- Customs AI RAG: pgvector setup + knowledge table + similarity search function
-- 2026-03-16

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create customs_knowledge table
CREATE TABLE IF NOT EXISTS customs_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('customs_law', 'fta', 'hs_code', 'certification', 'regulation')),
  country text,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for text search (used before embeddings are populated)
CREATE INDEX IF NOT EXISTS idx_customs_knowledge_category ON customs_knowledge (category);
CREATE INDEX IF NOT EXISTS idx_customs_knowledge_country ON customs_knowledge (country);

-- 4. Full-text search index on title + content
CREATE INDEX IF NOT EXISTS idx_customs_knowledge_fts
  ON customs_knowledge
  USING gin (to_tsvector('simple', title || ' ' || content));

-- 5. Vector similarity index (HNSW — better recall than ivfflat, usable at any table size)
CREATE INDEX IF NOT EXISTS idx_customs_knowledge_embedding
  ON customs_knowledge
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_customs_knowledge_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customs_knowledge_updated_at ON customs_knowledge;
CREATE TRIGGER trg_customs_knowledge_updated_at
  BEFORE UPDATE ON customs_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_customs_knowledge_updated_at();

-- 7. Semantic search function (cosine similarity)
CREATE OR REPLACE FUNCTION match_customs_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL,
  filter_country text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  country text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.title,
    ck.content,
    ck.category,
    ck.country,
    ck.metadata,
    1 - (ck.embedding <=> query_embedding) AS similarity
  FROM customs_knowledge ck
  WHERE
    ck.embedding IS NOT NULL
    AND (filter_category IS NULL OR ck.category = filter_category)
    AND (filter_country IS NULL OR ck.country = filter_country)
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Text-based search function (fallback when embeddings are not yet populated)
CREATE OR REPLACE FUNCTION search_customs_knowledge(
  query_text text,
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL,
  filter_country text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  country text,
  metadata jsonb,
  rank real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.title,
    ck.content,
    ck.category,
    ck.country,
    ck.metadata,
    ts_rank(
      to_tsvector('simple', ck.title || ' ' || ck.content),
      plainto_tsquery('simple', query_text)
    ) AS rank
  FROM customs_knowledge ck
  WHERE
    (
      to_tsvector('simple', ck.title || ' ' || ck.content) @@ plainto_tsquery('simple', query_text)
      OR ck.title ILIKE '%' || query_text || '%'
      OR ck.content ILIKE '%' || query_text || '%'
    )
    AND (filter_category IS NULL OR ck.category = filter_category)
    AND (filter_country IS NULL OR ck.country = filter_country)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 9. RLS: read-only for authenticated users, full access for service role
ALTER TABLE customs_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customs_knowledge"
  ON customs_knowledge
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access on customs_knowledge"
  ON customs_knowledge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
