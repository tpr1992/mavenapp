import React from "react"
import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import CategoryIcon from "../ui/CategoryIcon"
import type { Maker, Theme } from "../../types"

function WorkTab({
    maker,
    theme,
    onImageTap,
    columnCount = 2,
}: {
    maker: Maker
    theme: Theme
    onImageTap?: (index: number) => void
    columnCount?: number
}) {
    const images = maker.gallery_urls || []

    if (!images.length) {
        return (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <CategoryIcon category={maker.category} size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: theme.textMuted,
                        lineHeight: 1.6,
                    }}
                >
                    No work images yet.
                </p>
            </div>
        )
    }

    // ─── Editorial showcase layout (8+ images, skipping index 0 which is the hero) ───
    if (images.length >= 8) {
        // Layout pattern: each entry consumes N images from the queue
        // "hero-1" = 1 full-width tall, "pair" = 2 side-by-side, "quote" = pull quote (no image),
        // "full-1" = 1 full-width short, "strip-3" = 3 in a row, "grid" = remaining as masonry
        const editorialImages = images.slice(1) // skip index 0 (page hero)
        let cursor = 0
        const next = (n: number) => {
            const slice = editorialImages.slice(cursor, cursor + n)
            const startIdx = cursor + 1 // +1 because we skipped images[0]
            cursor += n
            return slice.map((url, i) => ({ url, index: startIdx + i }))
        }

        const imgStyle = (loaded = false): React.CSSProperties => ({
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s ease",
        })
        const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
            ;(e.target as HTMLImageElement).style.opacity = "1"
        }

        const hero = next(1)
        const pair = next(2)
        const detail = next(1)
        const strip = next(3)
        const remaining = editorialImages.slice(cursor).map((url, i) => ({ url, index: cursor + 1 + i }))

        return (
            <div style={{ padding: 0 }}>
                {/* Full-width hero */}
                <div
                    onClick={() => onImageTap && onImageTap(hero[0].index)}
                    style={{ height: 320, width: "100%", overflow: "hidden", position: "relative", cursor: "pointer" }}
                >
                    <img
                        src={optimizeImageUrl(hero[0].url, 800) ?? undefined}
                        srcSet={imageSrcSet(hero[0].url, 800)}
                        alt={maker.name}
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        onLoad={onLoad}
                        style={{ ...imgStyle(), position: "absolute", inset: 0 }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            bottom: 12,
                            right: 14,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9.5,
                            color: "rgba(255,255,255,0.3)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                        }}
                    >
                        {maker.category}
                    </span>
                </div>

                {/* 2-up pair */}
                <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                    {pair.map((img) => (
                        <div
                            key={img.index}
                            onClick={() => onImageTap && onImageTap(img.index)}
                            style={{ flex: 1, height: 240, overflow: "hidden", cursor: "pointer" }}
                        >
                            <img
                                src={optimizeImageUrl(img.url, 400) ?? undefined}
                                srcSet={imageSrcSet(img.url, 400)}
                                alt={maker.name}
                                loading="eager"
                                decoding="async"
                                onLoad={onLoad}
                                style={imgStyle()}
                            />
                        </div>
                    ))}
                </div>

                {/* Pull quote */}
                {maker.spotlight_quote && (
                    <div
                        style={{
                            padding: "24px 28px",
                            margin: "3px 0",
                        }}
                    >
                        <p
                            style={{
                                fontFamily: "'Instrument Serif', serif",
                                fontSize: 22,
                                fontStyle: "italic",
                                color: theme.text,
                                lineHeight: 1.45,
                                letterSpacing: "-0.01em",
                                margin: "0 0 14px",
                            }}
                        >
                            &ldquo;{maker.spotlight_quote}&rdquo;
                        </p>
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: 500,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                            }}
                        >
                            &mdash; {(maker.quote_attribution || maker.name).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Full-width detail */}
                <div
                    onClick={() => onImageTap && onImageTap(detail[0].index)}
                    style={{
                        height: 220,
                        width: "100%",
                        overflow: "hidden",
                        position: "relative",
                        marginTop: 3,
                        cursor: "pointer",
                    }}
                >
                    <img
                        src={optimizeImageUrl(detail[0].url, 800) ?? undefined}
                        srcSet={imageSrcSet(detail[0].url, 800)}
                        alt={maker.name}
                        loading="lazy"
                        decoding="async"
                        onLoad={onLoad}
                        style={{ ...imgStyle(), position: "absolute", inset: 0 }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            bottom: 12,
                            right: 14,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9.5,
                            color: "rgba(255,255,255,0.3)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                        }}
                    >
                        {maker.name}
                    </span>
                </div>

                {/* 3-up strip */}
                <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                    {strip.map((img) => (
                        <div
                            key={img.index}
                            onClick={() => onImageTap && onImageTap(img.index)}
                            style={{ flex: 1, height: 140, overflow: "hidden", cursor: "pointer" }}
                        >
                            <img
                                src={optimizeImageUrl(img.url, 300) ?? undefined}
                                srcSet={imageSrcSet(img.url, 300)}
                                alt={maker.name}
                                loading="lazy"
                                decoding="async"
                                onLoad={onLoad}
                                style={imgStyle()}
                            />
                        </div>
                    ))}
                </div>

                {/* Remaining as 2-column masonry */}
                {remaining.length > 0 && (
                    <div style={{ display: "flex", gap: 3, marginTop: 3, padding: "0 3px" }}>
                        {[0, 1].map((col) => (
                            <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                                {remaining
                                    .filter((_, i) => i % 2 === col)
                                    .map((img) => {
                                        const heights = [195, 155, 175, 190]
                                        return (
                                            <div
                                                key={img.index}
                                                onClick={() => onImageTap && onImageTap(img.index)}
                                                style={{
                                                    overflow: "hidden",
                                                    height: heights[img.index % heights.length],
                                                    background: theme.surface,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <img
                                                    src={optimizeImageUrl(img.url, 300) ?? undefined}
                                                    srcSet={imageSrcSet(img.url, 300)}
                                                    alt={maker.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onLoad={onLoad}
                                                    style={imgStyle()}
                                                />
                                            </div>
                                        )
                                    })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ─── Masonry fallback (< 7 images) ───
    const cachedSet = new Set<number>()
    images.forEach((url, i) => {
        const src = optimizeImageUrl(url, 300)
        if (!src) return
        const probe = new Image()
        probe.src = src
        if (probe.complete) cachedSet.add(i)
    })
    const HEIGHT_POOLS = [
        [195, 155, 175, 190],
        [215, 160, 180, 170],
        [200, 170, 185, 165],
    ]
    const colImages = Array.from({ length: columnCount }, (_, col) => images.filter((_, i) => i % columnCount === col))

    return (
        <div style={{ padding: "8px 3px 0" }}>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                {colImages.map((colImgs, col) => (
                    <div
                        key={col}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            marginTop: col > 0 ? 20 : 0,
                        }}
                    >
                        {colImgs.map((url, i) => {
                            const originalIndex = i * columnCount + col
                            const heights = HEIGHT_POOLS[col % HEIGHT_POOLS.length]
                            const imgSrc = optimizeImageUrl(url, 300) ?? undefined
                            const cached = cachedSet.has(originalIndex)
                            return (
                                <div
                                    key={i}
                                    onClick={() => onImageTap && onImageTap(originalIndex)}
                                    style={{
                                        borderRadius: 0,
                                        overflow: "hidden",
                                        height: heights[i % heights.length],
                                        background: theme.surface,
                                        animation: cached
                                            ? "none"
                                            : `fadeSlideIn 0.4s ease ${originalIndex * 0.06}s both`,
                                        cursor: "pointer",
                                    }}
                                >
                                    <img
                                        src={imgSrc}
                                        srcSet={imageSrcSet(url, 300)}
                                        alt={`${maker.name} ${originalIndex + 1}`}
                                        loading={originalIndex < 4 ? "eager" : "lazy"}
                                        decoding="async"
                                        onLoad={(e) => {
                                            ;(e.currentTarget as HTMLImageElement).style.opacity = "1"
                                        }}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                            opacity: cached ? 1 : 0,
                                            transition: cached ? "none" : "opacity 0.3s ease",
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default WorkTab
