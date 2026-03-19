import { useState, useEffect, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { useMakersContext } from "../contexts/MakersContext"
import AuthForm from "../components/profile/AuthForm"
import DebugPanel from "../components/profile/DebugPanel"
import AboutModal from "../components/profile/AboutModal"
import IdentityHero from "../components/profile/IdentityHero"
import StatsBar from "../components/profile/StatsBar"
import RecentlyViewed from "../components/profile/RecentlyViewed"
import NotificationDropdown from "../components/profile/NotificationDropdown"
import type { Maker, InboxItem } from "../types"
import { font } from "../styles/tokens"

interface ProfileScreenProps {
    isDebug: boolean
    toggleDebug: () => void
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
    recentlyViewedIds?: string[]
    discoveredCount?: number
    onMakerTap?: (maker: Maker) => void
}

export default function ProfileScreen({
    isDebug,
    toggleDebug,
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
    recentlyViewedIds,
    discoveredCount,
    onMakerTap,
}: ProfileScreenProps) {
    const { user, loading, signOut } = useAuth()
    const { makers, savedIds } = useMakersContext()
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
                            fontFamily: font.body,
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
                    {/* 1. Identity hero */}
                    <IdentityHero
                        profileName={profileName}
                        email={user?.email || ""}
                        unreadMessages={unreadMessages}
                        onNotificationsTap={() => setShowNotifications((v) => !v)}
                        onSettingsTap={() => {}}
                    />

                    {/* 2. Stats bar */}
                    <StatsBar
                        savedCount={savedIds.size}
                        discoveredCount={discoveredCount ?? 0}
                        messagesCount={inboxItems.length}
                    />

                    {/* 3. Recently viewed */}
                    {onMakerTap && (recentlyViewedIds?.length ?? 0) > 0 && (
                        <RecentlyViewed
                            recentlyViewedIds={recentlyViewedIds || []}
                            makers={makers}
                            onMakerTap={onMakerTap}
                        />
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
                                    fontFamily: font.body,
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
                                        fontFamily: font.body,
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
                                fontFamily: font.body,
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
                                    fontFamily: font.body,
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
                                            fontFamily: font.body,
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
                                    fontFamily: font.body,
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
                                            fontFamily: font.body,
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
                                    fontFamily: font.body,
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
                                fontFamily: font.body,
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
            <NotificationDropdown
                show={showNotifications}
                onClose={() => setShowNotifications(false)}
                inboxItems={inboxItems}
                userId={userId}
                onMessagesTap={onMessagesTap}
            />
        </div>
    )
}
