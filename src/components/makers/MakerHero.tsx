import React, { memo } from "react"
import { optimizeImageUrl, imageSrcSet, IMG_QUALITY } from "../../utils/image"
import { formatDistance } from "../../utils/distance"
import type { Maker } from "../../types"

interface MakerHeroProps {
    maker: Maker
    heroRef: React.RefObject<HTMLDivElement | null>
    isDark: boolean
    minHeroHeight?: number
}

export default memo(function MakerHero({ maker, heroRef, isDark, minHeroHeight = 190 }: MakerHeroProps) {
    const hasGallery = maker.gallery_urls && maker.gallery_urls.length > 0
    const heroImage = hasGallery ? maker.gallery_urls[0] : null
    const heroSrc = heroImage
        ? (optimizeImageUrl(heroImage, 800, { quality: IMG_QUALITY.hero }) ?? undefined)
        : undefined

    // If the image was preloaded (handleMakerTap), it's already in the browser cache —
    // show immediately instead of fading from black
    const isCached = (() => {
        if (!heroSrc) return false
        const img = new Image()
        img.src = heroSrc
        return img.complete
    })()

    return (
        <div
            ref={heroRef}
            style={{
                position: "relative",
                background: "#1a1a1a",
                minHeight: minHeroHeight,
            }}
        >
            {heroSrc && (
                <img
                    src={heroSrc}
                    srcSet={imageSrcSet(heroImage!, 400, { quality: IMG_QUALITY.hero })}
                    sizes="100vw"
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
                        opacity: isCached ? 1 : 0,
                        transition: isCached ? "none" : "opacity 0.3s ease",
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
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 6,
                    }}
                >
                    {maker.category} {maker.city && `\u2014 ${maker.city}`}
                </div>

                <h1
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 26,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
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
