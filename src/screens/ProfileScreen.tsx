import { useState, useEffect, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import AuthForm from "../components/profile/AuthForm"
import ProfileSettings from "../components/profile/ProfileSettings"
import AboutModal from "../components/profile/AboutModal"
import type { Maker, InboxItem } from "../types"

interface ProfileScreenProps {
    isDebug: boolean
    toggleDebug: () => void
    makers: Maker[]
    refetch: () => void
    feedLayout: "grid" | "single"
    setFeedLayout: (layout: "grid" | "single") => void
    onLogoTap: () => void
    profileName: string
    unreadMessages: number
    inboxItems: InboxItem[]
    userId: string
    onSavedTap: () => void
    onMessagesTap: () => void
}

export default function ProfileScreen({
    isDebug,
    toggleDebug,
    makers,
    refetch,
    feedLayout,
    setFeedLayout,
    onLogoTap,
    profileName,
    unreadMessages,
    inboxItems,
    userId,
    onSavedTap,
    onMessagesTap,
}: ProfileScreenProps) {
    const { user, loading, signOut } = useAuth()
    const { isDark, theme, toggleTheme } = useTheme()
    const [showAbout, setShowAbout] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [welcomeToast, setWelcomeToast] = useState("")
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showWelcomeToast = (msg: string) => {
        setWelcomeToast(msg)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setWelcomeToast(""), 3000)
    }

    const handleSignOut = async () => {
        await signOut()
        showWelcomeToast("Signed out")
    }

    const initial = profileName ? profileName[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || ""

    const SETTINGS_ITEMS = [{ label: "About maven", action: () => setShowAbout(true) }]

    return (
        <div
            style={{
                minHeight: "calc(100vh - 64px - env(safe-area-inset-bottom, 0px))",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Helmet>
                <title>Profile — maven</title>
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
                        fontFamily: "'Playfair Display', serif",
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
            <div style={{ animation: "fadeIn 0.15s ease" }}>
                <div style={{ padding: "18px 16px 14px" }}>
                    {/* Welcome / sign-out toast */}
                    <div
                        style={{
                            overflow: "hidden",
                            maxHeight: welcomeToast ? 60 : 0,
                            opacity: welcomeToast ? 1 : 0,
                            marginBottom: welcomeToast ? 16 : 0,
                            transition: "max-height 0.35s ease, opacity 0.3s ease, margin-bottom 0.35s ease",
                        }}
                    >
                        <div
                            style={{
                                background: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: 14,
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <span
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 13,
                                    flexShrink: 0,
                                }}
                            >
                                {welcomeToast === "Signed out" ? "\u2713" : "\u2728"}
                            </span>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13.5,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                {welcomeToast}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ marginBottom: 20, padding: "8px 0" }}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: theme.surface,
                                }}
                            />
                        </div>
                    ) : user ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                marginBottom: 20,
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: theme.btnBg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: theme.btnText,
                                    fontFamily: "'DM Sans', sans-serif",
                                    flexShrink: 0,
                                }}
                            >
                                {initial}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {profileName && (
                                    <p
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: theme.text,
                                            margin: 0,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {profileName}
                                    </p>
                                )}
                                <p
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12.5,
                                        color: theme.textMuted,
                                        margin: 0,
                                        lineHeight: 1.4,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {user.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowNotifications((v) => !v)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: theme.text,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    padding: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
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
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                                {unreadMessages > 0 && (
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: 2,
                                            right: 2,
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: "#22c55e",
                                            border: `2px solid ${theme.bg}`,
                                        }}
                                    />
                                )}
                            </button>
                        </div>
                    ) : (
                        <AuthForm onWelcomeToast={showWelcomeToast} />
                    )}

                    {user && (
                        <>
                            <div
                                onClick={onSavedTap}
                                style={{
                                    padding: "15px 0",
                                    borderBottom: `1px solid ${theme.border}`,
                                    cursor: "pointer",
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 14.5,
                                        fontWeight: 500,
                                        color: theme.text,
                                    }}
                                >
                                    Favourites
                                </span>
                            </div>
                            <div
                                onClick={onMessagesTap}
                                style={{
                                    padding: "15px 0",
                                    borderBottom: `1px solid ${theme.border}`,
                                    cursor: "pointer",
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 14.5,
                                        fontWeight: 500,
                                        color: theme.text,
                                    }}
                                >
                                    Messages
                                </span>
                            </div>
                        </>
                    )}

                    <ProfileSettings
                        isDark={isDark}
                        toggleTheme={toggleTheme}
                        feedLayout={feedLayout}
                        setFeedLayout={setFeedLayout}
                        isDebug={isDebug}
                        toggleDebug={toggleDebug}
                        makers={makers}
                        refetch={refetch}
                        theme={theme}
                        settingsItems={SETTINGS_ITEMS}
                    />
                </div>
                {user && (
                    <div style={{ padding: "24px 16px 0" }}>
                        <button
                            onClick={handleSignOut}
                            style={{
                                width: "100%",
                                padding: "12px 0",
                                borderRadius: 10,
                                border: "none",
                                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                color: theme.textMuted,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13.5,
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                )}

                <div style={{ paddingTop: 24, paddingBottom: 24, textAlign: "center" }}>
                    <span
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 18,
                            fontWeight: 700,
                            color: theme.textMuted,
                        }}
                    >
                        maven
                    </span>
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: theme.textMuted,
                            margin: "4px 0 0",
                        }}
                    >
                        v0.1.0 {"\u00B7"} Made with {"\u2665"} in Galway
                    </p>
                </div>

                <AboutModal show={showAbout} onClose={() => setShowAbout(false)} theme={theme} />

                {/* Notification dropdown */}
                {showNotifications && (
                    <>
                        <div
                            onClick={() => setShowNotifications(false)}
                            style={{ position: "fixed", inset: 0, zIndex: 199 }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                top: 118,
                                right: 16,
                                left: 16,
                                maxHeight: 380,
                                overflowY: "auto",
                                background: theme.card,
                                borderRadius: 14,
                                boxShadow: isDark
                                    ? "0 8px 30px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset"
                                    : "0 8px 30px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
                                border: `1px solid ${theme.border}`,
                                zIndex: 200,
                                animation: "fadeSlideIn 0.15s ease",
                            }}
                        >
                            <div style={{ padding: "14px 16px 6px" }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
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
                                            setShowNotifications(false)
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
                                                    fontFamily: "'DM Sans', sans-serif",
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
                                                        fontFamily: "'DM Sans', sans-serif",
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
                                                        fontFamily: "'DM Sans', sans-serif",
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
                                                        fontFamily: "'DM Sans', sans-serif",
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
                )}
            </div>
        </div>
    )
}
