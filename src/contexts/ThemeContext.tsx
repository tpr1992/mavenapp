import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import type { Theme } from "../types"
import { storageGet, storageSet } from "../utils/storage"

interface ThemeContextValue {
    isDark: boolean
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const LIGHT: Theme = {
    bg: "#faf8f4",
    card: "#fff",
    surface: "#f9f7f3",
    pill: "#f0ece6",
    text: "#1a1a1a",
    textSecondary: "#666",
    textMuted: "#999",
    border: "#e8e4de",
    btnBg: "#1a1a1a",
    btnText: "#fff",
    tabBg: "rgba(250,248,244,0.92)",
    inputBg: "#fff",
}

const DARK: Theme = {
    bg: "#121212",
    card: "#1e1e1e",
    surface: "#252525",
    pill: "#2d2d2d",
    text: "#e8e6e3",
    textSecondary: "#a0a0a0",
    textMuted: "#707070",
    border: "#333",
    btnBg: "#e8e6e3",
    btnText: "#121212",
    tabBg: "rgba(18,18,18,0.92)",
    inputBg: "#1e1e1e",
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDark, setIsDark] = useState(() => {
        try {
            const stored = storageGet("maven_dark_mode")
            return stored === null ? true : stored === "true"
        } catch {
            return true
        }
    })

    useEffect(() => {
        document.body.style.background = isDark ? DARK.bg : LIGHT.bg
        try {
            storageSet("maven_dark_mode", String(isDark))
        } catch {}
    }, [isDark])

    const toggleTheme = useCallback(() => setIsDark((v) => !v), [])

    const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark])

    const value = useMemo(() => ({ isDark, theme, toggleTheme }), [isDark, theme, toggleTheme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
    return ctx
}
