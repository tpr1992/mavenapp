import type { Message, Theme } from "../../types"

interface MessageBubbleProps {
    message: Message
    isMine: boolean
    showStatus: boolean
    theme: Theme
    onRetry?: (id: string) => void
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

export default function MessageBubble({ message, isMine, showStatus, theme, onRetry }: MessageBubbleProps) {
    const status = isMine ? getStatus(message) : ""
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
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
            {isMine && showStatus && !message.failed && (
                <span
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        color: theme.textMuted,
                        marginTop: 2,
                        paddingRight: 2,
                    }}
                >
                    {status} {!message.pending && formatTime(message.created_at)}
                </span>
            )}
        </div>
    )
}
