import { useState, useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { supabase } from "../lib/supabase"

const GREETINGS_MORNING = [
    (n) => `Good morning, ${n}!`,
    (n) => `Rise and shine, ${n}!`,
    (n) => `Morning, ${n} \u2615`,
    (n) => `Maidin mhaith, ${n}!`,
    (n) => `Early bird! Welcome back, ${n}`,
]

const GREETINGS_AFTERNOON = [
    (n) => `Good afternoon, ${n}!`,
    (n) => `Hey ${n}, hope your day's going well`,
    (n) => `Afternoon, ${n} \u2600\uFE0F`,
    (n) => `Welcome back, ${n}!`,
    (n) => `${n}! Good to see you`,
    (n) => `Tr\u00e1thn\u00f3na maith, ${n}!`,
    (n) => `C\u00e9n chaoi, ${n}?`,
]

const GREETINGS_EVENING = [
    (n) => `Good evening, ${n}!`,
    (n) => `Evening, ${n} \u263E`,
    (n) => `Hey ${n}, winding down?`,
    (n) => `${n}! Nice evening for browsing`,
    (n) => `Tr\u00e1thn\u00f3na maith, ${n}!`,
    (n) => `O\u00edche mhaith, ${n} \u263E`,
    (n) => `C\u00e9n chaoi, ${n}? \u2728`,
    (n) => `Aon sc\u00e9al, ${n}?`,
    (n) => `${n}! F\u00e1ilte ar ais`,
    (n) => `Settling in for the evening, ${n}?`,
]

const GREETINGS_ANYTIME = [
    (n) => `${n}, let's find some makers`,
    (n) => `Lovely to have you back, ${n}`,
    (n) => `Look who's back! Hey ${n}`,
    (n) => `Hey ${n}, what'll we discover today?`,
    (n) => `Dia duit, ${n}!`,
    (n) => `F\u00e1ilte ar ais, ${n}!`,
    (n) => `Aon sc\u00e9al, ${n}?`,
    (n) => `What's the craic, ${n}?`,
]

function getGreeting(name) {
    const hour = new Date().getHours()
    // 50% chance time-specific, 50% anytime
    const useTimeBased = Math.random() < 0.5
    let pool = GREETINGS_ANYTIME

    if (useTimeBased) {
        if (hour >= 5 && hour < 12) pool = GREETINGS_MORNING
        else if (hour >= 12 && hour < 17) pool = GREETINGS_AFTERNOON
        else pool = GREETINGS_EVENING
    }

    return pool[Math.floor(Math.random() * pool.length)](name)
}

export default function ProfileScreen() {
    const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()
    const { isDark, theme, toggleTheme } = useTheme()
    const [mode, setMode] = useState("signin") // "signin" | "signup"
    const [firstName, setFirstName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [showAbout, setShowAbout] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [welcomeToast, setWelcomeToast] = useState("")
    const [failCount, setFailCount] = useState(0)
    const [lockedUntil, setLockedUntil] = useState(0)
    const [profileName, setProfileName] = useState("")

    // Fetch profile name when logged in
    useEffect(() => {
        if (!user) {
            setProfileName("")
            return
        }
        supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
                if (data?.first_name) setProfileName(data.first_name)
            })
    }, [user])

    const SETTINGS_ITEMS = [
        { icon: "\u25D4", label: "Notifications", subtitle: "Coming soon", action: () => {} },
        { icon: "\u25C7", label: "About maven", action: () => setShowAbout(true) },
        {
            icon: "\u2197",
            label: "Suggest a Maker",
            action: () =>
                window.open("mailto:hello@maven.ie?subject=Maker%20Suggestion", "_blank", "noopener,noreferrer"),
        },
    ]

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate name on signup
        if (mode === "signup") {
            const trimmed = firstName.trim()
            if (!trimmed || trimmed.length < 2) {
                setError("Please enter your name")
                return
            }
            if (trimmed.length > 30) {
                setError("Name is too long")
                return
            }
        }

        // Lock out after repeated failures (5 fails = 30s, 10 = 60s, 15+ = 120s)
        const now = Date.now()
        if (now < lockedUntil) {
            const secs = Math.ceil((lockedUntil - now) / 1000)
            setError(`Too many attempts. Try again in ${secs}s`)
            return
        }

        setError("")
        setSubmitting(true)

        const result = mode === "signup" ? await signUp(email, password) : await signIn(email, password)

        setSubmitting(false)

        if (result.error) {
            const newCount = failCount + 1
            setFailCount(newCount)
            if (newCount >= 15) setLockedUntil(Date.now() + 120000)
            else if (newCount >= 10) setLockedUntil(Date.now() + 60000)
            else if (newCount >= 5) setLockedUntil(Date.now() + 30000)
            // Normalize error messages to prevent account enumeration
            const raw = result.error.message
            const friendly =
                mode === "signup" && raw.includes("already registered")
                    ? "An account with this email already exists"
                    : mode === "signin"
                      ? "Incorrect email or password"
                      : "Something went wrong. Please try again."
            setError(friendly)
        } else {
            setFailCount(0)
            let name = firstName || email.split("@")[0]

            if (mode === "signup") {
                // Save first_name to profiles table using the user returned from signUp directly
                const trimmedName = firstName.trim().slice(0, 30)
                const newUser = result.data?.user
                if (newUser && trimmedName) {
                    const { error: profileErr } = await supabase
                        .from("profiles")
                        .upsert({ id: newUser.id, first_name: trimmedName })
                    if (profileErr) console.error("Profile write failed:", profileErr)
                }
            } else {
                // Fetch first_name from profiles for returning users
                const currentUser = result.data?.user
                if (currentUser) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("first_name")
                        .eq("id", currentUser.id)
                        .single()
                    if (profile?.first_name) name = profile.first_name
                }
            }

            name = name.charAt(0).toUpperCase() + name.slice(1)
            const msg = mode === "signup" ? `Welcome to maven, ${name}!` : getGreeting(name)
            setWelcomeToast(msg)
            setTimeout(() => setWelcomeToast(""), 3000)
            setEmail("")
            setPassword("")
            setFirstName("")
        }
    }

    const handleSignOut = async () => {
        await signOut()
        setWelcomeToast("Signed out")
        setTimeout(() => setWelcomeToast(""), 3000)
    }

    const initial = profileName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"

    return (
        <div style={{ paddingBottom: 100 }}>
            <Helmet>
                <title>Profile — maven</title>
            </Helmet>
            <div style={{ padding: "16px 20px 20px" }}>
                <h1
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: theme.text,
                        margin: "0 0 24px",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Profile
                </h1>

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
                    <div
                        style={{
                            background: theme.surface,
                            borderRadius: 18,
                            padding: "32px 24px",
                            textAlign: "center",
                            marginBottom: 20,
                        }}
                    >
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: theme.textMuted,
                                margin: 0,
                            }}
                        >
                            Loading...
                        </p>
                    </div>
                ) : user ? (
                    /* Logged in state */
                    <div
                        style={{
                            background: theme.surface,
                            borderRadius: 18,
                            padding: "32px 24px",
                            textAlign: "center",
                            marginBottom: 20,
                        }}
                    >
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                background: theme.btnBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 14px",
                                fontSize: 28,
                                fontWeight: 700,
                                color: theme.btnText,
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            {initial}
                        </div>
                        {profileName && (
                            <p
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: theme.text,
                                    margin: "0 0 4px",
                                }}
                            >
                                {profileName}
                            </p>
                        )}
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textMuted,
                                margin: "0 0 16px",
                                lineHeight: 1.6,
                            }}
                        >
                            {user.email}
                        </p>
                        <button
                            onClick={handleSignOut}
                            style={{
                                padding: "12px 28px",
                                borderRadius: 100,
                                border: `1px solid ${theme.border}`,
                                background: theme.card,
                                color: theme.text,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    /* Logged out state — auth form */
                    <div
                        style={{
                            background: theme.surface,
                            borderRadius: 18,
                            padding: "28px 24px",
                            marginBottom: 20,
                        }}
                    >
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: theme.textMuted,
                                margin: "0 0 20px",
                                textAlign: "center",
                                lineHeight: 1.6,
                            }}
                        >
                            Sign in to sync your saved makers across devices
                        </p>

                        <form onSubmit={handleSubmit}>
                            {mode === "signup" && (
                                <input
                                    type="text"
                                    placeholder="First name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        borderRadius: 12,
                                        border: `1px solid ${theme.border}`,
                                        background: theme.inputBg,
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 14,
                                        color: theme.text,
                                        outline: "none",
                                        marginBottom: 10,
                                        boxSizing: "border-box",
                                    }}
                                />
                            )}
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    borderRadius: 12,
                                    border: `1px solid ${theme.border}`,
                                    background: theme.inputBg,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    color: theme.text,
                                    outline: "none",
                                    marginBottom: 10,
                                    boxSizing: "border-box",
                                }}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    borderRadius: 12,
                                    border: `1px solid ${theme.border}`,
                                    background: theme.inputBg,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    color: theme.text,
                                    outline: "none",
                                    marginBottom: 14,
                                    boxSizing: "border-box",
                                }}
                            />

                            {error && (
                                <p
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13,
                                        color: "#9b2c2c",
                                        margin: "0 0 12px",
                                        textAlign: "center",
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: "100%",
                                    padding: "12px 28px",
                                    borderRadius: 100,
                                    border: "none",
                                    background: theme.btnBg,
                                    color: theme.btnText,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: submitting ? "default" : "pointer",
                                    opacity: submitting ? 0.6 : 1,
                                }}
                            >
                                {submitting ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
                            </button>
                        </form>

                        {mode === "signin" && (
                            <p
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    color: resetSent ? "#22543d" : theme.textMuted,
                                    margin: "12px 0 0",
                                    textAlign: "center",
                                    cursor: resetSent ? "default" : "pointer",
                                }}
                                onClick={async () => {
                                    if (resetSent) return
                                    if (!email.trim()) {
                                        setError("Enter your email first")
                                        return
                                    }
                                    await resetPassword(email.trim())
                                    setResetSent(true)
                                    setError("")
                                    setTimeout(() => setResetSent(false), 5000)
                                }}
                            >
                                {resetSent ? "Reset link sent — check your email" : "Forgot password?"}
                            </p>
                        )}

                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textMuted,
                                margin: "16px 0 0",
                                textAlign: "center",
                            }}
                        >
                            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                            <span
                                onClick={() => {
                                    setMode(mode === "signin" ? "signup" : "signin")
                                    setError("")
                                    setResetSent(false)
                                }}
                                style={{ color: theme.text, fontWeight: 600, cursor: "pointer" }}
                            >
                                {mode === "signin" ? "Sign Up" : "Sign In"}
                            </span>
                        </p>
                    </div>
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
                                left: !isDark ? 23 : 3,
                                transition: "left 0.2s ease",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            }}
                        />
                    </button>
                </div>

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

                <div style={{ marginTop: 32, textAlign: "center" }}>
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
            </div>

            {/* Welcome toast — inline, below heading */}

            {/* About modal */}
            {showAbout && (
                <div
                    onClick={() => setShowAbout(false)}
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
                            borderRadius: 20,
                            padding: "32px 28px",
                            maxWidth: 340,
                            width: "100%",
                            textAlign: "center",
                        }}
                    >
                        <h2
                            style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 28,
                                fontWeight: 700,
                                color: theme.text,
                                margin: "0 0 8px",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            maven
                        </h2>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textMuted,
                                margin: "0 0 16px",
                            }}
                        >
                            v0.1.0
                        </p>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: theme.textSecondary,
                                lineHeight: 1.6,
                                margin: "0 0 24px",
                            }}
                        >
                            Discover local makers and craftspeople in Galway, Ireland. Supporting the people who make
                            things by hand.
                        </p>
                        <button
                            onClick={() => setShowAbout(false)}
                            style={{
                                padding: "12px 32px",
                                borderRadius: 100,
                                border: "none",
                                background: theme.btnBg,
                                color: theme.btnText,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
