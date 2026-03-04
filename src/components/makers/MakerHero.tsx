import React, { useState, memo } from "react"
import { optimizeImageUrl } from "../../utils/image"
import { formatDistance } from "../../utils/distance"
import { safeOpen } from "../../utils/safeOpen"
import type { Maker, Theme } from "../../types"

interface MakerHeroProps {
    maker: Maker
    onBack: () => void
    onLogoTap: () => void
    onShare: () => void
    onToggleSave: (id: string) => void
    isSaved: boolean
    heroRef: React.RefObject<HTMLDivElement | null>
    isDark: boolean
    theme: Theme
}

export default memo(function MakerHero({
    maker,
    onBack,
    onLogoTap,
    onShare,
    onToggleSave,
    isSaved,
    heroRef,
    isDark,
    theme,
}: MakerHeroProps) {
    const hasGallery = maker.gallery_urls && maker.gallery_urls.length > 0
    const heroImage = hasGallery ? maker.gallery_urls[0] : null
    const [menuOpen, setMenuOpen] = useState(false)

    const frostedBtn = {
        background: "rgba(20,20,20,0.35)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "50%",
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }

    const iconColor = "rgba(255,255,255,0.7)"
    const menuItems = [
        {
            label: "Share",
            icon: (
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={iconColor}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
            ),
            action: () => {
                setMenuOpen(false)
                onShare()
            },
        },
        {
            label: "Directions",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z"
                        fill={iconColor}
                    />
                </svg>
            ),
            action: () => {
                setMenuOpen(false)
                window.open(
                    /android/i.test(navigator.userAgent)
                        ? `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}`
                        : `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`,
                    "_blank",
                    "noopener,noreferrer",
                )
            },
        },
        ...(maker.website_url
            ? [
                  {
                      label: "Website",
                      icon: (
                          <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={iconColor}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          >
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                      ),
                      action: () => {
                          setMenuOpen(false)
                          safeOpen(maker.website_url)
                      },
                  },
              ]
            : []),
    ]

    return (
        <div
            ref={heroRef}
            style={{
                position: "relative",
                background: "#1a1a1a",
                minHeight: 190,
            }}
        >
            {heroImage && (
                <img
                    src={optimizeImageUrl(heroImage, 400) ?? undefined}
                    alt=""
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={(e) => {
                        ;(e.target as HTMLImageElement).style.opacity = "1"
                    }}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: isDark ? "brightness(0.75) saturate(0.9)" : "brightness(0.9) saturate(1)",
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                    }}
                />
            )}

            {/* Subtle bottom scrim for text legibility only */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "60%",
                    background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 100%)",
                    pointerEvents: "none",
                }}
            />

            {/* Top bar */}
            <div
                style={{
                    position: "relative",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    padding: "16px 16px 0",
                    gap: 10,
                }}
            >
                <button onClick={onBack} aria-label="Go back" style={frostedBtn}>
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

                <div style={{ display: "flex", gap: 6, position: "relative" }}>
                    <button
                        onClick={() => onToggleSave(maker.id)}
                        aria-label={isSaved ? "Unsave" : "Save"}
                        style={{
                            ...frostedBtn,
                            fontSize: 17,
                            color: isSaved ? "#fc8181" : "rgba(255,255,255,0.85)",
                            transition: "color 0.2s ease",
                        }}
                    >
                        {isSaved ? "\u2665" : "\u2661"}
                    </button>
                    <button onClick={() => setMenuOpen((v) => !v)} aria-label="More options" style={frostedBtn}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="3.5" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
                            <circle cx="8" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
                            <circle cx="12.5" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
                        </svg>
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                        <>
                            <div
                                onClick={() => setMenuOpen(false)}
                                style={{ position: "fixed", inset: 0, zIndex: 90 }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    right: 0,
                                    background: "rgba(30,30,30,0.55)",
                                    backdropFilter: "blur(20px) saturate(1.4)",
                                    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                                    borderRadius: 14,
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.15)",
                                    minWidth: 180,
                                    zIndex: 100,
                                    overflow: "hidden",
                                    animation: "fadeSlideIn 0.15s ease",
                                }}
                            >
                                {menuItems.map((item, i) => (
                                    <button
                                        key={item.label}
                                        onClick={item.action}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "13px 16px",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: "rgba(255,255,255,0.9)",
                                            borderBottom:
                                                i < menuItems.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                                            textAlign: "left",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 20,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Maker info */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    padding: "20px 20px 16px",
                }}
            >
                <div
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 6,
                    }}
                >
                    {maker.category} {maker.city && `\u00B7 ${maker.city}`}
                </div>

                <h1
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#fff",
                        margin: 0,
                        lineHeight: 1.1,
                        marginBottom: 6,
                    }}
                >
                    {maker.name}
                </h1>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11.5,
                        color: "rgba(255,255,255,0.55)",
                    }}
                >
                    <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="2"
                    >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    {maker.address} {maker.distance != null && `\u00B7 ${formatDistance(maker.distance)}`}
                </div>
            </div>
        </div>
    )
})
