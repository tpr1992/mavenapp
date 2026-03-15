# Real-Time Messaging — Design Spec

## Overview

Visitor-to-maker live messaging using Supabase Realtime (PostgreSQL logical replication over WebSockets). Visitors can message makers from their profile. Makers reply through the same app when their account is linked to a maker record.

## Data Model

### `conversations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `visitor_id` | uuid FK → auth.users | The user who initiated |
| `maker_id` | text FK → makers.id | The maker being contacted |
| `last_message_preview` | text | Truncated last message body (max 100 chars), updated by trigger |
| `unread_count_visitor` | int | Unread messages for the visitor, updated by trigger. Default 0 |
| `unread_count_maker` | int | Unread messages for the maker, updated by trigger. Default 0 |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | Updates on every new message, used for inbox sorting |

- Unique constraint on `(visitor_id, maker_id)` — one conversation per pair.
- No DELETE or UPDATE policies in v1 — conversations are immutable once created (except trigger-managed columns).

### `messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `conversation_id` | uuid FK → conversations | |
| `sender_id` | uuid FK → auth.users | Always set by client, enforced by RLS `sender_id = auth.uid()` |
| `body` | text | Max 2,000 chars (CHECK constraint) |
| `created_at` | timestamptz | `now()` |
| `read_at` | timestamptz | null = unread, set by recipient |

### `makers` table change

Add `is_messageable` boolean generated column:

```sql
ALTER TABLE makers ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE makers ADD COLUMN is_messageable boolean GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;
```

`is_messageable` is safe to expose client-side (no auth identity leaked). Add to the existing makers SELECT query. The `user_id` column is NOT included in the client-facing SELECT — only used server-side in RLS policies and triggers.

### Indexes

```sql
CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at, id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_conversations_visitor ON conversations(visitor_id);
CREATE INDEX idx_conversations_maker ON conversations(maker_id);
```

### Database Triggers

**On message insert** — update conversation metadata and unread counts:

```sql
CREATE FUNCTION update_conversation_on_message() RETURNS trigger AS $$
DECLARE
  v_visitor_id uuid;
  v_maker_user_id uuid;
BEGIN
  -- Get conversation participants
  SELECT c.visitor_id INTO v_visitor_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  SELECT m.user_id INTO v_maker_user_id
  FROM conversations c JOIN makers m ON m.id = c.maker_id
  WHERE c.id = NEW.conversation_id;

  -- Update conversation metadata + increment unread for the OTHER party
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
```

**Unread count reset** — handled explicitly in the mark-as-read RPC, not via per-row trigger (avoids write amplification when batch-marking 15+ messages as read):

```sql
CREATE FUNCTION mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_visitor_id uuid;
BEGIN
  SELECT visitor_id INTO v_visitor_id
  FROM conversations WHERE id = p_conversation_id;

  -- Mark all unread messages from the other party as read
  UPDATE messages SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;

  -- Reset the unread counter in one write
  IF auth.uid() = v_visitor_id THEN
    UPDATE conversations SET unread_count_visitor = 0 WHERE id = p_conversation_id;
  ELSE
    UPDATE conversations SET unread_count_maker = 0 WHERE id = p_conversation_id;
  END IF;
END;
$$;
```

### Get-or-Create Conversation RPC

Handles the race condition of two simultaneous conversation creation attempts:

```sql
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
```

### Inbox Query RPC

Single query for the inbox list — no per-conversation subqueries:

```sql
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
```

### RLS Policies

**conversations:**

```sql
-- Users can see conversations they're part of (as visitor or linked maker)
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  visitor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM makers m WHERE m.id = conversations.maker_id AND m.user_id = auth.uid()
  )
);

-- Only visitors can create conversations (via RPC, but policy enforces ownership)
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (visitor_id = auth.uid());
```

**messages:**

```sql
-- Users can read messages in their conversations (self-contained, no cross-table RLS dependency)
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN makers m ON m.id = c.maker_id
    WHERE c.id = messages.conversation_id
    AND (c.visitor_id = auth.uid() OR m.user_id = auth.uid())
  )
);

-- Users can send messages in their conversations
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN makers m ON m.id = c.maker_id
    WHERE c.id = messages.conversation_id
    AND (c.visitor_id = auth.uid() OR m.user_id = auth.uid())
  )
);

-- Only the recipient can mark messages as read
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
```

## TypeScript Types

Added to `src/types/` barrel:

```typescript
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
  pending?: boolean   // client-only, for optimistic UI
  failed?: boolean    // client-only, for retry UI
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

Add `is_messageable` to the existing `Maker` interface:

```typescript
// Add to existing Maker interface
is_messageable?: boolean
```

## Real-Time Architecture

### Subscription Model

- **Chat view open:** Subscribe to `postgres_changes` on `messages` filtered by `conversation_id=eq.{id}`. Simple equality filter — fully supported by Supabase Realtime.
- **Inbox/badge (App-level):** Subscribe to individual `conversation_id` channels for each conversation the user has. More subscriptions but each uses a simple equality filter — avoids expensive cross-user RLS evaluation on every message insert. **This subscription runs at the App level**, not inside the Messages tab, so the badge stays accurate across all tabs.

### Message Flow

1. Visitor types message, hits Send
2. **Optimistic:** Message appears instantly in UI with `pending: true`, `created_at` set to `new Date().toISOString()`
3. INSERT into `messages` table via Supabase client
4. Supabase Realtime broadcasts the new row to all subscribers on that `conversation_id`
5. Maker's client receives broadcast → message appears in their chat
6. On successful INSERT, replace optimistic message with server version (reconcile by matching `body` + proximity of `created_at`). On failure, set `failed: true` for retry UI.
7. `conversations.updated_at`, `last_message_preview`, and unread counts updated via database trigger

### Message Ordering

Messages are displayed sorted by `(created_at, id)`. Optimistic messages use `new Date().toISOString()` for `created_at` which will be close to the server timestamp. When the server version arrives via Realtime, it replaces the optimistic entry. Between the optimistic render and server confirmation, if another message arrives via Realtime, the sort order stays correct because all displayed messages are sorted by the same key.

### Inbox Cache Invalidation

When a Realtime message arrives for a conversation:
- **If conversation exists in local inbox state:** Update `last_message_preview`, `updated_at`, and `unread_count` optimistically in local state. Re-sort by `updated_at`.
- **If conversation is new (maker receives first message from a new visitor while inbox is open):** Append to local state with the Realtime payload. On next inbox fetch (tab focus, manual refresh), the full list reconciles.

### Unread Counts

- Denormalized on the `conversations` table (`unread_count_visitor`, `unread_count_maker`), managed by database triggers.
- Inbox query (`get_inbox` RPC) returns the correct count per user role — no aggregation needed.
- Total badge count: `SUM(unread_count)` from the inbox results, cached in App-level state.
- Incremented by Realtime subscription, decremented when messages are read.

### Read Receipts

- When user opens a conversation: call `mark_conversation_read` RPC — marks all unread messages and resets the unread counter in two writes (not N+1).
- Guarded by `document.visibilityState` — only fires when chat is actually visible.

### Rate Limiting

Client-side: max 1 message per second, max 50 messages per minute. Enforced via a simple timestamp + counter ref in `useConversation`. Messages that exceed the limit are silently queued and sent when the window opens.

## Hooks

### `useConversation(conversationId)`

- Fetches message history with cursor-based pagination
- **Page size:** 30 messages
- **Cursor:** compound `(created_at, id)` — handles sub-millisecond collisions
- **Query:** `WHERE conversation_id = X AND (created_at, id) < (cursor_time, cursor_id) ORDER BY created_at DESC, id DESC LIMIT 30`
- **Load more:** triggered on scroll to top
- New messages from Realtime append at the bottom without affecting pagination
- Manages Realtime subscription for new messages
- Handles optimistic inserts and failure states
- Marks messages as read when chat is visible
- Rate limiting (1/sec, 50/min)
- Cleanup on unmount

### `useInbox(userId)` — runs at App level

- Calls `get_inbox` RPC — returns conversation list with maker name/avatar, last message preview, and unread count (all from conversations table, no aggregation)
- Subscribes to each conversation's channel for real-time updates
- On new message: updates local state optimistically (preview, timestamp, unread count, re-sort)
- On new conversation (first message from new visitor): appends to local state
- Returns sorted list (by `updated_at` desc) and total unread count for badge

## URL & Navigation

### URL Format

- Messages tab: `?tab=messages`
- Specific conversation: `?tab=messages&conversation={conversationId}`
- Follows existing pattern: `?tab=discover`, `?maker=slug`

### History Integration

- Opening a chat pushes `history.pushState({ tab: "messages", conversation: id })`
- Browser back clears `selectedConversation`, returns to inbox
- The existing `popstate` handler in App.tsx needs a new case for `conversation` state
- Deep-linking to `?tab=messages&conversation=X` works via the existing `getStateFromURL` pattern

### State in App.tsx

- New state: `selectedConversation: string | null` (conversation ID)
- Chat view renders when `selectedConversation` is set, same overlay pattern as `selectedMaker`

## UI Components

### MakerProfile — "Message" Button

- New button alongside save/share actions
- **Only visible when `maker.is_messageable` is true** — computed column, safe to expose, no auth identity leaked
- If signed in: calls `get_or_create_conversation` RPC, then navigates to Chat View
- If not signed in: shows auth toast ("Sign in to message makers")

### Chat View — Full-Screen Overlay

- Slides in from the right, same navigation pattern as MakerProfile over Discover
- Managed by `selectedConversation` state in App.tsx
- **Header:** Back arrow, maker avatar + name
- **Message list:** Scrollable, newest at bottom, grouped by date
  - Visitor messages: right-aligned, `theme.btnBg` background
  - Maker messages: left-aligned, `theme.surface` background
  - Timestamps below each message cluster
  - Scroll to top loads older messages (cursor pagination)
- **Input bar:** Text input + send button, pinned to bottom with safe area inset
  - Send button active only when input is non-empty
  - Client-side character count approaching 2,000 limit
- **Auto-scroll:** Scrolls to bottom on new message only if user is already at bottom. If scrolled up, shows a "New message" pill — tap to scroll down.

### Messages Tab

- New tab in TabBar between Saved and Profile
- Chat bubble icon with unread count badge
- **5 tabs on mobile:** At 430px max width, each tab gets 86px — comfortably above the 44px minimum touch target. Current TabBar height is 56px + safe area, which is sufficient.
- **Inbox list:** Conversations sorted by `updated_at` desc
  - Each row: maker avatar, maker name, `last_message_preview` (from conversations table), relative timestamp, unread dot
- **Empty state:** "No messages yet. Find a maker you love and say hello."
- Tapping a row opens Chat View

### Maker's View

- Same Messages tab, same Chat View components
- The only difference: their messages appear on the right (as responder)
- Determined by checking if the current user's conversations came via the maker side (visitor_id != auth.uid())

## Error Handling

- **Network failure:** Optimistic messages show red tint + tap to retry on INSERT failure
- **WebSocket disconnect:** Supabase client auto-reconnects. "Reconnecting..." banner after several failed attempts, disappears when restored.
- **Invalid input:** Send disabled on empty/whitespace. Body trimmed and capped at 2,000 chars (client + database CHECK).
- **Duplicate conversations:** Handled by `get_or_create_conversation` RPC — unique constraint + SELECT fallback.
- **Scroll behavior:** New messages auto-scroll only when at bottom. "New message" pill when scrolled up.
- **Read receipt timing:** Only mark read when `document.visibilityState === "visible"`
- **Unlinked makers:** Message button hidden when `maker.is_messageable` is false

## Out of Scope (v1)

- Typing indicators
- Online/offline presence
- Image/file attachments
- Message editing/deletion
- Blocking/reporting
- Push notifications / email notifications
- Group conversations
- Maker self-serve claiming flow (manual link for now)
- Conversations DELETE/UPDATE (immutable in v1)

## Testing

- Manual two-device testing: visitor account on one device, maker-linked account on another
- Both localhost (same network) and Vercel deploy work
- Verify: message delivery, optimistic UI, failure states, unread counts, read receipts, conversation creation, RLS enforcement, URL deep-linking, browser back navigation, cross-tab badge accuracy, message ordering with rapid sends
