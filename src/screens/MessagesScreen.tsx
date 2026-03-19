import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import InboxRow from "../components/messages/InboxRow"
import type { InboxItem } from "../types"
import { font } from "../styles/tokens"

interface MessagesScreenProps {
    items: InboxItem[]
    loading: boolean
    isMaker: boolean
    userId: string
    onConversationTap: (conversationId: string, makerId: string) => void
    onDelete: (conversationId: string) => void
    onLogoTap: () => void
}

export default function MessagesScreen({
    items,
    loading,
    isMaker,
    userId,
    onConversationTap,
    onDelete,
    onLogoTap,
}: MessagesScreenProps) {
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
                        fontFamily: font.wordmark,
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

            <div style={{ padding: "4px 16px 12px" }}>
                <h2
                    style={{
                        fontFamily: font.body,
                        fontSize: 22,
                        fontWeight: 700,
                        color: theme.text,
                        margin: 0,
                    }}
                >
                    Inbox
                </h2>
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
                            fontFamily: font.body,
                            fontSize: 15,
                            color: theme.textSecondary,
                            lineHeight: 1.5,
                            whiteSpace: "pre-line",
                        }}
                    >
                        {isMaker
                            ? "No messages yet.\nWhen visitors reach out, their messages will appear here."
                            : "No messages yet.\nFind a maker you love and say hello."}
                    </p>
                </div>
            ) : (
                <div style={{ animation: "fadeIn 0.15s ease" }}>
                    {items.map((item) => (
                        <InboxRow
                            key={item.conversation_id}
                            item={item}
                            userId={userId}
                            theme={theme}
                            onTap={(id) => onConversationTap(id, item.maker_id)}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
