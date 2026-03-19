import { useEffect, useRef, useCallback, useState } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import useConversation from "../../hooks/useConversation"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"
import MakerAvatar from "../ui/MakerAvatar"
import type { Maker } from "../../types"
import { font } from "../../styles/tokens"

interface ChatViewProps {
    conversationId?: string | null
    makerId: string
    maker: Maker
    userId: string
    onBack: () => void
    onMakerTap: (maker: Maker) => void
    onRead: (conversationId: string) => void
    onConversationCreated?: (conversationId: string) => void
}

export default function ChatView({
    conversationId,
    makerId,
    maker,
    userId,
    onBack,
    onMakerTap,
    onRead,
    onConversationCreated,
}: ChatViewProps) {
    const { theme, isDark } = useTheme()
    const { messages, loading, hasMore, loadMore, sendMessage, retryMessage, toggleLike, markRead } = useConversation({
        conversationId,
        makerId,
        onConversationCreated,
    })
    const scrollRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const scrollBtnRef = useRef<HTMLDivElement>(null)
    const scrollBtnVisible = useRef(false)
    const [keyboardHeight, setKeyboardHeight] = useState(0)
    const [reportModal, setReportModal] = useState<{ messageId: string } | null>(null)
    const [reportReason, setReportReason] = useState<string | null>(null)
    const prevCountRef = useRef(0)
    const initialScrollDone = useRef(false)

    const handleLongPress = useCallback((_messageId: string, action: "like" | "report") => {
        if (action === "report") {
            setReportModal({ messageId: _messageId })
            setReportReason(null)
        }
    }, [])

    const [reportToast, setReportToast] = useState(false)
    const handleReport = useCallback(() => {
        if (!reportModal || !reportReason) return
        console.log("Report:", { messageId: reportModal.messageId, reason: reportReason })
        setReportModal(null)
        setReportReason(null)
        setReportToast(true)
        setTimeout(() => setReportToast(false), 3000)
    }, [reportModal, reportReason])

    // ── Scroll helpers ──
    const scrollToBottom = useCallback((smooth = false) => {
        const el = bottomRef.current
        if (el) el.scrollIntoView(smooth ? { behavior: "smooth", block: "end" } : { block: "end" })
    }, [])

    const _isNearBottom = useCallback(() => {
        const el = scrollRef.current
        if (!el) return true
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }, [])

    const scrollBtnLocked = useRef(false)

    const showScrollBtn = useCallback(() => {
        const el = scrollBtnRef.current
        if (!el || scrollBtnVisible.current || scrollBtnLocked.current) return
        scrollBtnVisible.current = true
        el.style.transition =
            "opacity 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        el.style.opacity = "1"
        el.style.transform = "translateY(0) scale(1)"
        el.style.pointerEvents = "auto"
    }, [])

    const hideScrollBtn = useCallback((lock = false) => {
        const el = scrollBtnRef.current
        if (!el || !scrollBtnVisible.current) return
        scrollBtnVisible.current = false
        if (lock) {
            scrollBtnLocked.current = true
            setTimeout(() => {
                scrollBtnLocked.current = false
            }, 600)
        }
        el.style.transition = "opacity 0.2s ease-out, transform 0.2s ease-out"
        el.style.opacity = "0"
        el.style.transform = "translateY(6px) scale(0.9)"
        el.style.pointerEvents = "none"
    }, [])

    // ── Keyboard tracking via visualViewport ──
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
        if (keyboardHeight > 0) scrollToBottom()
    }, [keyboardHeight, scrollToBottom])

    // ── Prevent body scroll ──
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

    // ── Keyboard dismiss on scroll down ──
    // Use native touchmove so we get consistent events even during iOS scroll
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        let startY = 0
        let dismissed = false

        const onTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY
            dismissed = false
        }
        const onTouchMove = (e: TouchEvent) => {
            if (dismissed) return
            const dy = e.touches[0].clientY - startY
            // Finger moving up = scrolling content down = dismiss keyboard
            if (dy < -30 && keyboardHeight > 0) {
                if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                dismissed = true
            }
        }
        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("touchmove", onTouchMove, { passive: true })
        return () => {
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("touchmove", onTouchMove)
        }
    }, [keyboardHeight])

    // ── Mark as read ──
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

    // Mark read when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && conversationId && document.visibilityState === "visible") {
            markRead()
            onRead(conversationId)
        }
    }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Scroll to bottom: ensures messages start at bottom ──
    const forceScrollBottom = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
        requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            initialScrollDone.current = true
        })
    }, [])

    // On initial load complete — scroll to bottom
    const wasLoading = useRef(true)
    useEffect(() => {
        if (wasLoading.current && !loading && messages.length > 0) {
            forceScrollBottom()
        }
        wasLoading.current = loading
    }, [loading, messages.length, forceScrollBottom])

    // On new messages while near bottom — auto-scroll
    useEffect(() => {
        if (messages.length > prevCountRef.current && initialScrollDone.current) {
            const el = scrollRef.current
            if (el) {
                const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                if (nearBottom) {
                    requestAnimationFrame(() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                    })
                }
            }
        }
        prevCountRef.current = messages.length
    }, [messages.length])

    // Reset on conversation change
    useEffect(() => {
        initialScrollDone.current = false
        wasLoading.current = true
    }, [conversationId])

    // ── Scroll handler: scroll-to-bottom button + load more ──
    const loadMoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el || !initialScrollDone.current) return

        const scrollable = el.scrollHeight - el.clientHeight
        // No scrollable content — never show button
        if (scrollable < 10) {
            hideScrollBtn()
            return
        }

        // Ignore overscroll: scrollTop < 0 (top bounce) or scrollTop > scrollable (bottom bounce)
        if (el.scrollTop < 0 || el.scrollTop > scrollable + 5) return

        const distFromBottom = scrollable - el.scrollTop

        // Show button only when user has scrolled up significantly (400px ≈ 3+ messages)
        if (distFromBottom > 400) {
            showScrollBtn()
        } else if (distFromBottom < 80) {
            // Near bottom — hide button
            hideScrollBtn()
        }

        // Load more — debounced to avoid interrupting momentum scroll
        if (el.scrollTop < 100 && hasMore && !loading) {
            if (loadMoreTimer.current) clearTimeout(loadMoreTimer.current)
            loadMoreTimer.current = setTimeout(() => {
                const prevHeight = el.scrollHeight
                loadMore().then(() => {
                    requestAnimationFrame(() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight
                        }
                    })
                })
            }, 150)
        }
    }, [hasMore, loading, loadMore, showScrollBtn, hideScrollBtn])

    const blurInput = useCallback(() => {
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
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                onClick={blurInput}
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
                    onClick={(e) => {
                        e.stopPropagation()
                        onBack()
                    }}
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
                <div
                    onClick={() => onMakerTap(maker)}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, minWidth: 0 }}
                >
                    <MakerAvatar maker={maker} size={32} />
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 15,
                            fontWeight: 600,
                            color: theme.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {maker.name}
                    </span>
                </div>
            </div>

            {/* Message list */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    padding: "12px 0",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    position: "relative",
                }}
            >
                {/* Spacer pushes messages to bottom when content is shorter than container */}
                <div style={{ flex: 1 }} />
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
                        const isLastInRun = !next || next.sender_id !== msg.sender_id
                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMine={isMine}
                                showStatus={isMine && isLastInRun}
                                theme={theme}
                                userId={userId}
                                onRetry={retryMessage}
                                onLongPress={handleLongPress}
                                onDoubleTap={(messageId) => toggleLike(messageId, userId)}
                            />
                        )
                    })}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Scroll to bottom button — always mounted, visibility controlled via ref */}
            <div
                ref={scrollBtnRef}
                onClick={() => {
                    hideScrollBtn(true)
                    scrollToBottom(true)
                }}
                style={{
                    position: "absolute",
                    bottom: 70,
                    left: "50%",
                    marginLeft: -18,
                    width: 36,
                    height: 36,
                    borderRadius: 0,
                    background: theme.card,
                    border: `1px solid ${theme.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10,
                    opacity: 0,
                    transform: "translateY(6px) scale(0.9)",
                    pointerEvents: "none",
                    willChange: "opacity, transform",
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.text}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m7 13 5 5 5-5" />
                    <path d="M12 6v12" />
                </svg>
            </div>

            {/* Report confirmation toast */}
            {reportToast && (
                <div
                    style={{
                        padding: "10px 16px",
                        background: theme.surface,
                        borderTop: `1px solid ${theme.border}`,
                        flexShrink: 0,
                        animation: "fadeIn 0.15s ease",
                    }}
                >
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 13,
                            color: theme.textSecondary,
                        }}
                    >
                        Report submitted. We'll review it shortly.
                    </span>
                </div>
            )}

            <ChatInput onSend={sendMessage} theme={theme} isDark={isDark} />

            {/* Report modal */}
            {reportModal && (
                <div
                    onClick={() => {
                        setReportModal(null)
                        setReportReason(null)
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        zIndex: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: theme.card,
                            borderRadius: 0,
                            padding: "28px 24px",
                            maxWidth: 320,
                            width: "100%",
                            textAlign: "center",
                        }}
                    >
                        <p
                            style={{
                                fontFamily: font.body,
                                fontSize: 15,
                                fontWeight: 600,
                                color: theme.text,
                                margin: "0 0 16px",
                            }}
                        >
                            Report this message?
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                            {(["Spam", "Harassment", "Inappropriate content", "Other"] as const).map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setReportReason(reason)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 0,
                                        border: `1px solid ${reportReason === reason ? theme.btnBg : theme.border}`,
                                        background: reportReason === reason ? theme.btnBg : "transparent",
                                        color: reportReason === reason ? theme.btnText : theme.text,
                                        fontFamily: font.body,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
                                    }}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => {
                                    setReportModal(null)
                                    setReportReason(null)
                                }}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 0,
                                    border: `1px solid ${theme.border}`,
                                    background: theme.card,
                                    color: theme.text,
                                    fontFamily: font.body,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReport}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 0,
                                    border: "none",
                                    background: reportReason ? theme.btnBg : theme.border,
                                    color: reportReason ? theme.btnText : theme.textMuted,
                                    fontFamily: font.body,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: reportReason ? "pointer" : "default",
                                    transition: "background 0.15s ease, color 0.15s ease",
                                }}
                            >
                                Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
