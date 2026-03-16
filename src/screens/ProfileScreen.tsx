import { useState, useEffect, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import AuthForm from "../components/profile/AuthForm"
import DebugPanel from "../components/profile/DebugPanel"
import AboutModal from "../components/profile/AboutModal"
import { optimizeImageUrl } from "../utils/image"
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
    savedCount: number
    recentlyViewedIds?: string[]
    discoveredCount?: number
    onMakerTap?: (maker: Maker) => void
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
    savedCount,
    recentlyViewedIds,
    discoveredCount,
    onMakerTap,
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

            {/* Welcome / sign-out toast */}
            <div
                style={{
                    overflow: "hidden",
                    maxHeight: welcomeToast ? 60 : 0,
                    opacity: welcomeToast ? 1 : 0,
                    transition: "max-height 0.35s ease, opacity 0.3s ease",
                    position: "absolute",
                    top: 8,
                    left: 16,
                    right: 16,
                    zIndex: 300,
                }}
            >
                <div
                    style={{
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 0,
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
                            borderRadius: 0,
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
                <div style={{ padding: "26px 16px" }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 0,
                            background: theme.surface,
                        }}
                    />
                </div>
            ) : !user ? (
                <div style={{ padding: "18px 16px 14px", animation: "fadeIn 0.15s ease" }}>
                    <AuthForm onWelcomeToast={showWelcomeToast} />
                </div>
            ) : (
                <div style={{ animation: "fadeIn 0.15s ease" }}>
                    {/* 1. Identity hero section */}
                    <div
                        style={{
                            height: 120,
                            position: "relative",
                            overflow: "hidden",
                            background: "linear-gradient(160deg, #1a1816, #252220, #1a1816)",
                        }}
                    >
                        {/* Diagonal line texture */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                opacity: 0.06,
                                backgroundImage:
                                    "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 13px)",
                            }}
                        />
                        {/* Top-right icons: bell + gear */}
                        <div
                            style={{
                                position: "absolute",
                                top: 14,
                                right: 16,
                                display: "flex",
                                gap: 16,
                                zIndex: 2,
                            }}
                        >
                            {/* Notification bell */}
                            <button
                                onClick={() => setShowNotifications((v) => !v)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#fff",
                                    cursor: "pointer",
                                    padding: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
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
                                            top: 3,
                                            right: 3,
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: "#22c55e",
                                            border: "2px solid #1a1816",
                                        }}
                                    />
                                )}
                            </button>
                            {/* Gear icon — opens About */}
                            <button
                                onClick={() => setShowAbout(true)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#fff",
                                    cursor: "pointer",
                                    padding: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </button>
                        </div>
                        {/* Identity text at bottom-left */}
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: "0 20px 20px",
                                zIndex: 2,
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 9,
                                    fontWeight: 500,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: 8,
                                }}
                            >
                                Member since 2025
                            </div>
                            <div
                                style={{
                                    fontFamily: "'Syne', sans-serif",
                                    fontSize: 24,
                                    fontWeight: 800,
                                    letterSpacing: "0.03em",
                                    textTransform: "uppercase",
                                    color: "#fff",
                                    marginBottom: 6,
                                    lineHeight: 1.1,
                                }}
                            >
                                {profileName || user?.email?.split("@")[0] || ""}
                            </div>
                            <div
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 11,
                                    color: "rgba(255,255,255,0.4)",
                                }}
                            >
                                {user?.email}
                            </div>
                        </div>
                    </div>

                    {/* 2. Stats bar */}
                    <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}` }}>
                        {[
                            { num: savedCount, label: "SAVED" },
                            { num: discoveredCount ?? 0, label: "DISCOVERED" },
                            { num: inboxItems.length, label: "MESSAGES" },
                        ].map((stat, i) => (
                            <div
                                key={stat.label}
                                style={{
                                    flex: 1,
                                    padding: "16px 0",
                                    textAlign: "center",
                                    borderRight: i < 2 ? `1px solid ${theme.border}` : "none",
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: "'Syne', sans-serif",
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: theme.text,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {stat.num}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 8.5,
                                        fontWeight: 500,
                                        letterSpacing: "0.14em",
                                        textTransform: "uppercase",
                                        color: theme.textMuted,
                                        marginTop: 4,
                                    }}
                                >
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 3. Recently viewed (horizontal scroll strip) */}
                    {onMakerTap && (recentlyViewedIds?.length ?? 0) > 0 && (
                        <div>
                            <div
                                style={{
                                    padding: "20px 20px 12px",
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 9,
                                    fontWeight: 500,
                                    letterSpacing: "0.16em",
                                    textTransform: "uppercase",
                                    color: theme.textMuted,
                                }}
                            >
                                Recently Viewed
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 3,
                                    padding: "0 3px",
                                    overflowX: "auto",
                                    scrollbarWidth: "none",
                                    WebkitOverflowScrolling: "touch",
                                }}
                            >
                                {(recentlyViewedIds || [])
                                    .slice(0, 8)
                                    .map((id) => makers.find((m) => m.id === id))
                                    .filter(Boolean)
                                    .map(
                                        (maker) =>
                                            maker && (
                                                <div
                                                    key={maker.id}
                                                    onClick={() => onMakerTap(maker)}
                                                    style={{
                                                        minWidth: 120,
                                                        height: 140,
                                                        overflow: "hidden",
                                                        position: "relative",
                                                        cursor: "pointer",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {maker.gallery_urls?.[0] ? (
                                                        <img
                                                            src={
                                                                optimizeImageUrl(maker.gallery_urls[0], 300) ??
                                                                undefined
                                                            }
                                                            alt={maker.name}
                                                            loading="lazy"
                                                            decoding="async"
                                                            onLoad={(e) => {
                                                                ;(e.target as HTMLImageElement).style.opacity = "1"
                                                            }}
                                                            style={{
                                                                position: "absolute",
                                                                inset: 0,
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                                opacity: 0,
                                                                transition: "opacity 0.3s ease",
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                inset: 0,
                                                                background: maker.hero_color || theme.surface,
                                                            }}
                                                        />
                                                    )}
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            height: "50%",
                                                            background:
                                                                "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))",
                                                            pointerEvents: "none",
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            bottom: 8,
                                                            left: 8,
                                                            right: 8,
                                                            fontFamily: "'DM Sans', sans-serif",
                                                            fontSize: 10,
                                                            fontWeight: 500,
                                                            color: "#fff",
                                                            pointerEvents: "none",
                                                        }}
                                                    >
                                                        {maker.name}
                                                    </div>
                                                </div>
                                            ),
                                    )}
                            </div>
                        </div>
                    )}

                    {/* 4. Navigation links */}
                    <div style={{ paddingTop: 16 }}>
                        <div
                            onClick={onSavedTap}
                            style={{
                                padding: "14px 20px",
                                borderTop: `1px solid ${theme.border}`,
                                borderBottom: `1px solid ${theme.border}`,
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                    flex: 1,
                                }}
                            >
                                Favourites
                            </span>
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={theme.textMuted}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                        <div
                            onClick={onMessagesTap}
                            style={{
                                padding: "14px 20px",
                                borderBottom: `1px solid ${theme.border}`,
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: theme.text,
                                    }}
                                >
                                    Messages
                                </span>
                                {unreadMessages > 0 && (
                                    <span
                                        style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "#4ade80",
                                        }}
                                    />
                                )}
                            </span>
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={theme.textMuted}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    {/* 5. Settings section */}
                    <div>
                        <div
                            style={{
                                padding: "20px 20px 0",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 9,
                                fontWeight: 500,
                                letterSpacing: "0.16em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                            }}
                        >
                            Settings
                        </div>
                        {/* Theme row */}
                        <div
                            style={{
                                padding: "12px 20px",
                                borderBottom: `1px solid ${theme.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                Theme
                            </span>
                            <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderRadius: 0 }}>
                                {["Light", "Dark"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={toggleTheme}
                                        style={{
                                            padding: "5px 14px",
                                            border: "none",
                                            borderRadius: 0,
                                            background: (opt === "Dark" ? isDark : !isDark) ? "#1e1e1e" : "transparent",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 10,
                                            fontWeight: 500,
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            color: (opt === "Dark" ? isDark : !isDark) ? theme.text : theme.textMuted,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Feed layout row */}
                        <div
                            style={{
                                padding: "12px 20px",
                                borderBottom: `1px solid ${theme.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                Default Feed
                            </span>
                            <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderRadius: 0 }}>
                                {(["grid", "single"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setFeedLayout(opt)}
                                        style={{
                                            padding: "5px 14px",
                                            border: "none",
                                            borderRadius: 0,
                                            background: feedLayout === opt ? "#1e1e1e" : "transparent",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 10,
                                            fontWeight: 500,
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            color: feedLayout === opt ? theme.text : theme.textMuted,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {opt === "grid" ? "Grid" : "Single"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Debug mode row */}
                        <div
                            style={{
                                padding: "12px 20px",
                                borderBottom: `1px solid ${theme.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                Debug Mode
                            </span>
                            <button
                                onClick={toggleDebug}
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 0,
                                    border: "none",
                                    background: isDebug ? theme.text : theme.border,
                                    cursor: "pointer",
                                    position: "relative",
                                    transition: "background 0.2s ease",
                                    padding: 0,
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 0,
                                        background: isDebug ? theme.bg : "#fff",
                                        position: "absolute",
                                        top: 3,
                                        left: 3,
                                        transform: isDebug ? "translateX(20px)" : "none",
                                        transition: "transform 0.2s ease",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                    }}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Debug panel */}
                    <DebugPanel isDebug={isDebug} makers={makers} refetch={refetch} theme={theme} />

                    {/* 6. Sign out button */}
                    <div style={{ padding: "24px 20px 0" }}>
                        <button
                            onClick={handleSignOut}
                            style={{
                                width: "100%",
                                padding: "12px 0",
                                borderRadius: 0,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "transparent",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                                cursor: "pointer",
                            }}
                        >
                            Sign Out
                        </button>
                    </div>

                    <div style={{ height: 24 }} />
                </div>
            )}

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
                            top: 50,
                            right: 16,
                            left: 16,
                            maxHeight: 380,
                            overflowY: "auto",
                            background: theme.card,
                            borderRadius: 0,
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
    )
}
