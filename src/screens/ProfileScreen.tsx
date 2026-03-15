import { useState, useEffect, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import AuthForm from "../components/profile/AuthForm"
import DebugPanel from "../components/profile/DebugPanel"
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

                    {/* Light mode toggle */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "16px 0",
                            borderBottom: `1px solid ${theme.border}`,
                        }}
                    >
                        <span style={{ fontSize: 18, color: theme.textMuted, width: 24, textAlign: "center" }}>
                            {"\u2600"}
                        </span>
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14.5,
                                color: theme.text,
                                flex: 1,
                            }}
                        >
                            Light Mode
                        </span>
                        <button
                            onClick={toggleTheme}
                            style={{
                                width: 48,
                                height: 28,
                                borderRadius: 100,
                                border: "none",
                                background: !isDark ? theme.text : theme.border,
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
                                    borderRadius: "50%",
                                    background: !isDark ? theme.bg : "#fff",
                                    position: "absolute",
                                    top: 3,
                                    left: 3,
                                    transform: !isDark ? "translateX(20px)" : "none",
                                    transition: "transform 0.2s ease",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                }}
                            />
                        </button>
                    </div>

                    {/* Feed layout preference */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "16px 0",
                            borderBottom: `1px solid ${theme.border}`,
                        }}
                    >
                        <span style={{ fontSize: 18, color: theme.textMuted, width: 24, textAlign: "center" }}>
                            {"\u25A6"}
                        </span>
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14.5,
                                color: theme.text,
                                flex: 1,
                            }}
                        >
                            Default Feed
                        </span>
                        <div
                            style={{
                                display: "flex",
                                background: theme.pill || theme.border,
                                borderRadius: 8,
                                padding: 2,
                                gap: 2,
                                flexShrink: 0,
                            }}
                        >
                            {(["grid", "single"] as const).map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setFeedLayout(opt)}
                                    style={{
                                        padding: "5px 12px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: feedLayout === opt ? theme.card : "transparent",
                                        cursor: "pointer",
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12.5,
                                        fontWeight: feedLayout === opt ? 600 : 400,
                                        color: feedLayout === opt ? theme.text : theme.textMuted,
                                        transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                                        boxShadow: feedLayout === opt ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    }}
                                >
                                    {opt === "grid" ? "Grid" : "Single"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Debug mode toggle */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "16px 0",
                            borderBottom: `1px solid ${theme.border}`,
                        }}
                    >
                        <span style={{ fontSize: 18, color: theme.textMuted, width: 24, textAlign: "center" }}>
                            {"\u2699"}
                        </span>
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14.5,
                                color: theme.text,
                                flex: 1,
                            }}
                        >
                            Debug Mode
                        </span>
                        <button
                            onClick={toggleDebug}
                            style={{
                                width: 48,
                                height: 28,
                                borderRadius: 100,
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
                                    borderRadius: "50%",
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

                    <DebugPanel isDebug={isDebug} makers={makers} refetch={refetch} theme={theme} />

                    {/* Settings items */}
                    {SETTINGS_ITEMS.map((item, i) => (
                        <div
                            key={i}
                            onClick={item.action}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "16px 0",
                                borderBottom: i < SETTINGS_ITEMS.length - 1 ? `1px solid ${theme.border}` : "none",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ fontSize: 18, color: theme.textMuted, width: 24, textAlign: "center" }}>
                                {item.icon}
                            </span>
                            <div style={{ flex: 1 }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 14.5,
                                        color: theme.text,
                                        display: "block",
                                    }}
                                >
                                    {item.label}
                                </span>
                                {item.subtitle && (
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 12.5,
                                            color: theme.textMuted,
                                            display: "block",
                                            marginTop: 2,
                                        }}
                                    >
                                        {item.subtitle}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: theme.textMuted, fontSize: 14 }}>{"\u203A"}</span>
                        </div>
                    ))}
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
