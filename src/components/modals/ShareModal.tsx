import { useState, memo } from "react"
import useBreakpoint from "../../hooks/useBreakpoint"
import type { Maker, Theme } from "../../types"

interface ShareModalProps {
    maker: Maker
    theme: Theme
    shareUrl: string
    onClose: () => void
}

const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)

function getDirectionsUrl(maker: Maker): string {
    const label = encodeURIComponent(maker.name)
    if (isIOS) {
        // Universal Link — Chrome/Safari on iOS both handle this correctly:
        // iOS intercepts the link and opens Apple Maps without any browser navigation
        return `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}&q=${label}`
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}&query=${label}`
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

    const directionsUrl = getDirectionsUrl(maker)

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

                {/* Directions — native <a> with Universal Link for iOS, Google Maps for others */}
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Get directions to ${maker.name}`}
                    onClick={onClose}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: `1px solid ${theme.border}`,
                        background: theme.surface,
                        cursor: "pointer",
                        marginBottom: 20,
                        textDecoration: "none",
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: theme.card,
                            border: `1px solid ${theme.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={theme.textSecondary}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="3 11 22 2 13 21 11 13 3 11" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                color: theme.text,
                            }}
                        >
                            Get Directions
                        </div>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                color: theme.textMuted,
                                marginTop: 1,
                            }}
                        >
                            Open in {isIOS ? "Apple" : "Google"} Maps
                        </div>
                    </div>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.textMuted}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </a>

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
                        aria-label={copied ? "Link copied" : "Copy share link"}
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
                            aria-label={`Share via ${opt.label}`}
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
