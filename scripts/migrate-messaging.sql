-- ============================================================
-- Messaging Migration — run blocks in order in Supabase SQL Editor
-- ============================================================

-- 1. Add user_id and is_messageable to makers
ALTER TABLE makers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE makers ADD COLUMN IF NOT EXISTS is_messageable boolean
  GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;

-- 2. Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES auth.users(id),
  maker_id text NOT NULL REFERENCES makers(id),
  last_message_preview text,
  unread_count_visitor int NOT NULL DEFAULT 0,
  unread_count_maker int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, maker_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 3. Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Indexes
CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at, id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_conversations_visitor ON conversations(visitor_id);
CREATE INDEX idx_conversations_maker ON conversations(maker_id);

-- 5. RLS Policies — conversations
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  visitor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM makers m WHERE m.id = conversations.maker_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (visitor_id = auth.uid());

-- 6. RLS Policies — messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN makers m ON m.id = c.maker_id
    WHERE c.id = messages.conversation_id
    AND (c.visitor_id = auth.uid() OR m.user_id = auth.uid())
  )
);

CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN makers m ON m.id = c.maker_id
    WHERE c.id = messages.conversation_id
    AND (c.visitor_id = auth.uid() OR m.user_id = auth.uid())
  )
);

CREATE POLICY "messages_update_read" ON messages FOR UPDATE USING (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN makers m ON m.id = c.maker_id
    WHERE c.id = messages.conversation_id
    AND (c.visitor_id = auth.uid() OR m.user_id = auth.uid())
  )
) WITH CHECK (
  read_at IS NOT NULL
);

-- 7. Trigger: update conversation on new message
CREATE FUNCTION update_conversation_on_message() RETURNS trigger AS $$
DECLARE
  v_visitor_id uuid;
  v_maker_user_id uuid;
BEGIN
  SELECT c.visitor_id INTO v_visitor_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  SELECT m.user_id INTO v_maker_user_id
  FROM conversations c JOIN makers m ON m.id = c.maker_id
  WHERE c.id = NEW.conversation_id;

  UPDATE conversations SET
    updated_at = now(),
    last_message_preview = LEFT(NEW.body, 100),
    unread_count_visitor = CASE
      WHEN NEW.sender_id != v_visitor_id THEN unread_count_visitor + 1
      ELSE unread_count_visitor
    END,
    unread_count_maker = CASE
      WHEN NEW.sender_id != v_maker_user_id THEN unread_count_maker + 1
      ELSE unread_count_maker
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- 8. RPC: get or create conversation
CREATE FUNCTION get_or_create_conversation(p_maker_id text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM conversations
  WHERE visitor_id = auth.uid() AND maker_id = p_maker_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO conversations (visitor_id, maker_id)
  VALUES (auth.uid(), p_maker_id)
  ON CONFLICT (visitor_id, maker_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM conversations
    WHERE visitor_id = auth.uid() AND maker_id = p_maker_id;
  END IF;

  RETURN v_id;
END;
$$;

-- 9. RPC: mark conversation as read
CREATE FUNCTION mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_visitor_id uuid;
BEGIN
  SELECT visitor_id INTO v_visitor_id
  FROM conversations WHERE id = p_conversation_id;

  UPDATE messages SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;

  IF auth.uid() = v_visitor_id THEN
    UPDATE conversations SET unread_count_visitor = 0 WHERE id = p_conversation_id;
  ELSE
    UPDATE conversations SET unread_count_maker = 0 WHERE id = p_conversation_id;
  END IF;
END;
$$;

-- 10. RPC: get inbox
CREATE FUNCTION get_inbox()
RETURNS TABLE (
  conversation_id uuid,
  maker_id text,
  visitor_id uuid,
  maker_name text,
  maker_avatar_url text,
  last_message_preview text,
  unread_count int,
  updated_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.maker_id,
    c.visitor_id,
    m.name,
    m.avatar_url,
    c.last_message_preview,
    CASE
      WHEN c.visitor_id = auth.uid() THEN c.unread_count_visitor
      ELSE c.unread_count_maker
    END,
    c.updated_at
  FROM conversations c
  JOIN makers m ON m.id = c.maker_id
  WHERE c.visitor_id = auth.uid()
     OR m.user_id = auth.uid()
  ORDER BY c.updated_at DESC;
END;
$$;

-- 11. RPC: cursor-paginated message fetch (compound cursor works in SQL, not PostgREST)
CREATE FUNCTION get_messages(
    p_conversation_id uuid,
    p_cursor_time timestamptz DEFAULT NULL,
    p_cursor_id uuid DEFAULT NULL,
    p_limit int DEFAULT 30
) RETURNS SETOF messages
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT * FROM messages
    WHERE conversation_id = p_conversation_id
    AND (p_cursor_time IS NULL OR (created_at, id) < (p_cursor_time, p_cursor_id))
    ORDER BY created_at DESC, id DESC
    LIMIT p_limit;
$$;

-- 12. Enable Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
