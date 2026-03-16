import DebugPanel from "./DebugPanel"
import type { Maker } from "../../types"
import type { Theme } from "../../types"

interface SettingsItem {
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
                borderRadius: 0,
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
                    borderRadius: 0,
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

function SegmentedControl({
    options,
    value,
    onChange,
    theme,
}: {
    options: { label: string; value: string }[]
    value: string
    onChange: (v: string) => void
    theme: Theme
}) {
    return (
        <div
            style={{
                display: "flex",
                background: theme.pill || theme.border,
                borderRadius: 0,
                padding: 2,
                gap: 2,
                flexShrink: 0,
            }}
        >
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    style={{
                        padding: "5px 12px",
                        borderRadius: 0,
                        border: "none",
                        background: value === opt.value ? theme.card : "transparent",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12.5,
                        fontWeight: value === opt.value ? 600 : 400,
                        color: value === opt.value ? theme.text : theme.textMuted,
                        transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                        boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}

function SettingsRow({ label, children, theme }: { label: string; children: React.ReactNode; theme: Theme }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                padding: "15px 0",
                borderBottom: `1px solid ${theme.border}`,
            }}
        >
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
            <SettingsRow label="Theme" theme={theme}>
                <SegmentedControl
                    options={[
                        { label: "Light", value: "light" },
                        { label: "Dark", value: "dark" },
                    ]}
                    value={isDark ? "dark" : "light"}
                    onChange={() => toggleTheme()}
                    theme={theme}
                />
            </SettingsRow>

            <SettingsRow label="Default Feed" theme={theme}>
                <SegmentedControl
                    options={[
                        { label: "Grid", value: "grid" },
                        { label: "Single", value: "single" },
                    ]}
                    value={feedLayout}
                    onChange={(v) => setFeedLayout(v as "grid" | "single")}
                    theme={theme}
                />
            </SettingsRow>

            <SettingsRow label="Debug Mode" theme={theme}>
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
                        padding: "15px 0",
                        borderBottom: i < settingsItems.length - 1 ? `1px solid ${theme.border}` : "none",
                        cursor: "pointer",
                    }}
                >
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
                </div>
            ))}
        </>
    )
}
