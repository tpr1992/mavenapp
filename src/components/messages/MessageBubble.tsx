import { useRef, useCallback, useState } from "react"
import type { Message, Theme } from "../../types"
import { font } from "../../styles/tokens"

interface MessageBubbleProps {
    message: Message
    isMine: boolean
    showStatus: boolean
    theme: Theme
    userId: string
    onRetry?: (id: string) => void
    onLongPress?: (messageId: string, action: "like" | "report") => void
    onDoubleTap?: (messageId: string) => void
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function getStatus(message: Message): string {
    if (message.failed) return ""
    if (message.pending) return "Sending"
    if (message.read_at) return "Read"
    return "Sent"
}

export default function MessageBubble({
    message,
    isMine,
    showStatus,
    theme,
    userId,
    onRetry,
    onLongPress,
    onDoubleTap,
}: MessageBubbleProps) {
    const status = isMine ? getStatus(message) : ""
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const didMove = useRef(false)
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [animating, setAnimating] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const likedByMe = message.liked_by?.includes(userId) ?? false
    const likeCount = message.liked_by?.length ?? 0

    const clearLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }, [])

    const handleTouchStart = useCallback(() => {
        didMove.current = false
        longPressTimer.current = setTimeout(() => {
            longPressTimer.current = null
            if (!didMove.current) {
                setShowMenu(true)
            }
        }, 500)
    }, [])

    const handleTouchMove = useCallback(() => {
        didMove.current = true
        clearLongPress()
    }, [clearLongPress])

    const handleTouchEnd = useCallback(() => {
        clearLongPress()
    }, [clearLongPress])

    const handleClick = useCallback(() => {
        if (showMenu) return
        if (isMine) {
            // Can't like own messages — single tap retries failed
            if (message.failed && onRetry) onRetry(message.id)
            return
        }
        if (tapTimerRef.current !== null) {
            clearTimeout(tapTimerRef.current)
            tapTimerRef.current = null
            onDoubleTap?.(message.id)
            setAnimating(true)
            setTimeout(() => setAnimating(false), 400)
        } else {
            tapTimerRef.current = setTimeout(() => {
                tapTimerRef.current = null
            }, 300)
        }
    }, [isMine, message.id, message.failed, onDoubleTap, onRetry, showMenu])

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
                padding: "2px 16px",
                position: "relative",
            }}
        >
            {/* Bubble + heart wrapper */}
            <div style={{ position: "relative", maxWidth: "75%" }}>
                <div
                    onClick={handleClick}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 0,
                        borderBottomRightRadius: isMine ? 4 : 18,
                        borderBottomLeftRadius: isMine ? 18 : 4,
                        background: isMine ? theme.btnBg : theme.surface,
                        color: isMine ? theme.btnText : theme.text,
                        fontFamily: font.body,
                        fontSize: 14,
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        opacity: message.pending ? 0.6 : 1,
                        cursor: message.failed ? "pointer" : "default",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        WebkitTouchCallout: "none",
                        marginBottom: 0,
                    }}
                >
                    {message.body}
                    {message.failed && (
                        <div
                            style={{
                                fontFamily: font.body,
                                fontSize: 11,
                                color: "#e53e3e",
                                marginTop: 4,
                            }}
                        >
                            Failed to send · Tap to retry
                        </div>
                    )}
                </div>

                {/* Heart — anchored to bottom corner of bubble (iMessage style) */}
                {likeCount > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: -6,
                            ...(isMine ? { left: -2 } : { right: -2 }),
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            background: theme.bg,
                            borderRadius: 0,
                            padding: "2px 4px",
                            border: `1px solid ${theme.border}`,
                            animation: animating ? "heartPop 0.4s ease" : "none",
                            pointerEvents: "none",
                        }}
                    >
                        <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="#fc8181"
                            stroke="#fc8181"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                        </svg>
                        {likeCount > 1 && (
                            <span
                                style={{
                                    fontFamily: font.body,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    color: "#fc8181",
                                }}
                            >
                                {likeCount}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Status */}
            {isMine && showStatus && !message.failed && (
                <span
                    style={{
                        fontFamily: font.body,
                        fontSize: 10,
                        color: theme.textMuted,
                        marginTop: 2,
                        paddingRight: 2,
                    }}
                >
                    {status} {!message.pending && formatTime(message.created_at)}
                </span>
            )}

            {/* Context menu — small popover on long-press */}
            {showMenu && (
                <>
                    <div
                        onClick={() => setShowMenu(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 199,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: "100%",
                            ...(isMine ? { right: 0 } : { left: 0 }),
                            marginBottom: 4,
                            background: theme.card,
                            borderRadius: 0,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            border: `1px solid ${theme.border}`,
                            overflow: "hidden",
                            zIndex: 200,
                            minWidth: 140,
                        }}
                    >
                        {!isMine && (
                            <div
                                onClick={() => {
                                    setShowMenu(false)
                                    onDoubleTap?.(message.id)
                                    setAnimating(true)
                                    setTimeout(() => setAnimating(false), 400)
                                }}
                                style={{
                                    padding: "11px 16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    cursor: "pointer",
                                    borderBottom: `1px solid ${theme.border}`,
                                    fontFamily: font.body,
                                    fontSize: 14,
                                    color: theme.text,
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill={likedByMe ? "#fc8181" : "none"}
                                    stroke={likedByMe ? "#fc8181" : "currentColor"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                                </svg>
                                {likedByMe ? "Unlike" : "Like"}
                            </div>
                        )}
                        <div
                            onClick={() => {
                                setShowMenu(false)
                                onLongPress?.(message.id, "report")
                            }}
                            style={{
                                padding: "11px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                fontFamily: font.body,
                                fontSize: 14,
                                color: "#e53e3e",
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                <line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                            Report
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
