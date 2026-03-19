import type { Theme } from "../../types"
import { font } from "../../styles/tokens"

interface AboutModalProps {
    show: boolean
    onClose: () => void
    theme: Theme
}

export default function AboutModal({ show, onClose, theme }: AboutModalProps) {
    if (!show) return null

    return (
        <div
            onClick={onClose}
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
                    borderRadius: 0,
                    padding: "32px 28px",
                    maxWidth: 340,
                    width: "100%",
                    textAlign: "center",
                }}
            >
                <h2
                    style={{
                        fontFamily: font.wordmark,
                        fontSize: 28,
                        fontWeight: 700,
                        color: theme.text,
                        margin: "0 0 8px",
                        letterSpacing: "-0.03em",
                    }}
                >
                    maven
                </h2>
                <p
                    style={{
                        fontFamily: font.body,
                        fontSize: 13,
                        color: theme.textMuted,
                        margin: "0 0 16px",
                    }}
                >
                    v0.1.0
                </p>
                <p
                    style={{
                        fontFamily: font.body,
                        fontSize: 14,
                        color: theme.textSecondary,
                        lineHeight: 1.6,
                        margin: "0 0 24px",
                    }}
                >
                    Discover local makers and craftspeople in Galway, Ireland. Supporting the people who make things by
                    hand.
                </p>
                <button
                    onClick={onClose}
                    style={{
                        padding: "12px 32px",
                        borderRadius: 0,
                        border: "none",
                        background: theme.btnBg,
                        color: theme.btnText,
                        fontFamily: font.body,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )
}
