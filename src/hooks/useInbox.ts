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

    // Listen for new conversations (catches first message from a new visitor to a maker)
    useEffect(() => {
        if (!userId) return
        const channel = supabase
            .channel("inbox:new-conversations")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => {
                // A new conversation was created — refetch inbox to pick it up
                fetchInbox()
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, fetchInbox])

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
                        const isFromOther = msg.sender_id !== userId
                        setItems((prev) =>
                            prev
                                .map((it) =>
                                    it.conversation_id === item.conversation_id
                                        ? {
                                              ...it,
                                              last_message_preview: msg.body.slice(0, 100),
                                              updated_at: msg.created_at,
                                              unread_count: isFromOther ? it.unread_count + 1 : it.unread_count,
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
        setItems((prev) => prev.map((it) => (it.conversation_id === conversationId ? { ...it, unread_count: 0 } : it)))
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
            return prev
        })
    }, [])

    const deleteConversation = useCallback(async (conversationId: string) => {
        // Optimistically remove from local state
        setItems((prev) => prev.filter((it) => it.conversation_id !== conversationId))
        // Delete messages first (FK constraint), then conversation
        await supabase.from("messages").delete().eq("conversation_id", conversationId)
        await supabase.from("conversations").delete().eq("id", conversationId)
    }, [])

    return { items, loading, totalUnread, clearUnread, updateItem, deleteConversation, refetch: fetchInbox }
}
