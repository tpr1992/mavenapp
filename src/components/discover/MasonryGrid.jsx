import { useRef, useEffect, useCallback, memo, useMemo } from "react"
import { motion } from "framer-motion"
import CategoryIcon from "../ui/CategoryIcon"
import { formatLocation } from "../../utils/distance"
import { safeOpen } from "../../utils/safeOpen"
import Carousel from "../ui/Carousel"
import { optimizeImageUrl } from "../../utils/image"

const CardGallery = memo(function CardGallery({ urls, height, eager = false }) {
    return (
        <Carousel
            items={urls}
            renderItem={(url, i) => (
                <img
                    src={optimizeImageUrl(url, 400)}
                    alt=""
                    loading={eager && i === 0 ? "eager" : "lazy"}
                    {...(eager && i === 0 ? { fetchpriority: "high" } : {})}
                    decoding="async"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            )}
            loop
            dots="mini"
            dotPosition="overlay"
            style={{ height }}
        />
    )
})

const heightPool = [230, 180, 255, 190, 215, 170, 245, 195, 200, 260, 175, 235]
const getCardHeight = (makerId) => heightPool[(parseInt(makerId) - 1) % heightPool.length]
const INFO_HEIGHT = 42
const GAP = 6
const patternShapes = [
    ["◆", "○", "△"],
    ["▽", "◇", "□"],
    ["○", "◆", "▽"],
    ["□", "△", "◇"],
]

const filterSpring = { type: "spring", stiffness: 180, damping: 22, mass: 1.0 }
const mountSpring = { type: "spring", stiffness: 150, damping: 20, mass: 1.0 }

export default memo(function MasonryGrid({
    allMakers,
    visibleIds,
    sponsoredPosts,
    savedIds,
    onMakerTap,
    onToggleSave,
    theme,
}) {
    const hasAnimated = useRef(false)
    useEffect(() => {
        const t = setTimeout(() => {
            hasAnimated.current = true
        }, 600)
        return () => clearTimeout(t)
    }, [])
    const touchRef = useRef({ startX: 0, startY: 0, moved: false })
    const onPointerDown = useCallback((e) => {
        touchRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
    }, [])
    const onPointerMove = useCallback((e) => {
        const t = touchRef.current
        if (t.moved) return
        if (Math.abs(e.clientX - t.startX) > 8 || Math.abs(e.clientY - t.startY) > 8) t.moved = true
    }, [])

    const columns = useMemo(() => {
        const items = []
        let adIdx = 0
        allMakers.forEach((maker, i) => {
            items.push({ type: "maker", maker })
            if (adIdx < sponsoredPosts.length && i + 1 === sponsoredPosts[adIdx].afterItem) {
                items.push({ type: "ad", ad: sponsoredPosts[adIdx] })
                adIdx++
            }
        })
        const cols = [[], []]
        const colHeights = [0, 0]
        items.forEach((item, idx) => {
            const col = colHeights[0] <= colHeights[1] ? 0 : 1
            const itemHeight =
                item.type === "ad"
                    ? (item.ad.tile_height || 200) + INFO_HEIGHT
                    : getCardHeight(item.maker.id) + INFO_HEIGHT
            cols[col].push({ ...item, col, idx })
            colHeights[col] += itemHeight + GAP
        })
        return cols
    }, [allMakers, sponsoredPosts])

    const tapProps = (fn) => ({
        onPointerDown,
        onPointerMove,
        onClick: () => {
            if (!touchRef.current.moved) fn()
        },
    })

    const renderMakerCard = (maker, col, idx) => {
        const cardHeight = getCardHeight(maker.id)
        const shapes = patternShapes[(parseInt(maker.id) - 1) % patternShapes.length]
        const hidden = !visibleIds.has(maker.id)
        return (
            <motion.div
                key={maker.id}
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
                }}
            >
                <div style={{ height: cardHeight, position: "relative", overflow: "hidden", borderRadius: 12 }}>
                    {maker.gallery_urls?.length > 0 ? (
                        <CardGallery urls={maker.gallery_urls} height={cardHeight} eager={idx < 6} />
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
                            {maker.name}
                        </span>
                        {maker.is_verified && <span style={{ fontSize: 9, flexShrink: 0 }}>✓</span>}
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
                                fontSize: 14,
                                lineHeight: 1,
                                flexShrink: 0,
                                color: savedIds.has(maker.id) ? "#c53030" : theme.textMuted,
                            }}
                        >
                            {savedIds.has(maker.id) ? "♥" : "♡"}
                        </button>
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
                        {formatLocation(maker)}
                    </div>
                </div>
            </motion.div>
        )
    }

    const renderAdTile = (ad, col, idx) => (
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
                    src={optimizeImageUrl(ad.image_url, 300)}
                    alt={ad.brand}
                    loading="lazy"
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
        <div style={{ padding: "0 4px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                {columns.map((colItems, col) => (
                    <div
                        key={col}
                        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0, marginTop: 0 }}
                    >
                        {(() => {
                            let visibleCount = 0
                            const deferred = []
                            const result = []
                            colItems.forEach((item) => {
                                if (item.type === "maker") {
                                    if (visibleIds.has(item.maker.id)) visibleCount++
                                    result.push(renderMakerCard(item.maker, item.col, item.idx))
                                    if (visibleCount >= 2 && deferred.length > 0) {
                                        deferred.forEach((ad) => result.push(renderAdTile(ad.ad, ad.col, ad.idx)))
                                        deferred.length = 0
                                    }
                                } else {
                                    if (visibleCount < 2) deferred.push(item)
                                    else result.push(renderAdTile(item.ad, item.col, item.idx))
                                }
                            })
                            deferred.forEach((ad) => result.push(renderAdTile(ad.ad, ad.col, ad.idx)))
                            return result
                        })()}
                    </div>
                ))}
            </div>
        </div>
    )
})
