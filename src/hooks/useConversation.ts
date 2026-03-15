import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import type { Message } from "../types"
import { filterProfanity } from "../utils/profanity"

const PAGE_SIZE = 30

interface UseConversationOptions {
    conversationId?: string | null
    makerId?: string | null
    onConversationCreated?: (conversationId: string) => void
}

export default function useConversation({ conversationId, makerId, onConversationCreated }: UseConversationOptions) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const fetchedRef = useRef(false)
    const cursorRef = useRef<{ time: string; id: string } | null>(null)
    const activeConvId = useRef(conversationId ?? null)

    // Keep ref in sync
    useEffect(() => {
        activeConvId.current = conversationId ?? null
    }, [conversationId])

    // Cached user ID to avoid repeated getUser() API calls
    const userIdRef = useRef<string | null>(null)

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

    // Fetch initial messages via RPC
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
        supabase.rpc("get_messages", { p_conversation_id: conversationId }).then(({ data, error }) => {
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

    // Load older messages
    const loadMore = useCallback(async () => {
        const cid = activeConvId.current
        if (!cid || !hasMore || loading) return
        const cursor = cursorRef.current
        if (!cursor) return

        setLoading(true)
        const { data, error } = await supabase.rpc("get_messages", {
            p_conversation_id: cid,
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
    }, [hasMore, loading])

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
                        const optimisticIdx = prev.findIndex(
                            (m) => m.pending && m.body === newMsg.body && m.sender_id === newMsg.sender_id,
                        )
                        if (optimisticIdx >= 0) {
                            const updated = [...prev]
                            updated[optimisticIdx] = newMsg
                            return updated
                        }
                        if (prev.some((m) => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const updated = payload.new as Message
                    setMessages((prev) =>
                        prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m)),
                    )
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    // Send message — creates conversation lazily on first send if in draft mode
    const sendMessage = useCallback(
        async (body: string) => {
            const trimmed = body.trim()
            if (!trimmed || trimmed.length > 2000) return

            const filtered = filterProfanity(trimmed)

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

            // Create conversation if we're in draft mode (no conversationId yet)
            let cid = activeConvId.current
            if (!cid && makerId) {
                const { data, error } = await supabase.rpc("get_or_create_conversation", { p_maker_id: makerId })
                if (error || !data) {
                    console.error("get_or_create_conversation:", error?.message)
                    return
                }
                cid = data as string
                activeConvId.current = cid
                onConversationCreated?.(cid)
            }
            if (!cid) return

            const optimistic: Message = {
                id: crypto.randomUUID(),
                conversation_id: cid,
                sender_id: userId,
                body: filtered,
                created_at: new Date().toISOString(),
                delivered_at: null,
                read_at: null,
                pending: true,
            }

            setMessages((prev) => [...prev, optimistic])

            const { data: inserted, error } = await supabase
                .from("messages")
                .insert({
                    conversation_id: cid,
                    sender_id: userId,
                    body: filtered,
                })
                .select("id, delivered_at")
                .single()

            if (error) {
                console.error("send message:", error.message)
                setMessages((prev) =>
                    prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m)),
                )
            } else if (inserted) {
                // Server confirmed — delivered_at is set by database DEFAULT
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === optimistic.id
                            ? { ...m, id: inserted.id, pending: false, delivered_at: inserted.delivered_at }
                            : m,
                    ),
                )
            }
        },
        [makerId, onConversationCreated],
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

    // Mark as read — direct UPDATE so Realtime broadcasts the change to the sender
    const markRead = useCallback(async () => {
        const cid = activeConvId.current
        if (!cid || document.visibilityState !== "visible") return

        let uid = userIdRef.current
        if (!uid) {
            const { data: userData } = await supabase.auth.getUser()
            uid = userData?.user?.id ?? null
            userIdRef.current = uid
        }
        if (!uid) return

        // Direct UPDATE goes through RLS → Realtime sees it → sender gets the update
        await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("conversation_id", cid)
            .neq("sender_id", uid)
            .is("read_at", null)

        // Reset unread counter AFTER the update commits — self-healing recalculation
        await supabase.rpc("mark_conversation_read", { p_conversation_id: cid })
    }, [])

    return { messages, loading, hasMore, loadMore, sendMessage, retryMessage, markRead }
}
