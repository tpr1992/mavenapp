import { memo } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import CategoryIcon from "../ui/CategoryIcon"
import { isOpenNow } from "../../utils/time"
import { formatLocationName } from "../../utils/distance"
import { optimizeImageUrl } from "../../utils/image"
import Carousel, { TRANSITION_IOS } from "../ui/Carousel"
import type { Maker } from "../../types"

interface TrendingCardProps {
    maker: Maker
    onTap: (maker: Maker) => void
    showOpenStatus: boolean
    isDark: boolean
}

function TrendingCard({ maker, onTap, showOpenStatus, isDark }: TrendingCardProps) {
    return (
        <div onClick={() => onTap(maker)} style={{ padding: "0 4px", cursor: "pointer" }}>
            <div
                style={{
                    background: maker.gallery_urls?.[0]
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.75) 100%), url(${optimizeImageUrl(maker.gallery_urls[0], 400)}) center/cover`
                        : maker.hero_color,
                    borderRadius: 20,
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                    filter: isDark ? "brightness(0.78) saturate(0.85)" : "none",
                    minHeight: 160,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -30,
                        right: -30,
                        width: 150,
                        height: 150,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -50,
                        left: -20,
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.04)",
                    }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.6)",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                        }}
                    >
                        Trending This Week
                    </span>
                </div>
                <h2
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#fff",
                        margin: "10px 0 8px",
                        lineHeight: 1.2,
                    }}
                >
                    {maker.name}
                </h2>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13.5,
                        color: "rgba(255,255,255,0.8)",
                        margin: 0,
                        lineHeight: 1.5,
                        maxWidth: 280,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {maker.bio}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            lineHeight: 1,
                            color: "rgba(255,255,255,0.6)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                        }}
                    >
                        <CategoryIcon category={maker.category} /> {maker.category}
                    </span>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            lineHeight: 1,
                            color: "rgba(255,255,255,0.6)",
                        }}
                    >
                        {`\u25C8 ${formatLocationName(maker, { full: true })}`}
                    </span>
                    {showOpenStatus && (
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: isOpenNow(maker.opening_hours)
                                    ? "rgba(134,239,172,0.9)"
                                    : "rgba(255,255,255,0.4)",
                            }}
                        >
                            {isOpenNow(maker.opening_hours) ? "\u25CF Open" : "\u25CB Closed"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

interface TrendingCarouselProps {
    makers: Maker[]
    onTap: (maker: Maker) => void
    showOpenStatus: boolean
}

export default memo(function TrendingCarousel({ makers, onTap, showOpenStatus }: TrendingCarouselProps) {
    const { isDark } = useTheme()
    if (!makers.length) return null
    return (
        <Carousel
            items={makers}
            renderItem={(maker) => (
                <TrendingCard maker={maker} onTap={onTap} showOpenStatus={showOpenStatus} isDark={isDark} />
            )}
            loop
            autoPlay={7000}
            transition={TRANSITION_IOS}
            dots="pill"
        />
    )
})
