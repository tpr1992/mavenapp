import React, { useRef, useEffect, useCallback, memo, useMemo } from "react"
import CategoryIcon from "../ui/CategoryIcon"
import { formatLocation } from "../../utils/distance"
import { safeOpen } from "../../utils/safeOpen"
import Carousel from "../ui/Carousel"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import type { Maker, Theme, SponsoredPost } from "../../types"
import { font } from "../../styles/tokens"

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
                <div
                    style={{
                        paddingLeft: i === 0 ? 0 : 3,
                        paddingRight: i === urls.length - 1 ? 0 : 3,
                        height: "100%",
                        boxSizing: "border-box",
                    }}
                >
                    <div style={S.imgRound}>
                        <img
                            src={optimizeImageUrl(url, imageWidth) ?? undefined}
                            srcSet={imageSrcSet(url, imageWidth)}
                            width={imageWidth}
                            height={Math.round(imageWidth * 1.25)}
                            alt=""
                            loading={eager ? "eager" : "lazy"}
                            fetchPriority={eager && i === 0 ? "high" : undefined}
                            decoding="async"
                            draggable={false}
                            style={S.imgCover}
                        />
                    </div>
                </div>
            )}
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

// Static styles — created once at module load, reused across all renders
const S = {
    imgCover: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        backfaceVisibility: "hidden",
    } as const,
    imgRound: { width: "100%", height: "100%", borderRadius: 0, overflow: "hidden" } as const,
    cardContain: { contain: "layout style paint" } as const,
    cardImageRel: { position: "relative", overflow: "hidden" } as const,
    hitArea: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 } as const,
    placeholderFill: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 20,
        opacity: 0.25,
    } as const,
    placeholderOuter: {
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    } as const,
    nameRow: { display: "flex", alignItems: "center", gap: 4 } as const,
    nameText: {
        fontFamily: font.body,
        fontWeight: 500,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
        flex: 1,
    } as const,
    saveBtn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        lineHeight: 1,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
    } as const,
    locationText: {
        fontFamily: font.body,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    } as const,
    debugBadge: {
        position: "absolute",
        top: 4,
        left: 4,
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        fontSize: 10,
        fontFamily: "monospace",
        padding: "2px 6px",
        borderRadius: 0,
        zIndex: 5,
        pointerEvents: "none",
    } as const,
    adImgCover: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    } as const,
    adBrandText: {
        fontFamily: font.body,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
        flex: 1,
    } as const,
    adSponsoredLabel: {
        fontFamily: font.body,
        fontSize: 9.5,
        flexShrink: 0,
        opacity: 0.7,
    } as const,
    adTagline: {
        fontFamily: font.body,
        fontSize: 10.5,
        marginTop: 1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    } as const,
    colLayout: {
        display: "flex",
        gap: 2,
        alignItems: "flex-start",
    } as const,
    colInner: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        marginTop: 0,
    } as const,
} as const

interface MasonryGridProps {
    makers: Maker[]
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
    makers,
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
        const makerCount = makers.length
        const MIN_MAKERS_FOR_ADS = 3
        const MAKERS_PER_AD = 8
        const maxAds = makerCount >= MIN_MAKERS_FOR_ADS ? Math.floor(makerCount / MAKERS_PER_AD) : 0

        const items: Array<{ type: string; maker?: Maker; ad?: SponsoredPost }> = []
        let adIdx = 0
        makers.forEach((maker, i) => {
            items.push({ type: "maker", maker })
            if (adIdx < sponsoredPosts.length && adIdx < maxAds && i + 1 === sponsoredPosts[adIdx].afterItem) {
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
    }, [makers, sponsoredPosts, singleColumn, largeCards])

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
        return (
            <div
                key={maker.id}
                className="card-offscreen"
                {...tapProps(() => onMakerTap(maker))}
                style={{
                    ...S.cardContain,
                    background: "transparent",
                    cursor: "pointer",
                    animation: hasAnimated.current
                        ? "none"
                        : `fadeSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${col * 0.04 + idx * 0.025}s both`,
                }}
            >
                <div
                    style={{
                        ...S.cardImageRel,
                        ...(singleColumn ? { aspectRatio: "4 / 5", width: "100%" } : { height: cardHeight }),
                    }}
                >
                    {isDebug && (
                        <span style={S.debugBadge}>
                            #{maker.rank} {"\u00B7"} {(maker.score || 0).toFixed(2)} {"\u00B7"}{" "}
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
                                ...S.placeholderOuter,
                                background: `linear-gradient(135deg, ${maker.hero_color}18, ${maker.hero_color}30)`,
                            }}
                        >
                            <div style={S.placeholderFill}>
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
                    <div style={S.hitArea}></div>
                </div>
                <div
                    style={{
                        padding: singleColumn ? "10px 12px 11px" : "8px 10px 9px",
                        minWidth: 0,
                        overflow: "hidden",
                    }}
                >
                    <div style={S.nameRow}>
                        <span
                            style={{
                                ...S.nameText,
                                fontSize: singleColumn ? 13 : 12,
                                color: theme.text,
                            }}
                        >
                            {maker.name}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleSave(maker.id)
                            }}
                            aria-label={savedIds.has(maker.id) ? `Unsave ${maker.name}` : `Save ${maker.name}`}
                            style={{
                                ...S.saveBtn,
                                color: savedIds.has(maker.id) ? "#fc8181" : theme.textMuted,
                            }}
                        >
                            <svg
                                width={singleColumn ? 14 : 12}
                                height={singleColumn ? 14 : 12}
                                viewBox="0 0 24 24"
                                fill={savedIds.has(maker.id) ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </button>
                    </div>
                    <div
                        style={{
                            ...S.locationText,
                            fontSize: singleColumn ? 12 : 10.5,
                            color: theme.textMuted,
                            marginTop: singleColumn ? 2 : 1,
                        }}
                    >
                        {formatLocation(maker)}
                    </div>
                </div>
            </div>
        )
    }

    const renderAdTile = (ad: SponsoredPost, col: number, idx: number) => (
        <div
            key={ad.id}
            onClick={() => safeOpen(ad.link_url)}
            style={{
                background: "transparent",
                cursor: "pointer",
                animation: hasAnimated.current ? "none" : `fadeSlideIn 0.35s ease ${col * 0.08 + idx * 0.03}s both`,
            }}
        >
            <div style={{ height: ad.tile_height || 200, position: "relative", overflow: "hidden" }}>
                <img
                    src={optimizeImageUrl(ad.image_url, 300) ?? undefined}
                    srcSet={imageSrcSet(ad.image_url, 300)}
                    width={300}
                    height={ad.tile_height || 200}
                    alt={ad.brand}
                    loading="lazy"
                    decoding="async"
                    style={S.adImgCover}
                />
            </div>
            <div style={{ padding: singleColumn ? "10px 12px 11px" : "8px 10px 9px", minWidth: 0, overflow: "hidden" }}>
                <div style={S.nameRow}>
                    <span style={{ ...S.adBrandText, color: theme.text }}>{ad.brand}</span>
                    <span style={{ ...S.adSponsoredLabel, color: theme.textMuted }}>Sponsored</span>
                </div>
                <div style={{ ...S.adTagline, color: theme.textMuted }}>{ad.tagline}</div>
            </div>
        </div>
    )

    return (
        <div style={{ padding: singleColumn ? "0 4px" : "0 3px" }}>
            <div style={S.colLayout}>
                {columns.map((colItems, col) => (
                    <div key={col} style={{ ...S.colInner, gap: singleColumn ? 4 : 2 }}>
                        {colItems.map((item) =>
                            item.type === "maker"
                                ? renderMakerCard(item.maker!, item.col, item.idx)
                                : renderAdTile(item.ad!, item.col, item.idx),
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
})
