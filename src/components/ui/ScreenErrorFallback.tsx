import { font } from "../../styles/tokens"
import { useTheme } from "../../contexts/ThemeContext"

interface ScreenErrorFallbackProps {
    label: string
    onRetry?: () => void
}

export default function ScreenErrorFallback({ label, onRetry }: ScreenErrorFallbackProps) {
    const { theme } = useTheme()

    return (
        <div
            style={{
                padding: "60px 24px",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontFamily: font.heading,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: theme.text,
                    marginBottom: 8,
                }}
            >
                {label} unavailable
            </div>
            <p
                style={{
                    fontFamily: font.body,
                    fontSize: 13,
                    color: theme.textMuted,
                    margin: "0 0 20px",
                }}
            >
                Something went wrong loading this section
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        padding: "10px 24px",
                        borderRadius: 0,
                        border: `1px solid ${theme.border}`,
                        background: "transparent",
                        color: theme.text,
                        fontFamily: font.body,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                    }}
                >
                    Try again
                </button>
            )}
        </div>
    )
}
