import { useState, useRef, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useTheme } from "../../contexts/ThemeContext"
import { supabase } from "../../lib/supabase"
import { getGreeting } from "../../utils/greeting"

interface AuthFormProps {
    onWelcomeToast: (message: string) => void
}

export default function AuthForm({ onWelcomeToast }: AuthFormProps) {
    const { signIn, signUp, resetPassword } = useAuth()
    const { theme } = useTheme()
    const [mode, setMode] = useState<"signin" | "signup">("signin")
    const [firstName, setFirstName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [failCount, setFailCount] = useState(0)
    const [lockedUntil, setLockedUntil] = useState(0)
    const resetTimer = useRef<ReturnType<typeof setTimeout>>(null)

    useEffect(() => {
        return () => {
            if (resetTimer.current) clearTimeout(resetTimer.current)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

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
                const trimmedName = firstName.trim().slice(0, 30)
                const newUser = result.data?.user
                if (newUser && trimmedName) {
                    const { error: profileErr } = await supabase
                        .from("profiles")
                        .upsert({ id: newUser.id, first_name: trimmedName })
                    if (profileErr) console.error("Profile write failed:", profileErr)
                }
            } else {
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
            onWelcomeToast(msg)
            setEmail("")
            setPassword("")
            setFirstName("")
        }
    }

    return (
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
                            fontSize: 16,
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
                        fontSize: 16,
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
                        fontSize: 16,
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
                        if (resetTimer.current) clearTimeout(resetTimer.current)
                        resetTimer.current = setTimeout(() => setResetSent(false), 5000)
                    }}
                >
                    {resetSent ? "Reset link sent \u2014 check your email" : "Forgot password?"}
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
    )
}
