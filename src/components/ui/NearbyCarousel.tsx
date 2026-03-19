import { memo, useMemo } from "react"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import { getDistance, formatDistance } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import type { Maker } from "../../types"
import { font } from "../../styles/tokens"

interface NearbyCarouselProps {
    makers: Maker[]
    onMakerTap: (maker: Maker) => void
    /** Anchor maker — distances computed from this maker's location. Used on maker profile pages. */
    anchor?: Maker
    /** User location — uses pre-computed maker.distance. Used on the discover page. */
    userLocation?: { lat: number; lng: number } | null
    excludeIds?: Set<string>
    /** Top padding — maker pages use 32px, discover uses 20px */
    topPadding?: number
    isDebug?: boolean
}

type MakerWithDist = Maker & { _dist: number }

export default memo(function NearbyCarousel({
    makers,
    onMakerTap,
    anchor,
    userLocation,
    excludeIds,
    topPadding = 20,
    isDebug,
}: NearbyCarouselProps) {
    const { theme } = useTheme()

    const nearbyMakers = useMemo(() => {
        if (anchor) {
            // Maker page mode: compute distances from anchor, dynamic radius expansion
            const candidates = makers
                .filter((m) => m.id !== anchor.id)
                .filter((m) => !excludeIds?.has(m.id))
                .map(
                    (m) =>
                        ({
                            ...m,
                            _dist: getDistance(anchor.lat, anchor.lng, m.lat, m.lng),
                        }) as MakerWithDist,
                )
                .sort((a, b) => a._dist - b._dist)

            let radius = 2
            let result = candidates.filter((m) => m._dist <= radius)
            if (result.length < 3) {
                radius = 10
                result = candidates.filter((m) => m._dist <= radius)
            }
            if (result.length < 3) {
                radius = 30
                result = candidates.filter((m) => m._dist <= radius)
            }
            return result.slice(0, 5)
        }

        if (userLocation) {
            // Discover page mode: use pre-computed maker.distance
            return makers
                .filter((m) => !excludeIds?.has(m.id))
                .filter((m) => m.distance != null && m.distance <= 50)
                .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
                .slice(0, 8)
                .map((m) => ({ ...m, _dist: m.distance ?? 0 }) as MakerWithDist)
        }

        return []
    }, [makers, anchor, userLocation, excludeIds])

    const minCount = anchor ? 2 : 3
    if (nearbyMakers.length < minCount) return null

    // Smart heading
    const farthest = nearbyMakers[nearbyMakers.length - 1]?._dist ?? 0
    const nearbyCities = new Set(nearbyMakers.map((m) => m.city))
    const closestCity = nearbyMakers[0]?.city ?? ""
    const closestCounty = nearbyMakers[0]?.county ?? ""

    let headingText: string
    if (anchor) {
        const allSameCity = nearbyCities.size === 1 && closestCity === anchor.city
        headingText =
            allSameCity && farthest <= 2
                ? "AROUND THE CORNER"
                : allSameCity
                  ? `NEARBY IN ${anchor.city.toUpperCase()}`
                  : farthest <= 15
                    ? "A SHORT DRIVE"
                    : `MORE IN ${(anchor.county || "THE AREA").toUpperCase()}`
    } else {
        const allSameCity = nearbyCities.size === 1
        headingText =
            allSameCity && farthest <= 2
                ? "AROUND THE CORNER"
                : allSameCity
                  ? `MAKERS IN ${closestCity.toUpperCase()}`
                  : farthest <= 15
                    ? "MAKERS NEAR YOU"
                    : `MAKERS IN ${closestCounty.toUpperCase()}`
    }

    return (
        <div style={{ padding: `${topPadding}px 0 0` }}>
            <div style={{ padding: "0 20px 12px" }}>
                <div
                    style={{
                        fontFamily: font.heading,
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

                            {isDebug && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: 6,
                                        left: 6,
                                        background: "rgba(0,0,0,0.7)",
                                        color: "#fff",
                                        fontSize: 9,
                                        fontFamily: "monospace",
                                        padding: "2px 5px",
                                        borderRadius: 0,
                                        zIndex: 5,
                                    }}
                                >
                                    #{maker.rank} {"\u00B7"} {(maker.score ?? 0).toFixed(2)} {"\u00B7"}{" "}
                                    {maker._dist.toFixed(1)}km
                                </span>
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
                                        fontFamily: font.body,
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
                                        fontFamily: font.body,
                                        fontSize: 9.5,
                                        color: "rgba(255,255,255,0.35)",
                                    }}
                                >
                                    {formatDistance(maker._dist)}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
})
