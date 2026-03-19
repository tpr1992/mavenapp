import { memo, useMemo } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import { isOpenNow } from "../../utils/time"
import { formatLocationName } from "../../utils/distance"
import { optimizeImageUrl, imageSrcSet, IMG_QUALITY } from "../../utils/image"
import Carousel from "../ui/Carousel"
import type { Maker } from "../../types"
import { font } from "../../styles/tokens"

interface TrendingCardProps {
    maker: Maker
    onTap: (maker: Maker) => void
    showOpenStatus: boolean
    isDark: boolean
    isDebug?: boolean
    imageWidth?: number
}

function TrendingCard({ maker, onTap, showOpenStatus, isDark, isDebug, imageWidth = 400 }: TrendingCardProps) {
    return (
        <div onClick={() => onTap(maker)} style={{ padding: "0 4px", cursor: "pointer" }}>
            <div
                style={{
                    background: maker.gallery_urls?.[0] ? undefined : maker.hero_color,
                    borderRadius: 0,
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                    filter: isDark ? "brightness(0.78) saturate(0.85)" : "none",
                    height: 360,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                }}
            >
                {maker.gallery_urls?.[0] && (
                    <>
                        <img
                            src={
                                optimizeImageUrl(maker.gallery_urls[0], imageWidth, { quality: IMG_QUALITY.hero }) ??
                                undefined
                            }
                            srcSet={imageSrcSet(maker.gallery_urls[0], imageWidth, { quality: IMG_QUALITY.hero })}
                            width={imageWidth}
                            height={Math.round(imageWidth * 0.75)}
                            alt=""
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                height: "50%",
                                background:
                                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.55) 100%)",
                            }}
                        />
                    </>
                )}
                {isDebug && (
                    <span
                        style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            background: "rgba(0,0,0,0.7)",
                            color: "#fff",
                            fontSize: 10,
                            fontFamily: "monospace",
                            padding: "2px 6px",
                            borderRadius: 0,
                            zIndex: 5,
                        }}
                    >
                        #{maker.rank} {"\u00B7"} {(maker.score ?? 0).toFixed(2)} {"\u00B7"}{" "}
                        {maker.currentWeekClicks ?? 0}/{maker.previousWeekClicks ?? 0}
                    </span>
                )}
                <div
                    style={{
                        position: "absolute",
                        top: -30,
                        right: -30,
                        width: 150,
                        height: 150,
                        borderRadius: 0,
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
                        borderRadius: 0,
                        background: "rgba(255,255,255,0.04)",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        position: "relative",
                    }}
                >
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 8.5,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.22em",
                        }}
                    >
                        Trending
                    </span>
                </div>
                <h2
                    style={{
                        fontFamily: font.heading,
                        fontSize: 28,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color: "#fff",
                        margin: "4px 0 0",
                        lineHeight: 1.2,
                        position: "relative",
                    }}
                >
                    {maker.name}
                </h2>
                {/* <p
                    style={{
                        fontFamily: font.body,
                        fontSize: 13.5,
                        color: "rgba(255,255,255,0.8)",
                        margin: 0,
                        lineHeight: 1.5,
                        maxWidth: 280,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    {maker.bio}
                </p> */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, position: "relative" }}>
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 12,
                            lineHeight: 1,
                            color: "rgba(255,255,255,0.6)",
                        }}
                    >
                        {`\u25C8 ${formatLocationName(maker, { full: true })}`}
                    </span>
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 12,
                            lineHeight: 1,
                            color: showOpenStatus
                                ? isOpenNow(maker.opening_hours)
                                    ? "rgba(134,239,172,0.9)"
                                    : "rgba(255,255,255,0.4)"
                                : "transparent",
                            transition: "color 0.2s ease",
                        }}
                    >
                        {isOpenNow(maker.opening_hours) ? "\u25CF Open" : "\u25CB Closed"}
                    </span>
                </div>
            </div>
        </div>
    )
}

interface TrendingCarouselProps {
    makers: Maker[]
    onTap: (maker: Maker) => void
    showOpenStatus: boolean
    isDebug?: boolean
    imageWidth?: number
    resetKey?: number
}

export default memo(function TrendingCarousel({
    makers,
    onTap,
    showOpenStatus,
    isDebug,
    imageWidth = 400,
    resetKey,
}: TrendingCarouselProps) {
    const { isDark } = useTheme()

    const SlideComponent = useMemo(() => {
        function TrendingSlide({ item }: { item: Maker; index: number }) {
            return (
                <TrendingCard
                    maker={item}
                    onTap={onTap}
                    showOpenStatus={showOpenStatus}
                    isDark={isDark}
                    isDebug={isDebug}
                    imageWidth={imageWidth}
                />
            )
        }
        return memo(TrendingSlide)
    }, [onTap, showOpenStatus, isDark, isDebug, imageWidth])

    if (!makers.length) return null
    return (
        <Carousel items={makers} ItemComponent={SlideComponent} loop autoPlay={7000} dots="pill" resetKey={resetKey} />
    )
})
