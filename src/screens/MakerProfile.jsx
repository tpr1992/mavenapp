import { useState, useRef, useEffect, useCallback } from "react"
import { Helmet } from "react-helmet-async"
import { CATEGORY_EMOJI } from "../constants/categories"
import { isOpenNow, formatHoursRange, DAYS } from "../utils/time"
import { formatDistance } from "../utils/distance"
import MakerAvatar from "../components/ui/MakerAvatar"
import GalleryPlaceholder from "../components/ui/GalleryPlaceholder"
import { useTheme } from "../contexts/ThemeContext"

export default function MakerProfile({ maker, onBack, isSaved, onToggleSave, scrollContainerRef, onLogoTap }) {
    const [showShare, setShowShare] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showCompact, setShowCompact] = useState(false)
    const heroRef = useRef(null)
    const { theme } = useTheme()

    const shareUrl = window.location.origin + "/?maker=" + maker.slug

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
        } catch {}
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [shareUrl])

    const handleShare = useCallback(() => {
        setShowShare(true)
        setCopied(false)
    }, [])

    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        const onScroll = () => {
            const heroBottom = heroRef.current?.offsetHeight || 0
            setShowCompact(el.scrollTop > heroBottom - 48)
        }
        el.addEventListener("scroll", onScroll, { passive: true })
        return () => el.removeEventListener("scroll", onScroll)
    }, [scrollContainerRef])

    const pageTitle = `${maker.name} — ${maker.category} in ${maker.city} | maven`
    const pageDescription = maker.bio.length > 155 ? maker.bio.slice(0, 152) + "..." : maker.bio

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: maker.name,
        description: maker.bio,
        address: {
            "@type": "PostalAddress",
            streetAddress: maker.address,
            addressLocality: maker.city,
            addressCountry: maker.country,
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: maker.lat,
            longitude: maker.lng,
        },
        url: shareUrl,
        ...(maker.website_url && { sameAs: [maker.website_url] }),
    }

    return (
        <div style={{ paddingBottom: 100, animation: "fadeSlideIn 0.25s ease" }}>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:url" content={shareUrl} />
                <meta property="og:type" content="profile" />
                <link rel="canonical" href={shareUrl} />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Helmet>

            {/* Compact sticky header */}
            <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
                <div
                    style={{
                        background: theme.bg,
                        borderBottom: showCompact ? `1px solid ${theme.border}` : "1px solid transparent",
                        transform: showCompact ? "translateY(0)" : "translateY(-100%)",
                        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.3s ease",
                        pointerEvents: showCompact ? "auto" : "none",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 16px 10px 12px",
                        }}
                    >
                        {/* Back button */}
                        <button
                            onClick={onBack}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                border: "none",
                                background: theme.pill,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 15,
                                color: theme.textSecondary,
                            }}
                        >
                            {"\u2190"}
                        </button>

                        {/* Logo + maker name */}
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                minWidth: 0,
                            }}
                        >
                            <span
                                onClick={onLogoTap}
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: theme.text,
                                    letterSpacing: "-0.02em",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                maven
                            </span>
                            <div
                                style={{
                                    width: 3,
                                    height: 3,
                                    borderRadius: "50%",
                                    background: theme.textMuted,
                                    flexShrink: 0,
                                }}
                            />
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: theme.textSecondary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    minWidth: 0,
                                }}
                            >
                                {maker.name}
                            </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                                onClick={handleShare}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 14,
                                    color: theme.textSecondary,
                                }}
                            >
                                {"\u2197"}
                            </button>
                            <button
                                onClick={() => onToggleSave(maker.id)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    color: isSaved ? "#c53030" : "#999",
                                    transition: "color 0.2s ease",
                                }}
                            >
                                {isSaved ? "\u2665" : "\u2661"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div
                ref={heroRef}
                style={{
                    background: maker.hero_color,
                    padding: "16px 20px 32px",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -60,
                        right: -60,
                        width: 200,
                        height: 200,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)",
                    }}
                />

                {/* Top bar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 10,
                    }}
                >
                    <button
                        onClick={onBack}
                        style={{
                            background: "rgba(255,255,255,0.15)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 100,
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#fff",
                            fontSize: 16,
                            flexShrink: 0,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                                d="M10 3L5.5 8L10 13"
                                stroke="#fff"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    <span
                        onClick={onLogoTap}
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 17,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.9)",
                            letterSpacing: "-0.02em",
                            cursor: "pointer",
                            lineHeight: 1,
                        }}
                    >
                        maven
                    </span>

                    <div style={{ flex: 1 }} />

                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            onClick={handleShare}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 100,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 15,
                            }}
                        >
                            {"\u2197"}
                        </button>
                        <button
                            onClick={() => onToggleSave(maker.id)}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 100,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 17,
                                color: isSaved ? "#fc8181" : "rgba(255,255,255,0.85)",
                                transition: "color 0.2s ease",
                            }}
                        >
                            {isSaved ? "\u2665" : "\u2661"}
                        </button>
                    </div>
                </div>

                {/* Maker Info */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                    <MakerAvatar maker={maker} size={64} />
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h1
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: "#fff",
                                    margin: 0,
                                    lineHeight: 1.2,
                                }}
                            >
                                {maker.name}
                            </h1>
                            {maker.is_verified && (
                                <span
                                    style={{
                                        background: "rgba(255,255,255,0.2)",
                                        padding: "2px 8px",
                                        borderRadius: 100,
                                        fontSize: 10,
                                        color: "#fff",
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontWeight: 600,
                                    }}
                                >
                                    Verified
                                </span>
                            )}
                        </div>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: "rgba(255,255,255,0.7)",
                                marginTop: 4,
                            }}
                        >
                            {maker.address}, {maker.city}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "24px 20px" }}>
                {/* Category Tags */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <span
                        style={{
                            padding: "6px 12px",
                            borderRadius: 100,
                            background: theme.pill,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                            color: theme.textSecondary,
                        }}
                    >
                        {CATEGORY_EMOJI[maker.category]} {maker.category}
                    </span>
                    <span
                        style={{
                            padding: "6px 12px",
                            borderRadius: 100,
                            background: isOpenNow(maker.opening_hours) ? "#f0fff4" : "#fef5f5",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                            color: isOpenNow(maker.opening_hours) ? "#22543d" : "#9b2c2c",
                        }}
                    >
                        {isOpenNow(maker.opening_hours) ? "\u25CF Open Now" : "\u25CB Closed"}
                    </span>
                </div>

                {/* Bio */}
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        color: theme.text,
                        lineHeight: 1.65,
                        margin: "0 0 24px",
                    }}
                >
                    {maker.bio}
                </p>

                {/* Stats */}
                <div
                    style={{
                        display: "flex",
                        gap: 0,
                        background: theme.surface,
                        borderRadius: 14,
                        padding: 4,
                        marginBottom: 24,
                    }}
                >
                    {[
                        {
                            label: "Distance",
                            value: maker.distance != null ? formatDistance(maker.distance) : maker.city,
                        },
                        { label: "Making for", value: `${maker.years_active} yrs` },
                        { label: "Based in", value: maker.country },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                textAlign: "center",
                                padding: "14px 8px",
                                borderRight: i < 2 ? `1px solid ${theme.border}` : "none",
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: theme.textMuted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: 4,
                                }}
                            >
                                {stat.label}
                            </div>
                            <div
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: theme.text,
                                }}
                            >
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Gallery */}
                <div style={{ marginBottom: 24 }}>
                    <h3
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: theme.text,
                            margin: "0 0 12px",
                        }}
                    >
                        Studio
                    </h3>
                    <GalleryPlaceholder maker={maker} />
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: theme.textMuted,
                            textAlign: "center",
                            marginTop: 8,
                            fontStyle: "italic",
                        }}
                    >
                        Gallery images from maker
                    </p>
                </div>

                {/* Hours */}
                <div style={{ marginBottom: 24 }}>
                    <h3
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: theme.text,
                            margin: "0 0 12px",
                        }}
                    >
                        Opening Hours
                    </h3>
                    <div
                        style={{
                            background: theme.surface,
                            borderRadius: 14,
                            padding: "14px 18px",
                        }}
                    >
                        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                            const hours = maker.opening_hours[day]
                            const isToday = DAYS[new Date().getDay()] === day
                            return (
                                <div
                                    key={day}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "7px 0",
                                        borderBottom: day !== "sun" ? `1px solid ${theme.border}` : "none",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 13,
                                            fontWeight: isToday ? 700 : 400,
                                            color: isToday ? theme.text : theme.textSecondary,
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {day}
                                        {isToday ? " \u00B7" : ""}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 13,
                                            fontWeight: isToday ? 600 : 400,
                                            color:
                                                !hours || hours === "closed"
                                                    ? theme.textMuted
                                                    : isToday
                                                      ? theme.text
                                                      : theme.textSecondary,
                                        }}
                                    >
                                        {formatHoursRange(hours)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Links */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {maker.instagram_handle && (
                        <a
                            href={`https://instagram.com/${maker.instagram_handle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                background: theme.surface,
                                borderRadius: 12,
                                textDecoration: "none",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textSecondary,
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{"\uD83D\uDCF7"}</span>
                            {maker.instagram_handle}
                        </a>
                    )}
                    {maker.website_url && (
                        <a
                            href={maker.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                background: theme.surface,
                                borderRadius: 12,
                                textDecoration: "none",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textSecondary,
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{"\uD83C\uDF10"}</span>
                            {maker.website_url.replace("https://", "")}
                        </a>
                    )}
                </div>

                {/* CTA */}
                <button
                    onClick={() =>
                        window.open(
                            `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`,
                            "_blank",
                            "noopener,noreferrer",
                        )
                    }
                    style={{
                        width: "100%",
                        padding: "16px 24px",
                        borderRadius: 14,
                        border: "none",
                        background: theme.btnBg,
                        color: theme.btnText,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "opacity 0.2s ease",
                        letterSpacing: "0.01em",
                    }}
                >
                    Visit Studio — Get Directions {"\u2197"}
                </button>
            </div>

            {/* Share modal */}
            {showShare && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setShowShare(false)}
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
                            maxWidth: 430,
                            width: "100%",
                            animation: "slideUp 0.25s ease",
                        }}
                    >
                        {/* Drag handle */}
                        <div
                            style={{
                                width: 36,
                                height: 4,
                                borderRadius: 100,
                                background: theme.border,
                                margin: "0 auto 20px",
                            }}
                        />

                        {/* Header */}
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

                        {/* Link display + copy */}
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
                                onClick={handleCopyLink}
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

                        {/* Share options */}
                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                justifyContent: "center",
                            }}
                        >
                            {[
                                {
                                    label: "Email",
                                    icon: "\u2709",
                                    action: () =>
                                        window.open(
                                            `mailto:?subject=${encodeURIComponent("Check out " + maker.name + " on maven")}&body=${encodeURIComponent("I found this maker on maven — thought you'd like them!\n\n" + maker.name + "\n" + maker.bio.slice(0, 100) + "...\n\n" + shareUrl)}`,
                                            "_blank",
                                        ),
                                },
                                {
                                    label: "WhatsApp",
                                    icon: "\uD83D\uDCAC",
                                    action: () =>
                                        window.open(
                                            `https://wa.me/?text=${encodeURIComponent("Check out " + maker.name + " on maven!\n" + shareUrl)}`,
                                            "_blank",
                                        ),
                                },
                                {
                                    label: "X",
                                    icon: "\uD835\uDD4F",
                                    action: () =>
                                        window.open(
                                            `https://x.com/intent/tweet?text=${encodeURIComponent("Check out " + maker.name + " on maven!")}&url=${encodeURIComponent(shareUrl)}`,
                                            "_blank",
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
            )}
        </div>
    )
}
