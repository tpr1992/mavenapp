import { memo, useMemo } from "react"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import { getDistance, formatDistance } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import type { Maker } from "../../types"

interface NearbyMakersCarouselProps {
    currentMaker: Maker
    makers: Maker[]
    onMakerTap: (maker: Maker) => void
    excludeIds?: Set<string>
}

type MakerWithDistance = Maker & { distanceFromMaker: number }

export default memo(function NearbyMakersCarousel({
    currentMaker,
    makers,
    onMakerTap,
    excludeIds,
}: NearbyMakersCarouselProps) {
    const { theme } = useTheme()

    const nearbyMakers = useMemo(() => {
        const candidates = makers
            .filter((m) => m.id !== currentMaker.id)
            .filter((m) => !excludeIds?.has(m.id))
            .map(
                (m) =>
                    ({
                        ...m,
                        distanceFromMaker: getDistance(currentMaker.lat, currentMaker.lng, m.lat, m.lng),
                    }) as MakerWithDistance,
            )
            .sort((a, b) => a.distanceFromMaker - b.distanceFromMaker)

        // Dynamic radius: find the natural "cluster" of nearby makers
        // Start tight (2km), expand only if we don't have enough
        let radius = 2
        let result = candidates.filter((m) => m.distanceFromMaker <= radius)

        // If fewer than 3 within 2km, expand to 10km
        if (result.length < 3) {
            radius = 10
            result = candidates.filter((m) => m.distanceFromMaker <= radius)
        }

        // If still fewer than 3, expand to 30km (but no further)
        if (result.length < 3) {
            radius = 30
            result = candidates.filter((m) => m.distanceFromMaker <= radius)
        }

        // Cap at 5 — this is a hint, not a directory
        return result.slice(0, 5)
    }, [makers, currentMaker.id, currentMaker.lat, currentMaker.lng, excludeIds])

    if (nearbyMakers.length < 2) return null

    const farthest = nearbyMakers[nearbyMakers.length - 1]?.distanceFromMaker ?? 0
    const nearbyCities = new Set(nearbyMakers.map((m) => m.city))
    const allSameCity = nearbyCities.size === 1 && nearbyMakers[0]?.city === currentMaker.city

    const headingText =
        allSameCity && farthest <= 2
            ? "AROUND THE CORNER"
            : allSameCity
              ? `NEARBY IN ${currentMaker.city.toUpperCase()}`
              : farthest <= 15
                ? "A SHORT DRIVE"
                : `MORE IN ${(currentMaker.county || "THE AREA").toUpperCase()}`

    return (
        <div style={{ padding: "32px 0 0" }}>
            <div style={{ padding: "0 20px 14px" }}>
                <div
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14,
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
                                    {formatDistance(maker.distanceFromMaker)}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
})
