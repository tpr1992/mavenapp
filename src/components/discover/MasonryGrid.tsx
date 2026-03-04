import React, { useRef, useEffect, useCallback, memo, useMemo } from "react"
import { motion } from "framer-motion"
import CategoryIcon from "../ui/CategoryIcon"
import { formatLocation } from "../../utils/distance"
import { safeOpen } from "../../utils/safeOpen"
import Carousel from "../ui/Carousel"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import type { Maker, Theme, SponsoredPost } from "../../types"

interface CardGalleryProps {
    urls: string[]
    height?: number
    eager?: boolean
    imageWidth?: number
}

const CardGallery = memo(function CardGallery({ urls, height, eager = false, imageWidth = 400 }: CardGalleryProps) {
    return (
        <Carousel
            items={urls}
            renderItem={(url, i) => (
                <img
                    src={optimizeImageUrl(url, imageWidth) ?? undefined}
                    srcSet={imageSrcSet(url, imageWidth)}
                    alt=""
                    loading={eager && i === 0 ? "eager" : "lazy"}
                    fetchPriority={eager && i === 0 ? "high" : undefined}
                    decoding="async"
                    draggable={false}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        backfaceVisibility: "hidden",
                    }}
                />
            )}
            loop
            dots="mini"
            dotPosition="overlay"
            style={{ height: height ?? "100%" }}
        />
    )
})

const heightPool = [230, 180, 255, 190, 215, 170, 245, 195, 200, 260, 175, 235]
const heightPoolLarge = [310, 250, 340, 260, 290, 240, 330, 265, 270, 350, 245, 315]
const getCardHeight = (makerId: string, large?: boolean) =>
    (large ? heightPoolLarge : heightPool)[(parseInt(makerId) - 1) % heightPool.length]
const INFO_HEIGHT = 42
const GAP = 6
const patternShapes = [
    ["◆", "○", "△"],
    ["▽", "◇", "□"],
    ["○", "◆", "▽"],
    ["□", "△", "◇"],
]

const filterSpring = { type: "spring" as const, stiffness: 180, damping: 22, mass: 1.0 }
const mountSpring = { type: "spring" as const, stiffness: 150, damping: 20, mass: 1.0 }

interface MasonryGridProps {
    allMakers: Maker[]
    visibleIds: Set<string>
    sponsoredPosts: SponsoredPost[]
    savedIds: Set<string>
    onMakerTap: (maker: Maker) => void
    onToggleSave: (id: string) => void
    theme: Theme
    isDebug?: boolean
    singleColumn?: boolean
    largeCards?: boolean
    imageWidth?: number
}

export default memo(function MasonryGrid({
    allMakers,
    visibleIds,
    sponsoredPosts,
    savedIds,
    onMakerTap,
    onToggleSave,
    theme,
    isDebug,
    singleColumn,
    largeCards,
    imageWidth = 400,
}: MasonryGridProps) {
    const hasAnimated = useRef(false)
    useEffect(() => {
        const t = setTimeout(() => {
            hasAnimated.current = true
        }, 600)
        return () => clearTimeout(t)
    }, [])
    const touchRef = useRef<{ startX: number; startY: number; moved: boolean }>({ startX: 0, startY: 0, moved: false })
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        touchRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
    }, [])
    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const t = touchRef.current
        if (t.moved) return
        if (Math.abs(e.clientX - t.startX) > 8 || Math.abs(e.clientY - t.startY) > 8) t.moved = true
    }, [])

    const columns = useMemo(() => {
        const items: Array<{ type: string; maker?: Maker; ad?: SponsoredPost }> = []
        let adIdx = 0
        allMakers.forEach((maker, i) => {
            items.push({ type: "maker", maker })
            if (adIdx < sponsoredPosts.length && i + 1 === sponsoredPosts[adIdx].afterItem) {
                items.push({ type: "ad", ad: sponsoredPosts[adIdx] })
                adIdx++
            }
        })
        if (singleColumn) {
            return [items.map((item, idx) => ({ ...item, col: 0, idx }))]
        }
        const cols: Array<Array<{ type: string; maker?: Maker; ad?: SponsoredPost; col: number; idx: number }>> = [
            [],
            [],
        ]
        const colHeights: number[] = [0, 0]
        items.forEach((item, idx) => {
            const col = colHeights[0] <= colHeights[1] ? 0 : 1
            const itemHeight =
                item.type === "ad"
                    ? (item.ad!.tile_height || 200) + INFO_HEIGHT
                    : getCardHeight(item.maker!.id, largeCards) + INFO_HEIGHT
            cols[col].push({ ...item, col, idx })
            colHeights[col] += itemHeight + GAP
        })
        return cols
    }, [allMakers, sponsoredPosts, singleColumn, largeCards])

    const tapProps = (fn: () => void) => ({
        onPointerDown,
        onPointerMove,
        onClick: () => {
            if (!touchRef.current.moved) fn()
        },
    })

    const renderMakerCard = (maker: Maker, col: number, idx: number) => {
        const cardHeight = singleColumn ? undefined : getCardHeight(maker.id, largeCards)
        const shapes = patternShapes[(parseInt(maker.id) - 1) % patternShapes.length]
        const hidden = !visibleIds.has(maker.id)
        return (
            <motion.div
                key={maker.id}
                className="card-offscreen"
                {...(hidden ? {} : tapProps(() => onMakerTap(maker)))}
                initial={hasAnimated.current ? false : { opacity: 0, y: 8 }}
                animate={hidden ? { opacity: 0, scale: 0.97 } : { opacity: 1, y: 0, scale: 1 }}
                transition={
                    hasAnimated.current
                        ? { ...filterSpring, delay: idx * 0.02 }
                        : { ...mountSpring, delay: col * 0.04 + idx * 0.025 }
                }
                style={{
                    background: "transparent",
                    borderRadius: 12,
                    overflow: "hidden",
                    cursor: hidden ? "default" : "pointer",
                    display: hidden ? "none" : undefined,
                    contain: "layout style paint",
                }}
            >
                <div
                    style={{
                        ...(singleColumn ? { aspectRatio: "4 / 5", width: "100%" } : { height: cardHeight }),
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 12,
                    }}
                >
                    {isDebug && (
                        <span
                            style={{
                                position: "absolute",
                                top: 4,
                                left: 4,
                                background: "rgba(0,0,0,0.7)",
                                color: "#fff",
                                fontSize: 10,
                                fontFamily: "monospace",
                                padding: "2px 6px",
                                borderRadius: 6,
                                zIndex: 5,
                                pointerEvents: "none",
                            }}
                        >
                            #{maker.rank} {"\u00B7"} {(maker.score ?? 0).toFixed(2)} {"\u00B7"}{" "}
                            {maker.currentWeekClicks ?? 0}/{maker.previousWeekClicks ?? 0}
                        </span>
                    )}
                    {maker.gallery_urls?.length > 0 ? (
                        <CardGallery
                            urls={maker.gallery_urls}
                            height={cardHeight}
                            eager={idx < (singleColumn ? 1 : 6)}
                            imageWidth={imageWidth}
                        />
                    ) : (
                        <div
                            style={{
                                height: "100%",
                                background: `linear-gradient(135deg, ${maker.hero_color}18, ${maker.hero_color}30)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                position: "relative",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 20,
                                    padding: 20,
                                    opacity: 0.25,
                                }}
                            >
                                {shapes.map((shape, si) => (
                                    <span
                                        key={si}
                                        style={{
                                            fontSize: 32 + si * 8,
                                            color: maker.hero_color,
                                            transform: `rotate(${si * 25 - 20}deg)`,
                                        }}
                                    >
                                        {shape}
                                    </span>
                                ))}
                            </div>
                            <CategoryIcon category={maker.category} size={36} style={{ opacity: 0.6, zIndex: 1 }} />
                        </div>
                    )}
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}></div>
                </div>
                <div
                    style={{
                        padding: singleColumn ? "10px 12px 11px" : "8px 10px 9px",
                        minWidth: 0,
                        overflow: "hidden",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: singleColumn ? 14 : 12.5,
                                fontWeight: 600,
                                color: theme.text,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: 0,
                                flex: 1,
                            }}
                        >
                            {maker.name}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleSave(maker.id)
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: singleColumn ? 16 : 14,
                                lineHeight: 1,
                                flexShrink: 0,
                                color: savedIds.has(maker.id) ? "#c53030" : theme.textMuted,
                            }}
                        >
                            {savedIds.has(maker.id) ? "\u2665" : "\u2661"}
                        </button>
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: singleColumn ? 12 : 10.5,
                            color: theme.textMuted,
                            marginTop: singleColumn ? 2 : 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {formatLocation(maker)}
                    </div>
                </div>
            </motion.div>
        )
    }

    const renderAdTile = (ad: SponsoredPost, col: number, idx: number) => (
        <div
            key={ad.id}
            onClick={() => safeOpen(ad.link_url)}
            style={{
                background: "transparent",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                animation: hasAnimated.current ? "none" : `fadeSlideIn 0.35s ease ${col * 0.08 + idx * 0.03}s both`,
            }}
        >
            <div style={{ height: ad.tile_height || 200, position: "relative", overflow: "hidden", borderRadius: 12 }}>
                <img
                    src={optimizeImageUrl(ad.image_url, 300) ?? undefined}
                    alt={ad.brand}
                    loading="lazy"
                    decoding="async"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            </div>
            <div style={{ padding: "8px 10px 9px", minWidth: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: theme.text,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        {ad.brand}
                    </span>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9.5,
                            color: theme.textMuted,
                            flexShrink: 0,
                            opacity: 0.7,
                        }}
                    >
                        Sponsored
                    </span>
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
                    {ad.tagline}
                </div>
            </div>
        </div>
    )

    return (
        <div style={{ padding: singleColumn ? "0 6px" : "0 4px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                {columns.map((colItems, col) => (
                    <div
                        key={col}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: singleColumn ? 10 : 6,
                            minWidth: 0,
                            marginTop: 0,
                        }}
                    >
                        {(() => {
                            let visibleCount = 0
                            const deferred: typeof colItems = []
                            const result: React.ReactNode[] = []
                            colItems.forEach((item) => {
                                if (item.type === "maker") {
                                    if (visibleIds.has(item.maker!.id)) visibleCount++
                                    result.push(renderMakerCard(item.maker!, item.col, item.idx))
                                    if (visibleCount >= 2 && deferred.length > 0) {
                                        deferred.forEach((ad) => result.push(renderAdTile(ad.ad!, ad.col, ad.idx)))
                                        deferred.length = 0
                                    }
                                } else {
                                    if (visibleCount < 2) deferred.push(item)
                                    else result.push(renderAdTile(item.ad!, item.col, item.idx))
                                }
                            })
                            deferred.forEach((ad) => result.push(renderAdTile(ad.ad!, ad.col, ad.idx)))
                            return result
                        })()}
                    </div>
                ))}
            </div>
        </div>
    )
})
