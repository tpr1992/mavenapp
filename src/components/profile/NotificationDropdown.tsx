import { useTheme } from "../../contexts/ThemeContext"
import type { InboxItem } from "../../types"
import { font } from "../../styles/tokens"

interface NotificationDropdownProps {
    show: boolean
    onClose: () => void
    inboxItems: InboxItem[]
    userId: string
    onMessagesTap: () => void
}

export default function NotificationDropdown({
    show,
    onClose,
    inboxItems,
    userId,
    onMessagesTap,
}: NotificationDropdownProps) {
    const { isDark, theme } = useTheme()

    if (!show) return null

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
            <div
                style={{
                    position: "absolute",
                    top: 50,
                    right: 16,
                    left: 16,
                    maxHeight: 380,
                    overflowY: "auto",
                    background: theme.card,
                    borderRadius: 0,
                    boxShadow: isDark ? "0 8px 30px rgba(0,0,0,0.5)" : "0 8px 30px rgba(0,0,0,0.12)",
                    border: `1px solid ${theme.border}`,
                    zIndex: 200,
                    animation: "fadeSlideIn 0.15s ease",
                }}
            >
                <div style={{ padding: "14px 16px 6px" }}>
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 11,
                            fontWeight: 600,
                            color: theme.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                        }}
                    >
                        Recent Activity
                    </span>
                </div>
                {(() => {
                    const notifications: {
                        key: string
                        text: React.ReactNode
                        preview: string | null
                        time: string
                        unread: boolean
                        action: () => void
                    }[] = []

                    // Recent messages — show up to 5
                    inboxItems.slice(0, 5).forEach((item) => {
                        const isMakerView = item.visitor_id !== userId
                        const name = isMakerView ? item.visitor_name || "Someone" : item.maker_name
                        const diff = Date.now() - new Date(item.updated_at).getTime()
                        const mins = Math.floor(diff / 60000)
                        const time =
                            mins < 1
                                ? "now"
                                : mins < 60
                                  ? `${mins}m`
                                  : mins < 1440
                                    ? `${Math.floor(mins / 60)}h`
                                    : `${Math.floor(mins / 1440)}d`
                        const preview = item.last_message_preview

                        notifications.push({
                            key: item.conversation_id,
                            text: preview ? (
                                <>
                                    <strong>{name}</strong> sent you a message
                                </>
                            ) : (
                                <>
                                    <strong>{name}</strong> started a conversation
                                </>
                            ),
                            preview: preview || null,
                            time,
                            unread: item.unread_count > 0,
                            action: () => {
                                onClose()
                                onMessagesTap()
                            },
                        })
                    })

                    if (notifications.length === 0) {
                        return (
                            <div
                                style={{
                                    padding: "28px 16px",
                                    textAlign: "center",
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: font.body,
                                        fontSize: 13,
                                        color: theme.textMuted,
                                    }}
                                >
                                    No notifications yet
                                </span>
                            </div>
                        )
                    }

                    return notifications.map((n) => (
                        <div
                            key={n.key}
                            onClick={n.action}
                            style={{
                                padding: "14px 16px",
                                cursor: "pointer",
                                display: "flex",
                                gap: 10,
                            }}
                        >
                            {n.unread && (
                                <span
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "#22c55e",
                                        flexShrink: 0,
                                        marginTop: 6,
                                    }}
                                />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span
                                        style={{
                                            fontFamily: font.body,
                                            fontSize: 13.5,
                                            color: theme.text,
                                            flex: 1,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {n.text}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: font.body,
                                            fontSize: 11,
                                            color: theme.textMuted,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {n.time}
                                    </span>
                                </div>
                                {n.preview && (
                                    <p
                                        style={{
                                            fontFamily: font.body,
                                            fontSize: 12.5,
                                            color: theme.textMuted,
                                            margin: "3px 0 0",
                                            lineHeight: 1.3,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        &ldquo;{n.preview}&rdquo;
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                })()}
            </div>
        </>
    )
}
