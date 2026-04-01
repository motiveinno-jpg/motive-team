-- M16: CEO 직통 채팅 메시지 테이블 (Supabase Realtime 전환)

CREATE TABLE IF NOT EXISTS ceo_chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  text NOT NULL DEFAULT 'ceo-direct',
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE ceo_chat_messages;

-- RLS: 어드민/모티브 이메일만 접근
ALTER TABLE ceo_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ceo_chat_select" ON ceo_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.email LIKE '%@motiveinno.com' OR u.email LIKE '%@mo-tive.com')
    )
  );

CREATE POLICY "ceo_chat_insert" ON ceo_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.email LIKE '%@motiveinno.com' OR u.email LIKE '%@mo-tive.com')
    )
  );

-- 오래된 메시지 자동 정리 (90일 보관)
CREATE INDEX IF NOT EXISTS idx_ceo_chat_channel_created ON ceo_chat_messages(channel_id, created_at DESC);
