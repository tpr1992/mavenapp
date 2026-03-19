import { useTheme } from "../../contexts/ThemeContext"
import { optimizeImageUrl } from "../../utils/image"
import type { Maker } from "../../types"
import { font } from "../../styles/tokens"

interface RecentlyViewedProps {
    recentlyViewedIds: string[]
    makers: Maker[]
    onMakerTap: (maker: Maker) => void
}

export default function RecentlyViewed({ recentlyViewedIds, makers, onMakerTap }: RecentlyViewedProps) {
    const { theme } = useTheme()

    if (recentlyViewedIds.length === 0) return null

    return (
        <div>
            <div
                style={{
                    padding: "20px 20px 12px",
                    fontFamily: font.body,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: theme.textMuted,
                }}
            >
                Recently Viewed
            </div>
            <div
                style={{
                    display: "flex",
                    gap: 3,
                    padding: "0 3px",
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {(recentlyViewedIds || [])
                    .slice(0, 8)
                    .map((id) => makers.find((m) => m.id === id))
                    .filter(Boolean)
                    .map(
                        (maker) =>
                            maker && (
                                <div
                                    key={maker.id}
                                    onClick={() => onMakerTap(maker)}
                                    style={{
                                        minWidth: 120,
                                        height: 140,
                                        overflow: "hidden",
                                        position: "relative",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                    }}
                                >
                                    {maker.gallery_urls?.[0] ? (
                                        <img
                                            src={optimizeImageUrl(maker.gallery_urls[0], 300) ?? undefined}
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
                                                background: maker.hero_color || theme.surface,
                                            }}
                                        />
                                    )}
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: "50%",
                                            background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))",
                                            pointerEvents: "none",
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 8,
                                            left: 8,
                                            right: 8,
                                            fontFamily: font.body,
                                            fontSize: 10,
                                            fontWeight: 500,
                                            color: "#fff",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {maker.name}
                                    </div>
                                </div>
                            ),
                    )}
            </div>
        </div>
    )
}
