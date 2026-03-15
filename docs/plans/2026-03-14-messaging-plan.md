# Real-Time Messaging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visitor-to-maker live messaging using Supabase Realtime, with inbox tab, chat view, and unread badges.

**Architecture:** Two new tables (`conversations`, `messages`) with RLS, database triggers for denormalized counts, Supabase Realtime subscriptions per conversation. UI follows existing overlay navigation pattern. `useInbox` hook runs at App level for cross-tab badge accuracy.

**Tech Stack:** React 19, TypeScript, Supabase (Realtime + RPC + RLS), inline styles, state-driven navigation.

**Spec:** `docs/plans/2026-03-14-messaging-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `scripts/migrate-messaging.sql` | Full database migration (tables, indexes, triggers, RPCs, RLS) |
| `src/types/messaging.ts` | `Conversation`, `Message`, `InboxItem` interfaces |
| `src/hooks/useConversation.ts` | Message history, Realtime subscription, optimistic sends, read receipts, pagination |
| `src/hooks/useInbox.ts` | Inbox list, unread counts, Realtime badge updates |
| `src/screens/MessagesScreen.tsx` | Inbox list view |
| `src/components/messages/ChatView.tsx` | Full-screen chat overlay |
| `src/components/messages/MessageBubble.tsx` | Individual message rendering |
| `src/components/messages/ChatInput.tsx` | Text input + send button |
| `src/components/messages/InboxRow.tsx` | Single conversation row in inbox |

### Modified files

| File | Changes |
|------|---------|
| `src/types/index.ts` | Re-export messaging types |
| `src/types/maker.ts` | Add `is_messageable?: boolean` to `Maker` interface |
| `src/constants/navigation.ts` | Add "messages" tab |
| `src/components/ui/MakerAvatar.tsx` | Accept `Pick<Maker, "name" \| "avatar_url">` instead of full `Maker` |
| `src/components/layout/TabBar.tsx` | Add messages icon + unread badge |
| `src/App.tsx` | Add `selectedConversation` state, `useInbox` at App level, URL/history integration, render ChatView + MessagesScreen |
| `src/screens/MakerProfile.tsx` | Add "Message" button |
| `src/hooks/useMakers.ts` | Add `is_messageable` to SELECT columns |

---

## Chunk 1: Database & Types

### Task 1: Database Migration

**Files:**
- Create: `scripts/migrate-messaging.sql`

- [ ] **Step 1: Write the full migration SQL**

```sql
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
```

- [ ] **Step 2: Run the migration in Supabase SQL Editor**

Run each numbered block in order. Verify no errors.

- [ ] **Step 3: Link a test maker to a user account**

In Supabase dashboard, update a maker row (e.g., Doolin Leather) to set `user_id` to a test user's auth ID. Verify `is_messageable` becomes `true`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-messaging.sql
git commit -m "feat(messaging): add database migration — tables, RLS, triggers, RPCs"
```

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/messaging.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/maker.ts`

- [ ] **Step 1: Create messaging types**

```typescript
// src/types/messaging.ts
export interface Conversation {
    id: string
    visitor_id: string
    maker_id: string
    last_message_preview: string | null
    unread_count_visitor: number
    unread_count_maker: number
    created_at: string
    updated_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    body: string
    created_at: string
    read_at: string | null
    pending?: boolean
    failed?: boolean
}

export interface InboxItem {
    conversation_id: string
    maker_id: string
    visitor_id: string
    maker_name: string
    maker_avatar_url: string | null
    last_message_preview: string | null
    unread_count: number
    updated_at: string
}
```

- [ ] **Step 2: Add `is_messageable` to Maker interface**

In `src/types/maker.ts`, add to the `Maker` interface:

```typescript
is_messageable?: boolean
```

- [ ] **Step 3: Re-export from barrel**

In `src/types/index.ts`, add:

```typescript
export type { Conversation, Message, InboxItem } from "./messaging"
```

- [ ] **Step 4: Add `is_messageable` to useMakers SELECT**

In `src/hooks/useMakers.ts`, find the `cols` string in the prefetch or the Supabase `.select()` call. Add `is_messageable` to the selected columns.

Also update `index.html` prefetch `cols` variable to include `is_messageable`.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/messaging.ts src/types/index.ts src/types/maker.ts src/hooks/useMakers.ts index.html
git commit -m "feat(messaging): add TypeScript types and is_messageable to Maker"
```

---

## Chunk 2: Hooks

### Task 3: useConversation Hook

**Files:**
- Create: `src/hooks/useConversation.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useConversation.ts
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import type { Message } from "../types"

const PAGE_SIZE = 30

export default function useConversation(conversationId: string | null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const fetchedRef = useRef(false)
    const cursorRef = useRef<{ time: string; id: string } | null>(null)

    // Rate limiting refs
    const lastSendRef = useRef(0)
    const sendCountRef = useRef(0)
    const sendWindowRef = useRef(Date.now())

    // Update cursor when messages change
    useEffect(() => {
        if (messages.length > 0) {
            cursorRef.current = { time: messages[0].created_at, id: messages[0].id }
        }
    }, [messages])

    // Fetch initial messages via RPC (proper compound cursor support)
    useEffect(() => {
        if (!conversationId) {
            setMessages([])
            cursorRef.current = null
            fetchedRef.current = false
            return
        }
        if (fetchedRef.current) return
        fetchedRef.current = true

        setLoading(true)
        supabase
            .rpc("get_messages", { p_conversation_id: conversationId })
            .then(({ data, error }) => {
                if (error) {
                    console.error("messages fetch:", error.message)
                    setMessages([])
                } else {
                    setMessages((data as Message[])?.reverse() ?? [])
                    setHasMore((data?.length ?? 0) >= PAGE_SIZE)
                }
                setLoading(false)
            })
    }, [conversationId])

    // Load older messages — reads cursor from ref to avoid stale closure
    const loadMore = useCallback(async () => {
        if (!conversationId || !hasMore || loading) return
        const cursor = cursorRef.current
        if (!cursor) return

        setLoading(true)
        const { data, error } = await supabase.rpc("get_messages", {
            p_conversation_id: conversationId,
            p_cursor_time: cursor.time,
            p_cursor_id: cursor.id,
        })

        if (error) {
            console.error("messages loadMore:", error.message)
        } else {
            const older = (data as Message[])?.reverse() ?? []
            setMessages((prev) => [...older, ...prev])
            setHasMore(older.length >= PAGE_SIZE)
        }
        setLoading(false)
    }, [conversationId, hasMore, loading])

    // Realtime subscription
    useEffect(() => {
        if (!conversationId) return

        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message
                    setMessages((prev) => {
                        // Replace optimistic message if it matches
                        const optimisticIdx = prev.findIndex(
                            (m) => m.pending && m.body === newMsg.body && m.sender_id === newMsg.sender_id,
                        )
                        if (optimisticIdx >= 0) {
                            const updated = [...prev]
                            updated[optimisticIdx] = newMsg
                            return updated
                        }
                        // Avoid duplicates
                        if (prev.some((m) => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    // Send message with optimistic UI and rate limiting
    const sendMessage = useCallback(
        async (body: string) => {
            if (!conversationId) return

            const trimmed = body.trim()
            if (!trimmed || trimmed.length > 2000) return

            // Rate limit: 1/sec, 50/min
            const now = Date.now()
            if (now - lastSendRef.current < 1000) return
            if (now - sendWindowRef.current > 60000) {
                sendCountRef.current = 0
                sendWindowRef.current = now
            }
            if (sendCountRef.current >= 50) return
            lastSendRef.current = now
            sendCountRef.current++

            const { data: userData } = await supabase.auth.getUser()
            const userId = userData?.user?.id
            if (!userId) return

            const optimistic: Message = {
                id: crypto.randomUUID(),
                conversation_id: conversationId,
                sender_id: userId,
                body: trimmed,
                created_at: new Date().toISOString(),
                read_at: null,
                pending: true,
            }

            setMessages((prev) => [...prev, optimistic])

            const { error } = await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: userId,
                body: trimmed,
            })

            if (error) {
                console.error("send message:", error.message)
                setMessages((prev) =>
                    prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m)),
                )
            }
        },
        [conversationId],
    )

    // Retry failed message
    const retryMessage = useCallback(
        async (messageId: string) => {
            const msg = messages.find((m) => m.id === messageId && m.failed)
            if (!msg) return

            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, failed: false, pending: true } : m)))

            const { error } = await supabase.from("messages").insert({
                conversation_id: msg.conversation_id,
                sender_id: msg.sender_id,
                body: msg.body,
            })

            if (error) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? { ...m, pending: false, failed: true } : m)),
                )
            }
        },
        [messages],
    )

    // Mark as read
    const markRead = useCallback(() => {
        if (!conversationId || document.visibilityState !== "visible") return
        supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId })
    }, [conversationId])

    return { messages, loading, hasMore, loadMore, sendMessage, retryMessage, markRead }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useConversation.ts
git commit -m "feat(messaging): add useConversation hook — messages, realtime, optimistic sends"
```

### Task 4: useInbox Hook

**Files:**
- Create: `src/hooks/useInbox.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useInbox.ts
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import type { InboxItem } from "../types"

export default function useInbox(userId: string | undefined) {
    const [items, setItems] = useState<InboxItem[]>([])
    const [loading, setLoading] = useState(false)
    const fetchedRef = useRef(false)
    const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])

    const totalUnread = items.reduce((sum, item) => sum + item.unread_count, 0)

    // Fetch inbox
    const fetchInbox = useCallback(async () => {
        if (!userId) return
        setLoading(true)
        const { data, error } = await supabase.rpc("get_inbox")
        if (error) {
            console.error("get_inbox:", error.message)
        } else {
            setItems((data as InboxItem[]) ?? [])
        }
        setLoading(false)
    }, [userId])

    useEffect(() => {
        if (!userId || fetchedRef.current) return
        fetchedRef.current = true
        fetchInbox()
    }, [userId, fetchInbox])

    // Reset on logout
    useEffect(() => {
        if (!userId) {
            setItems([])
            fetchedRef.current = false
        }
    }, [userId])

    // Incrementally subscribe to conversations — only add channels for new conversation IDs
    const subscribedIdsRef = useRef(new Set<string>())

    useEffect(() => {
        if (!userId || !items.length) return

        const currentIds = new Set(items.map((it) => it.conversation_id))

        // Remove channels for conversations no longer in the list
        channelsRef.current = channelsRef.current.filter((ch) => {
            const id = ch.topic.replace("inbox:", "")
            if (!currentIds.has(id)) {
                supabase.removeChannel(ch)
                subscribedIdsRef.current.delete(id)
                return false
            }
            return true
        })

        // Add channels for new conversations only
        items.forEach((item) => {
            if (subscribedIdsRef.current.has(item.conversation_id)) return

            const channel = supabase
                .channel(`inbox:${item.conversation_id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "messages",
                        filter: `conversation_id=eq.${item.conversation_id}`,
                    },
                    (payload) => {
                        const msg = payload.new as { sender_id: string; body: string; created_at: string }
                        if (msg.sender_id === userId) return
                        setItems((prev) =>
                            prev
                                .map((it) =>
                                    it.conversation_id === item.conversation_id
                                        ? {
                                              ...it,
                                              last_message_preview: msg.body.slice(0, 100),
                                              updated_at: msg.created_at,
                                              unread_count: it.unread_count + 1,
                                          }
                                        : it,
                                )
                                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
                        )
                    },
                )
                .subscribe()
            channelsRef.current.push(channel)
            subscribedIdsRef.current.add(item.conversation_id)
        })

        return () => {
            channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
            channelsRef.current = []
            subscribedIdsRef.current.clear()
        }
    }, [userId, items])

    // Clear unread for a specific conversation (after markRead)
    const clearUnread = useCallback((conversationId: string) => {
        setItems((prev) =>
            prev.map((it) => (it.conversation_id === conversationId ? { ...it, unread_count: 0 } : it)),
        )
    }, [])

    // Add or update a conversation in the inbox (when new message sent/received)
    const updateItem = useCallback((conversationId: string, preview: string) => {
        setItems((prev) => {
            const existing = prev.find((it) => it.conversation_id === conversationId)
            if (existing) {
                return prev
                    .map((it) =>
                        it.conversation_id === conversationId
                            ? { ...it, last_message_preview: preview, updated_at: new Date().toISOString() }
                            : it,
                    )
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            }
            // New conversation — refetch to get full data
            return prev
        })
    }, [])

    return { items, loading, totalUnread, clearUnread, updateItem, refetch: fetchInbox }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInbox.ts
git commit -m "feat(messaging): add useInbox hook — inbox list, realtime badge, unread counts"
```

---

## Chunk 3: UI Components

### Task 5: MessageBubble Component

**Files:**
- Create: `src/components/messages/MessageBubble.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/messages/MessageBubble.tsx
import type { Message, Theme } from "../../types"

interface MessageBubbleProps {
    message: Message
    isMine: boolean
    theme: Theme
    onRetry?: (id: string) => void
}

export default function MessageBubble({ message, isMine, theme, onRetry }: MessageBubbleProps) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
                padding: "2px 16px",
            }}
        >
            <div
                onClick={message.failed && onRetry ? () => onRetry(message.id) : undefined}
                style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: 18,
                    borderBottomRightRadius: isMine ? 4 : 18,
                    borderBottomLeftRadius: isMine ? 18 : 4,
                    background: isMine ? theme.btnBg : theme.surface,
                    color: isMine ? theme.btnText : theme.text,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    opacity: message.pending ? 0.6 : 1,
                    cursor: message.failed ? "pointer" : "default",
                }}
            >
                {message.body}
                {message.failed && (
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: "#e53e3e",
                            marginTop: 4,
                        }}
                    >
                        Failed to send · Tap to retry
                    </div>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/messages/MessageBubble.tsx
git commit -m "feat(messaging): add MessageBubble component"
```

### Task 6: ChatInput Component

**Files:**
- Create: `src/components/messages/ChatInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/messages/ChatInput.tsx
import { useState, useRef } from "react"
import type { Theme } from "../../types"

interface ChatInputProps {
    onSend: (body: string) => void
    theme: Theme
    isDark: boolean
}

export default function ChatInput({ onSend, theme, isDark }: ChatInputProps) {
    const [text, setText] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const canSend = text.trim().length > 0

    const handleSend = () => {
        if (!canSend) return
        onSend(text)
        setText("")
        inputRef.current?.focus()
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
                borderTop: `1px solid ${theme.border}`,
                background: theme.bg,
            }}
        >
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder="Message..."
                style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 100,
                    border: `1px solid ${theme.border}`,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    color: theme.text,
                    outline: "none",
                    boxSizing: "border-box",
                }}
            />
            <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: "none",
                    background: canSend ? theme.btnBg : theme.border,
                    color: canSend ? theme.btnText : theme.textMuted,
                    cursor: canSend ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.2s ease",
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 7-7 7 7" />
                    <path d="M12 19V5" />
                </svg>
            </button>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/messages/ChatInput.tsx
git commit -m "feat(messaging): add ChatInput component"
```

### Task 7: ChatView Component

**Files:**
- Create: `src/components/messages/ChatView.tsx`

- [ ] **Step 1: Create the component**

The chat view is a full-screen overlay. It uses `useConversation` for messages, renders `MessageBubble` for each message, and `ChatInput` at the bottom. Auto-scrolls to bottom on new messages (only if already at bottom). Shows "New message" pill when scrolled up and a new message arrives.

Key behaviors:
- On mount: call `markRead()` to clear unread
- On visibility change: call `markRead()` when tab becomes visible
- Scroll to top: call `loadMore()` for pagination
- Header: back arrow + maker avatar + name

```typescript
// src/components/messages/ChatView.tsx
import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import useConversation from "../../hooks/useConversation"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"
import MakerAvatar from "../ui/MakerAvatar"
import type { Maker } from "../../types"

interface ChatViewProps {
    conversationId: string
    maker: Maker
    userId: string
    onBack: () => void
    onRead: (conversationId: string) => void
}

export default function ChatView({ conversationId, maker, userId, onBack, onRead }: ChatViewProps) {
    const { theme, isDark } = useTheme()
    const { messages, loading, hasMore, loadMore, sendMessage, retryMessage, markRead } =
        useConversation(conversationId)
    const scrollRef = useRef<HTMLDivElement>(null)
    const isAtBottom = useRef(true)
    const prevCountRef = useRef(0)

    // Mark as read on mount and visibility change
    useEffect(() => {
        markRead()
        onRead(conversationId)

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                markRead()
                onRead(conversationId)
            }
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => document.removeEventListener("visibilitychange", onVisibility)
    }, [conversationId, markRead, onRead])

    // Auto-scroll to bottom on new messages (only if at bottom)
    useEffect(() => {
        if (messages.length > prevCountRef.current && isAtBottom.current) {
            const el = scrollRef.current
            if (el) el.scrollTop = el.scrollHeight
        }
        prevCountRef.current = messages.length
    }, [messages.length])

    // Initial scroll to bottom
    useEffect(() => {
        const el = scrollRef.current
        if (el && messages.length > 0 && !loading) {
            el.scrollTop = el.scrollHeight
        }
    }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        // Load more when near top
        if (el.scrollTop < 60 && hasMore && !loading) {
            const prevHeight = el.scrollHeight
            loadMore().then(() => {
                // Preserve scroll position after prepending
                requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight
                    }
                })
            })
        }
    }, [hasMore, loading, loadMore])

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                background: theme.bg,
                display: "flex",
                flexDirection: "column",
                maxWidth: "var(--app-max-width)",
                margin: "0 auto",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom: `1px solid ${theme.border}`,
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onBack}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: theme.text,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>
                <MakerAvatar maker={maker} size={32} />
                <span
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: theme.text,
                    }}
                >
                    {maker.name}
                </span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "12px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {loading && messages.length === 0 && (
                    <div style={{ textAlign: "center", padding: 20 }}>
                        <div
                            style={{
                                width: 20,
                                height: 20,
                                border: `2px solid ${theme.border}`,
                                borderTopColor: theme.text,
                                borderRadius: "50%",
                                animation: "spin 0.6s linear infinite",
                                margin: "0 auto",
                            }}
                        />
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isMine={msg.sender_id === userId}
                        theme={theme}
                        onRetry={retryMessage}
                    />
                ))}
            </div>

            {/* Input */}
            <ChatInput onSend={sendMessage} theme={theme} isDark={isDark} />
        </div>
    )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/messages/ChatView.tsx
git commit -m "feat(messaging): add ChatView component — message list, auto-scroll, pagination"
```

### Task 8: InboxRow Component

**Files:**
- Create: `src/components/messages/InboxRow.tsx`
- Modify: `src/components/ui/MakerAvatar.tsx`

- [ ] **Step 0: Update MakerAvatar to accept a lighter prop type**

In `src/components/ui/MakerAvatar.tsx`, change the prop type from `Maker` to `Pick<Maker, "name" | "avatar_url">`:

```typescript
interface MakerAvatarProps {
    maker: Pick<Maker, "name" | "avatar_url">
    size?: number
    eager?: boolean
}
```

This is backwards-compatible — every `Maker` object still satisfies the `Pick`. No other call sites need changes.

- [ ] **Step 1: Create the component**

```typescript
// src/components/messages/InboxRow.tsx
import MakerAvatar from "../ui/MakerAvatar"
import type { InboxItem, Theme } from "../../types"

interface InboxRowProps {
    item: InboxItem
    theme: Theme
    onTap: (conversationId: string) => void
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return `${Math.floor(days / 7)}w`
}

export default function InboxRow({ item, theme, onTap }: InboxRowProps) {
    const hasUnread = item.unread_count > 0
    return (
        <div
            onClick={() => onTap(item.conversation_id)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                cursor: "pointer",
                borderBottom: `1px solid ${theme.border}`,
            }}
        >
            <MakerAvatar
                maker={{ name: item.maker_name, avatar_url: item.maker_avatar_url }}
                size={44}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14.5,
                            fontWeight: hasUnread ? 700 : 500,
                            color: theme.text,
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {item.maker_name}
                    </span>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            color: theme.textMuted,
                            flexShrink: 0,
                        }}
                    >
                        {timeAgo(item.updated_at)}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: hasUnread ? theme.textSecondary : theme.textMuted,
                            fontWeight: hasUnread ? 500 : 400,
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {item.last_message_preview || "No messages yet"}
                    </span>
                    {hasUnread && (
                        <div
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: theme.btnBg,
                                flexShrink: 0,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/messages/InboxRow.tsx
git commit -m "feat(messaging): add InboxRow component"
```

### Task 9: MessagesScreen

**Files:**
- Create: `src/screens/MessagesScreen.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// src/screens/MessagesScreen.tsx
import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import InboxRow from "../components/messages/InboxRow"
import type { InboxItem } from "../types"

interface MessagesScreenProps {
    items: InboxItem[]
    loading: boolean
    onConversationTap: (conversationId: string, makerId: string) => void
    onLogoTap: () => void
}

export default function MessagesScreen({ items, loading, onConversationTap, onLogoTap }: MessagesScreenProps) {
    const { theme } = useTheme()

    return (
        <div
            style={{
                minHeight: "calc(100vh - 64px - env(safe-area-inset-bottom, 0px))",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Helmet>
                <title>Messages — maven</title>
            </Helmet>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    height: 50,
                    boxSizing: "border-box",
                    padding: "10px 16px 10px 20px",
                }}
            >
                <h1
                    onClick={onLogoTap}
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 30,
                        fontWeight: 700,
                        color: theme.text,
                        margin: 0,
                        letterSpacing: "-0.03em",
                        lineHeight: 0.75,
                        cursor: "pointer",
                    }}
                >
                    maven
                </h1>
            </div>

            {loading && items.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                    <div
                        style={{
                            width: 20,
                            height: 20,
                            border: `2px solid ${theme.border}`,
                            borderTopColor: theme.text,
                            borderRadius: "50%",
                            animation: "spin 0.6s linear infinite",
                            margin: "0 auto",
                        }}
                    />
                </div>
            ) : items.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 15,
                            color: theme.textSecondary,
                            lineHeight: 1.5,
                        }}
                    >
                        No messages yet.
                        <br />
                        Find a maker you love and say hello.
                    </p>
                </div>
            ) : (
                <div style={{ animation: "fadeIn 0.15s ease" }}>
                    {items.map((item) => (
                        <InboxRow key={item.conversation_id} item={item} theme={theme} onTap={(id) => onConversationTap(id, item.maker_id)} />
                    ))}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MessagesScreen.tsx
git commit -m "feat(messaging): add MessagesScreen — inbox list with empty state"
```

---

## Chunk 4: Integration

### Task 10: TabBar — Add Messages Tab

**Files:**
- Modify: `src/constants/navigation.ts`
- Modify: `src/components/layout/TabBar.tsx`

- [ ] **Step 1: Add messages tab to navigation constants**

In `src/constants/navigation.ts`, add the messages tab between "saved" and "profile":

```typescript
export const TAB_ITEMS: TabItem[] = [
    { id: "discover", label: "Discover", icon: "\u25C9" },
    { id: "map", label: "Map", icon: "\u25CE" },
    { id: "saved", label: "Saved", icon: "\u2661" },
    { id: "messages", label: "Messages", icon: "\u2709" },
    { id: "profile", label: "Profile", icon: "\u25EF" },
]
```

- [ ] **Step 2: Add messages icon and unread badge to TabBar**

In `src/components/layout/TabBar.tsx`:

Add a chat bubble SVG icon component:

```typescript
function IconMessageV2() {
    return (
        <svg {...iconProps}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
    )
}
```

Add to `TAB_ICONS_V2`:

```typescript
messages: () => <IconMessageV2 />,
```

Update `TabBarProps` to accept `unreadMessages: number`:

```typescript
interface TabBarProps {
    activeTab: string
    savedCount: number
    unreadMessages: number
    selectedMaker: Maker | null
    onTabChange: (tab: string) => void
}
```

Update the badge rendering. Currently only `saved` shows a count. Extend the badge logic to also show for `messages`:

```typescript
const count = tab.id === "saved" ? savedCount : tab.id === "messages" ? unreadMessages : 0
```

Add the unread badge dot/count after the icon for the messages tab (same style as saved count if > 0).

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: Will have errors in App.tsx where TabBar is used (missing `unreadMessages` prop). That's fine — we'll fix it in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/constants/navigation.ts src/components/layout/TabBar.tsx
git commit -m "feat(messaging): add messages tab to TabBar with unread badge"
```

### Task 11: App.tsx — Wire Everything Together

**Files:**
- Modify: `src/App.tsx`

This is the central integration task. Changes needed:

- [ ] **Step 1: Add imports**

```typescript
import useInbox from "./hooks/useInbox"
import MessagesScreen from "./screens/MessagesScreen"
import ChatView from "./components/messages/ChatView"
```

- [ ] **Step 2: Add state and hooks**

After existing state declarations:

```typescript
const [selectedConversation, setSelectedConversation] = useState<{ id: string; makerId: string } | null>(null)
const { items: inboxItems, loading: inboxLoading, totalUnread, clearUnread, refetch: refetchInbox } =
    useInbox(user?.id)
```

- [ ] **Step 3: Update `getStateFromURL` and `buildURL`**

```typescript
function getStateFromURL() {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab") || "discover"
    const makerSlug = params.get("maker")
    const conversation = params.get("conversation")
    return { tab, makerSlug, conversation }
}

function buildURL(tab: string, makerSlug?: string | null, conversation?: string | null) {
    const params = new URLSearchParams()
    if (tab && tab !== "discover") params.set("tab", tab)
    if (makerSlug) params.set("maker", makerSlug)
    if (conversation) params.set("conversation", conversation)
    const qs = params.toString()
    return qs ? "/?" + qs : "/"
}
```

Update all existing `buildURL` calls to pass the third argument as `null` or omit it.

- [ ] **Step 4: Add conversation navigation handlers**

```typescript
const handleConversationOpen = useCallback(
    (conversationId: string, makerId: string) => {
        history.pushState(
            { tab: "messages", conversation: conversationId, makerId },
            "",
            buildURL("messages", null, conversationId),
        )
        setSelectedConversation({ id: conversationId, makerId })
    },
    [],
)

const handleConversationBack = useCallback(() => {
    history.back()
}, [])

const handleMessageMaker = useCallback(
    async (makerId: string) => {
        if (!user) {
            setAuthToast(true)
            if (authToastTimer.current) clearTimeout(authToastTimer.current)
            authToastTimer.current = setTimeout(() => setAuthToast(false), 2500)
            return
        }
        const { data, error } = await supabase.rpc("get_or_create_conversation", { p_maker_id: makerId })
        if (error || !data) {
            console.error("get_or_create_conversation:", error?.message)
            return
        }
        handleConversationOpen(data as string, makerId)
    },
    [user, handleConversationOpen],
)
```

- [ ] **Step 5: Update popstate handler**

In the `onPopState` handler, add conversation handling:

```typescript
const conversation = urlState.conversation || e.state?.conversation || null
const makerId = e.state?.makerId || null
setSelectedConversation(conversation && makerId ? { id: conversation, makerId } : null)
```

- [ ] **Step 6: Update `handleTabChange`**

Clear `selectedConversation` when switching tabs (already clears `selectedMaker`):

```typescript
setSelectedConversation(null)
```

- [ ] **Step 7: Add messages case to `renderScreen`**

```typescript
case "messages":
    return (
        <MessagesScreen
            items={inboxItems}
            loading={inboxLoading}
            onConversationTap={handleConversationOpen}
            onLogoTap={handleLogoTap}
        />
    )
```

- [ ] **Step 8: Render ChatView overlay**

After the `renderScreen()` call, before the auth toast:

```typescript
{selectedConversation && user && (() => {
    const maker = makers.find((m) => m.id === selectedConversation.makerId)
    if (!maker) return null
    return (
        <ChatView
            conversationId={selectedConversation.id}
            maker={maker}
            userId={user.id}
            onBack={handleConversationBack}
            onRead={clearUnread}
        />
    )
})()}
```

- [ ] **Step 9: Update TabBar props**

```typescript
<TabBar
    activeTab={activeTab}
    savedCount={savedIds.size}
    unreadMessages={totalUnread}
    selectedMaker={selectedMaker}
    onTabChange={handleTabChange}
/>
```

- [ ] **Step 10: Pass `onMessage` to MakerProfile**

Update the MakerProfile render call to include `onMessage={handleMessageMaker}`.

- [ ] **Step 11: Type check**

Run: `npx tsc --noEmit`
Expected: May have errors in MakerProfile.tsx (new prop). Fix in next task.

- [ ] **Step 12: Commit**

```bash
git add src/App.tsx
git commit -m "feat(messaging): wire inbox, chat view, and conversation navigation into App"
```

### Task 12: MakerProfile — Add Message Button

**Files:**
- Modify: `src/screens/MakerProfile.tsx`

- [ ] **Step 1: Add `onMessage` prop**

Add to `MakerProfileProps`:

```typescript
onMessage?: (makerId: string) => void
```

Destructure in the component.

- [ ] **Step 2: Add message button to the profile**

After the info section or alongside save/share in the header, add a "Message" button that's only visible when `maker.is_messageable`:

```typescript
{maker.is_messageable && onMessage && (
    <button
        onClick={() => onMessage(maker.id)}
        style={{
            padding: "10px 20px",
            borderRadius: 100,
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.text,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
        }}
    >
        Message
    </button>
)}
```

Place this in the info section or action row — wherever save/share buttons are. Check existing layout and follow the pattern.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Test the full flow**

1. Open the app, navigate to a maker with `is_messageable = true`
2. Tap "Message" — should navigate to chat view
3. Send a message — should appear with pending state, then confirm
4. Open Messages tab — should show the conversation
5. On a second device with the linked maker account, check inbox — message should appear in real-time
6. Reply from maker — visitor should see it instantly
7. Check unread badge updates correctly
8. Browser back should return to previous view

- [ ] **Step 5: Commit**

```bash
git add src/screens/MakerProfile.tsx
git commit -m "feat(messaging): add Message button to MakerProfile"
```

### Task 13: Deep-Link Resolution

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Handle conversation deep-link on initial load**

In the deep-link resolution effect, add:

```typescript
const { conversation } = initialURL.current
if (conversation) {
    setActiveTab("messages")
    // Look up maker_id from inbox items, or fetch from the conversation
    const inboxMatch = inboxItems.find((it) => it.conversation_id === conversation)
    if (inboxMatch) {
        setSelectedConversation({ id: conversation, makerId: inboxMatch.maker_id })
    } else {
        // Fetch conversation to get maker_id (handles deep-links before inbox loads)
        supabase
            .from("conversations")
            .select("maker_id")
            .eq("id", conversation)
            .single()
            .then(({ data }) => {
                if (data) setSelectedConversation({ id: conversation, makerId: data.maker_id })
            })
    }
}
```

- [ ] **Step 2: Update initial history.replaceState**

Pass the conversation to the initial `buildURL` call.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(messaging): support conversation deep-links"
```

### Task 14: Final Polish & Deploy

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Visual testing**

Test on localhost with two devices:
- Visitor sends message from maker profile
- Maker receives in real-time
- Maker replies
- Visitor sees reply instantly
- Unread badge appears/clears correctly
- Browser back/forward works
- Deep-link works
- Empty state renders correctly
- Auth toast shows for logged-out users

- [ ] **Step 3: Deploy**

Run: `npm run deploy -- "feat: add real-time messaging — visitor-to-maker chat with inbox, unread badges, Supabase Realtime"`
