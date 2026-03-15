import { useState, useEffect, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import AuthForm from "../components/profile/AuthForm"
import ProfileSettings from "../components/profile/ProfileSettings"
import AboutModal from "../components/profile/AboutModal"
import type { Maker } from "../types"

interface ProfileScreenProps {
    isDebug: boolean
    toggleDebug: () => void
    makers: Maker[]
    refetch: () => void
    feedLayout: "grid" | "single"
    setFeedLayout: (layout: "grid" | "single") => void
    onLogoTap: () => void
    profileName: string
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
}: ProfileScreenProps) {
    const { user, loading, signOut } = useAuth()
    const { isDark, theme, toggleTheme } = useTheme()
    const [showAbout, setShowAbout] = useState(false)
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

    const SETTINGS_ITEMS = [
        { icon: "\u25D4", label: "Notifications", subtitle: "Coming soon", action: () => {} },
        { icon: "\u25C7", label: "About maven", action: () => setShowAbout(true) },
    ]

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
                                onClick={handleSignOut}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 100,
                                    border: `1px solid ${theme.border}`,
                                    background: "transparent",
                                    color: theme.textMuted,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12.5,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <AuthForm onWelcomeToast={showWelcomeToast} />
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
                <div style={{ marginTop: "auto", paddingTop: 32, paddingBottom: 24, textAlign: "center" }}>
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
            </div>
        </div>
    )
}
