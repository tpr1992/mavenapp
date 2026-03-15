import { useEffect, useRef, useCallback, useState } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import useConversation from "../../hooks/useConversation"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"
import MakerAvatar from "../ui/MakerAvatar"
import type { Maker } from "../../types"

interface ChatViewProps {
    conversationId?: string | null
    makerId: string
    maker: Maker
    userId: string
    onBack: () => void
    onRead: (conversationId: string) => void
    onConversationCreated?: (conversationId: string) => void
}

export default function ChatView({
    conversationId,
    makerId,
    maker,
    userId,
    onBack,
    onRead,
    onConversationCreated,
}: ChatViewProps) {
    const { theme, isDark } = useTheme()
    const { messages, loading, hasMore, loadMore, sendMessage, retryMessage, markRead } = useConversation({
        conversationId,
        makerId,
        onConversationCreated,
    })
    const scrollRef = useRef<HTMLDivElement>(null)
    const isAtBottom = useRef(true)
    const prevCountRef = useRef(0)
    const [keyboardHeight, setKeyboardHeight] = useState(0)

    // Track iOS virtual keyboard via visualViewport
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        const onResize = () => {
            const kbH = window.innerHeight - vv.height
            setKeyboardHeight(kbH > 50 ? kbH : 0)
        }
        vv.addEventListener("resize", onResize)
        return () => vv.removeEventListener("resize", onResize)
    }, [])

    // Scroll to bottom when keyboard opens
    useEffect(() => {
        if (keyboardHeight > 0) {
            const el = scrollRef.current
            if (el)
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight
                }, 50)
        }
    }, [keyboardHeight])

    // Prevent body scroll while chat is open
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

    useEffect(() => {
        if (!conversationId) return
        markRead()
        onRead(conversationId)

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                markRead()
                if (conversationId) onRead(conversationId)
            }
        }
        // Also mark read on any user interaction (tap, scroll) — catches cases where
        // the chat is already open and new messages arrive
        const onInteraction = () => {
            if (document.visibilityState === "visible") markRead()
        }
        document.addEventListener("visibilitychange", onVisibility)
        document.addEventListener("touchstart", onInteraction, { passive: true })
        document.addEventListener("click", onInteraction)
        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
            document.removeEventListener("touchstart", onInteraction)
            document.removeEventListener("click", onInteraction)
        }
    }, [conversationId, markRead, onRead])

    // Mark read when new messages arrive while chat is visible
    useEffect(() => {
        if (messages.length > 0 && conversationId && document.visibilityState === "visible") {
            markRead()
            onRead(conversationId)
        }
    }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > prevCountRef.current) {
            const el = scrollRef.current
            if (el && isAtBottom.current) {
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight
                }, 20)
            }
        }
        prevCountRef.current = messages.length
    }, [messages.length])

    // Initial scroll to bottom after first load
    useEffect(() => {
        if (!loading && messages.length > 0) {
            const el = scrollRef.current
            if (el)
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight
                }, 20)
        }
    }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        // Dismiss keyboard on scroll
        if (
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement
        ) {
            document.activeElement.blur()
        }
        isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        if (el.scrollTop < 60 && hasMore && !loading) {
            const prevHeight = el.scrollHeight
            loadMore().then(() => {
                requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight
                    }
                })
            })
        }
    }, [hasMore, loading, loadMore])

    // Tap on message area dismisses keyboard
    const handleAreaTap = useCallback(() => {
        if (
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement
        ) {
            document.activeElement.blur()
        }
    }, [])

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: keyboardHeight,
                zIndex: 100,
                background: theme.bg,
                display: "flex",
                flexDirection: "column",
                maxWidth: "var(--app-max-width)",
                margin: "0 auto",
                transition: "bottom 0.15s ease",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
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
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
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

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                onClick={handleAreaTap}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "12px 0",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    minHeight: 0,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                    {messages.map((msg, i) => {
                        const isMine = msg.sender_id === userId
                        const next = messages[i + 1]
                        // Show status only on the last message in a consecutive run from the same sender
                        const isLastInRun = !next || next.sender_id !== msg.sender_id
                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMine={isMine}
                                showStatus={isMine && isLastInRun}
                                theme={theme}
                                onRetry={retryMessage}
                            />
                        )
                    })}
                </div>
            </div>

            <ChatInput onSend={sendMessage} theme={theme} isDark={isDark} />
        </div>
    )
}
