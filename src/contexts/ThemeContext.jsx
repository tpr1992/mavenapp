import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"

const ThemeContext = createContext()

const LIGHT = {
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

const DARK = {
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

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        try {
            const stored = localStorage.getItem("maven_dark_mode")
            return stored === null ? true : stored === "true"
        } catch {
            return true
        }
    })

    useEffect(() => {
        document.body.style.background = isDark ? DARK.bg : LIGHT.bg
        try {
            localStorage.setItem("maven_dark_mode", isDark)
        } catch {}
    }, [isDark])

    const toggleTheme = useCallback(() => setIsDark((v) => !v), [])

    const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark])

    const value = useMemo(() => ({ isDark, theme, toggleTheme }), [isDark, theme, toggleTheme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    return useContext(ThemeContext)
}
