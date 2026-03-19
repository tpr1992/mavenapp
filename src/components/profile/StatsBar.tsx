import { useTheme } from "../../contexts/ThemeContext"
import { font } from "../../styles/tokens"

interface StatsBarProps {
    savedCount: number
    discoveredCount: number
    messagesCount: number
}

export default function StatsBar({ savedCount, discoveredCount, messagesCount }: StatsBarProps) {
    const { theme } = useTheme()

    return (
        <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}` }}>
            {[
                { num: savedCount, label: "SAVED" },
                { num: discoveredCount, label: "DISCOVERED" },
                { num: messagesCount, label: "MESSAGES" },
            ].map((stat, i) => (
                <div
                    key={stat.label}
                    style={{
                        flex: 1,
                        padding: "16px 0",
                        textAlign: "center",
                        borderRight: i < 2 ? `1px solid ${theme.border}` : "none",
                    }}
                >
                    <div
                        style={{
                            fontFamily: font.heading,
                            fontSize: 22,
                            fontWeight: 800,
                            color: theme.text,
                            letterSpacing: "0.02em",
                        }}
                    >
                        {stat.num}
                    </div>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 8.5,
                            fontWeight: 500,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: theme.textMuted,
                            marginTop: 4,
                        }}
                    >
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    )
}
