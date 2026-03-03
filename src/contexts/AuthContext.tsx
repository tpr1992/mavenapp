import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { supabase } from "../lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

interface AuthContextValue {
    session: Session | null
    user: User | null
    loading: boolean
    signUp: (email: string, password: string) => ReturnType<typeof supabase.auth.signUp>
    signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
    signOut: () => ReturnType<typeof supabase.auth.signOut>
    resetPassword: (email: string) => ReturnType<typeof supabase.auth.resetPasswordForEmail>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signUp = useCallback((email: string, password: string) => supabase.auth.signUp({ email, password }), [])

    const signIn = useCallback(
        (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
        [],
    )

    const signOut = useCallback(() => supabase.auth.signOut(), [])

    const resetPassword = useCallback(
        (email: string) =>
            supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/?tab=profile",
            }),
        [],
    )

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            loading,
            signUp,
            signIn,
            signOut,
            resetPassword,
        }),
        [session, loading, signUp, signIn, signOut, resetPassword],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within AuthProvider")
    return ctx
}
