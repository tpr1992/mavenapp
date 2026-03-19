import { memo, useMemo } from "react"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import { formatDistance } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import type { Maker } from "../../types"

interface NearbyMakersStripProps {
    makers: Maker[]
    onMakerTap: (maker: Maker) => void
    userLocation: { lat: number; lng: number } | null
    excludeIds?: Set<string>
}

export default memo(function NearbyMakersStrip({
    makers,
    onMakerTap,
    userLocation,
    excludeIds,
}: NearbyMakersStripProps) {
    const { theme } = useTheme()

    const nearbyMakers = useMemo(() => {
        if (!userLocation) return []

        return makers
            .filter((m) => !excludeIds?.has(m.id))
            .filter((m) => m.distance != null && m.distance <= 50)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
            .slice(0, 8)
    }, [makers, userLocation, excludeIds])

    if (!userLocation || nearbyMakers.length < 3) return null

    const farthest = nearbyMakers[nearbyMakers.length - 1]?.distance ?? 0
    const nearbyCities = new Set(nearbyMakers.map((m) => m.city))
    const closestCity = nearbyMakers[0]?.city ?? ""
    const closestCounty = nearbyMakers[0]?.county ?? ""
    const allSameCity = nearbyCities.size === 1

    const headingText =
        allSameCity && farthest <= 2
            ? "AROUND THE CORNER"
            : allSameCity
              ? `MAKERS IN ${closestCity.toUpperCase()}`
              : farthest <= 15
                ? "MAKERS NEAR YOU"
                : `MAKERS IN ${closestCounty.toUpperCase()}`

    return (
        <div style={{ padding: "20px 0 0" }}>
            <div style={{ padding: "0 20px 12px" }}>
                <div
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase" as const,
                        color: theme.text,
                    }}
                >
                    {headingText}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 3,
                    padding: "0 3px",
                    overflowX: "auto",
                    scrollbarWidth: "none" as const,
                    WebkitOverflowScrolling: "touch",
                    scrollSnapType: "x mandatory",
                }}
            >
                {nearbyMakers.map((maker) => {
                    const heroUrl = maker.gallery_urls?.[0]
                    const imgSrc = heroUrl ? optimizeImageUrl(heroUrl, 400) : null

                    return (
                        <div
                            key={maker.id}
                            onClick={() => onMakerTap(maker)}
                            style={{
                                minWidth: 155,
                                height: 220,
                                overflow: "hidden",
                                position: "relative",
                                cursor: "pointer",
                                flexShrink: 0,
                                scrollSnapAlign: "start",
                            }}
                        >
                            {imgSrc ? (
                                <img
                                    src={imgSrc}
                                    srcSet={heroUrl ? imageSrcSet(heroUrl, 400) : undefined}
                                    alt={maker.name}
                                    loading="lazy"
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
                                        opacity: 0,
                                        transition: "opacity 0.3s ease",
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: maker.hero_color || (theme.surface as string),
                                    }}
                                />
                            )}

                            {/* Bottom gradient */}
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: "50%",
                                    background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))",
                                    pointerEvents: "none",
                                }}
                            />

                            {/* Text */}
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: "0 10px 10px",
                                    zIndex: 2,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: "#fff",
                                        marginBottom: 2,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {maker.name}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 9.5,
                                        color: "rgba(255,255,255,0.35)",
                                    }}
                                >
                                    {maker.distance != null ? formatDistance(maker.distance) : maker.city}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
})
