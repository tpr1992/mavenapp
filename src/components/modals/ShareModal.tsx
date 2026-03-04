import { useState, memo } from "react"
import useBreakpoint from "../../hooks/useBreakpoint"
import type { Maker, Theme } from "../../types"

interface ShareModalProps {
    maker: Maker
    theme: Theme
    shareUrl: string
    onClose: () => void
}

export default memo(function ShareModal({ maker, theme, shareUrl, onClose }: ShareModalProps) {
    const breakpoint = useBreakpoint()
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
        } catch {}
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 200,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
            }}
        >
            <div
                aria-label={`Share ${maker.name}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: theme.card,
                    borderRadius: "20px 20px 0 0",
                    padding: "28px 24px 36px",
                    maxWidth: breakpoint === "mobile" ? 430 : 560,
                    width: "100%",
                    animation: "slideUp 0.25s ease",
                }}
            >
                <div
                    style={{ width: 36, height: 4, borderRadius: 100, background: theme.border, margin: "0 auto 20px" }}
                />

                <h3
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: theme.text,
                        margin: "0 0 4px",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Share {maker.name}
                </h3>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: theme.textMuted,
                        margin: "0 0 20px",
                    }}
                >
                    Send this maker to a friend
                </p>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: theme.surface,
                        borderRadius: 12,
                        padding: "4px 4px 4px 16px",
                        marginBottom: 20,
                    }}
                >
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: theme.textSecondary,
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                        }}
                    >
                        {shareUrl.replace(/^https?:\/\//, "")}
                    </span>
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: "10px 18px",
                            borderRadius: 10,
                            border: "none",
                            background: copied ? "#22543d" : theme.btnBg,
                            color: copied ? "#fff" : theme.btnText,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "background 0.2s ease, color 0.2s ease",
                            minWidth: 72,
                        }}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    {[
                        {
                            label: "Email",
                            icon: "\u2709",
                            action: () =>
                                window.open(
                                    `mailto:?subject=${encodeURIComponent("Check out " + maker.name + " on maven")}&body=${encodeURIComponent(maker.name + "\n" + maker.bio.slice(0, 100) + "...\n\n" + shareUrl)}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                ),
                        },
                        {
                            label: "WhatsApp",
                            icon: "\uD83D\uDCAC",
                            action: () =>
                                window.open(
                                    `https://wa.me/?text=${encodeURIComponent("Check out " + maker.name + " on maven!\n" + shareUrl)}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                ),
                        },
                        {
                            label: "X",
                            icon: "\uD835\uDD4F",
                            action: () =>
                                window.open(
                                    `https://x.com/intent/tweet?text=${encodeURIComponent("Check out " + maker.name + " on maven!")}&url=${encodeURIComponent(shareUrl)}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                ),
                        },
                    ].map((opt) => (
                        <button
                            key={opt.label}
                            onClick={opt.action}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 8,
                                padding: "16px 8px",
                                borderRadius: 14,
                                border: `1px solid ${theme.border}`,
                                background: theme.card,
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = theme.surface
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = theme.card
                            }}
                        >
                            <span style={{ fontSize: 22, lineHeight: 1 }}>{opt.icon}</span>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.textSecondary,
                                }}
                            >
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
})
