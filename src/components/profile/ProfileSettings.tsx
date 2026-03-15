import { useTheme } from "../../contexts/ThemeContext"
import DebugPanel from "./DebugPanel"
import type { Maker } from "../../types"
import type { Theme } from "../../types"

interface SettingsItem {
    icon: string
    label: string
    subtitle?: string
    action: () => void
}

interface ProfileSettingsProps {
    isDark: boolean
    toggleTheme: () => void
    feedLayout: "grid" | "single"
    setFeedLayout: (layout: "grid" | "single") => void
    isDebug: boolean
    toggleDebug: () => void
    makers: Maker[]
    refetch: () => void
    theme: Theme
    settingsItems: SettingsItem[]
}

function Toggle({ on, onToggle, theme }: { on: boolean; onToggle: () => void; theme: Theme }) {
    return (
        <button
            onClick={onToggle}
            style={{
                width: 48,
                height: 28,
                borderRadius: 100,
                border: "none",
                background: on ? theme.text : theme.border,
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
                    background: on ? theme.bg : "#fff",
                    position: "absolute",
                    top: 3,
                    left: 3,
                    transform: on ? "translateX(20px)" : "none",
                    transition: "transform 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
            />
        </button>
    )
}

function SettingsRow({
    icon,
    label,
    children,
    theme,
}: {
    icon: string
    label: string
    children: React.ReactNode
    theme: Theme
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 0",
                borderBottom: `1px solid ${theme.border}`,
            }}
        >
            <span style={{ fontSize: 18, color: theme.textMuted, width: 24, textAlign: "center" }}>{icon}</span>
            <span
                style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14.5,
                    color: theme.text,
                    flex: 1,
                }}
            >
                {label}
            </span>
            {children}
        </div>
    )
}

export default function ProfileSettings({
    isDark,
    toggleTheme,
    feedLayout,
    setFeedLayout,
    isDebug,
    toggleDebug,
    makers,
    refetch,
    theme,
    settingsItems,
}: ProfileSettingsProps) {
    return (
        <>
            <SettingsRow icon={"\u2600"} label="Light Mode" theme={theme}>
                <Toggle on={!isDark} onToggle={toggleTheme} theme={theme} />
            </SettingsRow>

            <SettingsRow icon={"\u25A6"} label="Default Feed" theme={theme}>
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
            </SettingsRow>

            <SettingsRow icon={"\u2699"} label="Debug Mode" theme={theme}>
                <Toggle on={isDebug} onToggle={toggleDebug} theme={theme} />
            </SettingsRow>

            <DebugPanel isDebug={isDebug} makers={makers} refetch={refetch} theme={theme} />

            {settingsItems.map((item, i) => (
                <div
                    key={i}
                    onClick={item.action}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "16px 0",
                        borderBottom: i < settingsItems.length - 1 ? `1px solid ${theme.border}` : "none",
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
        </>
    )
}
