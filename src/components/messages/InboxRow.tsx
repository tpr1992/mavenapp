import { useRef, useState, useCallback } from "react"
import MakerAvatar from "../ui/MakerAvatar"
import type { InboxItem, Theme } from "../../types"

interface InboxRowProps {
    item: InboxItem
    userId: string
    theme: Theme
    onTap: (conversationId: string) => void
    onDelete: (conversationId: string) => void
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

const ACTION_WIDTH = 72

export default function InboxRow({ item, userId, theme, onTap, onDelete }: InboxRowProps) {
    const hasUnread = item.unread_count > 0
    const isMakerView = item.visitor_id !== userId
    const displayName = isMakerView ? item.visitor_name || "Visitor" : item.maker_name
    const avatarName = isMakerView ? item.visitor_name || "Visitor" : item.maker_name
    const avatarUrl = isMakerView ? null : item.maker_avatar_url

    const [confirming, setConfirming] = useState(false)

    const rowRef = useRef<HTMLDivElement>(null)
    const currentOffset = useRef(0)
    const startX = useRef(0)
    const startY = useRef(0)
    const startOffset = useRef(0)
    const direction = useRef<"h" | "v" | null>(null)
    const tracking = useRef(false)
    const velocityRef = useRef(0)
    const lastX = useRef(0)
    const lastTime = useRef(0)
    const animFrame = useRef(0)

    const setX = useCallback((x: number) => {
        currentOffset.current = x
        if (animFrame.current) return
        animFrame.current = requestAnimationFrame(() => {
            animFrame.current = 0
            const el = rowRef.current
            if (el) el.style.transform = `translateX(${currentOffset.current}px)`
        })
    }, [])

    const animateTo = useCallback((target: number, bounce: boolean) => {
        const el = rowRef.current
        if (!el) return

        if (bounce) {
            // Spring with overshoot
            el.style.transition = "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)"
        } else {
            // Smooth ease-out
            el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        }
        el.style.transform = `translateX(${target}px)`
        currentOffset.current = target
    }, [])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const el = rowRef.current
        if (el) el.style.transition = "none"
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        startOffset.current = currentOffset.current
        direction.current = null
        tracking.current = false
        velocityRef.current = 0
        lastX.current = e.touches[0].clientX
        lastTime.current = performance.now()
    }, [])

    // Use native touchmove with { passive: false } so we can preventDefault to block scroll
    const touchMoveHandler = useRef<((e: TouchEvent) => void) | null>(null)
    if (!touchMoveHandler.current) {
        touchMoveHandler.current = (e: TouchEvent) => {
            const x = e.touches[0].clientX
            const dx = x - startX.current
            const dy = e.touches[0].clientY - startY.current

            if (!direction.current) {
                if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.2) {
                    direction.current = "v"
                    return
                }
                if (Math.abs(dx) > 6) {
                    direction.current = "h"
                    tracking.current = true
                }
                return
            }
            if (direction.current === "v") return

            e.preventDefault()

            const now = performance.now()
            const dt = Math.max(now - lastTime.current, 1)
            velocityRef.current = velocityRef.current * 0.4 + ((x - lastX.current) / dt) * 0.6
            lastX.current = x
            lastTime.current = now

            let raw = startOffset.current + dx
            // Can't swipe right past 0
            if (raw > 0) raw = 0
            // Rubber band past the action width — resistance increases the further you pull
            if (raw < -ACTION_WIDTH) {
                const over = -raw - ACTION_WIDTH
                raw = -(ACTION_WIDTH + over * 0.25)
            }
            setX(raw)
        }
    }

    // Attach native touchmove listener
    const attachRef = useCallback((el: HTMLDivElement | null) => {
        const prev = rowRef.current
        if (prev && touchMoveHandler.current) {
            prev.removeEventListener("touchmove", touchMoveHandler.current)
        }
        rowRef.current = el
        if (el && touchMoveHandler.current) {
            el.addEventListener("touchmove", touchMoveHandler.current, { passive: false })
        }
    }, [])

    const handleTouchEnd = useCallback(() => {
        if (!tracking.current) return
        const v = velocityRef.current
        const x = currentOffset.current

        // Velocity-based snap
        if (v < -0.4) {
            // Fast swipe left → snap open with bounce
            animateTo(-ACTION_WIDTH, true)
        } else if (v > 0.4) {
            // Fast swipe right → snap closed with bounce
            animateTo(0, true)
        } else if (x < -ACTION_WIDTH * 0.4) {
            // Past 40% threshold → snap open
            animateTo(-ACTION_WIDTH, false)
        } else {
            // Below threshold → snap closed
            animateTo(0, false)
        }
    }, [animateTo])

    return (
        <>
            <div style={{ position: "relative", overflow: "hidden" }}>
                {/* Delete action — always visible behind the row */}
                <div
                    onClick={() => setConfirming(true)}
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: ACTION_WIDTH,
                        background: "#e53e3e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </div>

                {/* Swipeable row */}
                <div
                    ref={attachRef}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                        if (Math.abs(currentOffset.current) > 5) {
                            animateTo(0, false)
                        } else {
                            onTap(item.conversation_id)
                        }
                    }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${theme.border}`,
                        background: theme.bg,
                        position: "relative",
                        zIndex: 1,
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                    }}
                >
                    <MakerAvatar maker={{ name: avatarName, avatar_url: avatarUrl }} size={44} />
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
                                {displayName}
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
                                        background: "#22c55e",
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {confirming && (
                <div
                    onClick={() => setConfirming(false)}
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
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 15,
                                fontWeight: 600,
                                color: theme.text,
                                margin: "0 0 8px",
                            }}
                        >
                            Delete conversation?
                        </p>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13.5,
                                color: theme.textSecondary,
                                lineHeight: 1.5,
                                margin: "0 0 20px",
                            }}
                        >
                            This will permanently delete all messages in this conversation.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => {
                                    setConfirming(false)
                                }}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 0,
                                    border: `1px solid ${theme.border}`,
                                    background: theme.card,
                                    color: theme.text,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConfirming(false)
                                    animateTo(0, false)
                                    onDelete(item.conversation_id)
                                }}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 0,
                                    border: "none",
                                    background: "#c53030",
                                    color: "#fff",
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
