import { memo } from "react"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import { formatLocation } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import type { Maker } from "../../types"

interface RelatedMakersFeedProps {
    makers: Maker[]
    onMakerTap: (maker: Maker) => void
    columnCount?: number
}

const HEIGHT_VARIANTS = [220, 260, 190, 240, 210]

export default memo(function RelatedMakersFeed({ makers, onMakerTap, columnCount = 2 }: RelatedMakersFeedProps) {
    const { theme } = useTheme()

    if (!makers.length) return null

    return (
        <div style={{ marginTop: 28 }}>
            <div style={{ padding: "24px 20px 12px" }}>
                <h3
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 18,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color: theme.text,
                        margin: 0,
                    }}
                >
                    Discover more
                </h3>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: theme.textMuted,
                        fontWeight: 400,
                        letterSpacing: "0.02em",
                        margin: "4px 0 0",
                    }}
                >
                    Makers you might love
                </p>
            </div>

            <div style={{ display: "flex", gap: 3, alignItems: "flex-start", padding: "0 3px" }}>
                {Array.from({ length: columnCount }, (_, col) => (
                    <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                        {makers
                            .filter((_, i) => i % columnCount === col)
                            .map((m, i) => {
                                const heroUrl = m.gallery_urls?.[0]
                                const imgHeight = HEIGHT_VARIANTS[(i + col) % HEIGHT_VARIANTS.length]
                                const delay = Math.min(i * 0.06, 0.5)

                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => onMakerTap(m)}
                                        style={{
                                            cursor: "pointer",
                                            animation: `fadeSlideIn 0.4s ease ${delay}s both`,
                                        }}
                                    >
                                        {/* Image — clean, no overlay */}
                                        <div
                                            style={{
                                                height: imgHeight,
                                                background: theme.surface,
                                                overflow: "hidden",
                                                borderRadius: 0,
                                            }}
                                        >
                                            {heroUrl ? (
                                                <img
                                                    src={optimizeImageUrl(heroUrl, 300) ?? undefined}
                                                    srcSet={imageSrcSet(heroUrl, 300)}
                                                    alt={m.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onLoad={(e) => {
                                                        ;(e.target as HTMLImageElement).style.opacity = "1"
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                        opacity: 0,
                                                        transition: "opacity 0.35s ease",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontFamily: "'DM Sans', sans-serif",
                                                            fontSize: 12,
                                                            color: theme.textMuted,
                                                        }}
                                                    >
                                                        {m.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Name + location below image */}
                                        <div style={{ padding: "8px 8px 10px" }}>
                                            <div
                                                style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    color: theme.text,
                                                    lineHeight: 1.2,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {m.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 10.5,
                                                    color: theme.textMuted,
                                                    marginTop: 1,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {formatLocation(m)}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
                <span
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: theme.textMuted,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                    }}
                >
                    {makers.length} makers to explore
                </span>
            </div>
        </div>
    )
})
