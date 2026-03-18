import React, { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { optimizeImageUrl, imageSrcSet } from "../utils/image"
import CategoryIcon from "../components/ui/CategoryIcon"
import { isOpenNow, getTodayHours } from "../utils/time"
import { getDistance } from "../utils/distance"

import { useTheme } from "../contexts/ThemeContext"
import { safeOpen } from "../utils/safeOpen"
import RelatedMakersFeed from "../components/makers/RelatedMakersFeed"
import NearbyMakersCarousel from "../components/makers/NearbyMakersCarousel"
import ShareModal from "../components/modals/ShareModal"
import ImageGalleryModal from "../components/modals/ImageGalleryModal"
import MakerHero from "../components/makers/MakerHero"
import MakerProfileHeader from "../components/makers/MakerProfileHeader"
import type { Maker, Theme } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface TabItem {
    id: string
    label: string
}

interface MakerProfileProps {
    maker: Maker
    makers?: Maker[]
    onBack: () => void
    isSaved: boolean
    onToggleSave: (id: string) => void
    onMakerTap: (maker: Maker) => void
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>
    onLogoTap: () => void
    breakpoint?: Breakpoint
    userId?: string | null
    onMessage?: (makerId: string) => void
}

const TABS: TabItem[] = [
    { id: "work", label: "Work" },
    { id: "about", label: "About" },
    { id: "socials", label: "Socials" },
    { id: "events", label: "Events" },
]

function getVisibleTabs(maker: Maker): TabItem[] {
    return TABS.filter((tab) => {
        if (tab.id === "socials") return !!maker.instagram_handle
        if (tab.id === "events") return maker.events && maker.events.length > 0
        return true
    })
}

// ─── Info Section (inline, compact) ──────────────────
function InfoSection({ maker, theme }: { maker: Maker; theme: Theme }) {
    const todayStatus = isOpenNow(maker.opening_hours)
    const todayText = getTodayHours(maker.opening_hours)

    return (
        <div style={{ padding: "0 20px" }}>
            <div
                style={{
                    display: "flex",
                    borderTop: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                    marginTop: 14,
                }}
            >
                {/* Column 1: Open status */}
                <div
                    style={{
                        flex: 1,
                        padding: "10px 0",
                        textAlign: "center",
                        borderRight: `1px solid ${theme.border}`,
                    }}
                >
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                        }}
                    >
                        <span style={{ color: todayStatus ? "#4ade80" : theme.textMuted, fontSize: 6 }}>
                            {"\u25CF"}
                        </span>
                        {todayStatus ? "OPEN" : "CLOSED"}
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        {todayText}
                    </div>
                </div>

                {/* Column 2: Category */}
                <div
                    style={{
                        flex: 1,
                        padding: "10px 0",
                        textAlign: "center",
                        borderRight: `1px solid ${theme.border}`,
                    }}
                >
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                            textTransform: "uppercase",
                        }}
                    >
                        {maker.category.toUpperCase()}
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        Category
                    </div>
                </div>

                {/* Column 3: Years active */}
                <div style={{ flex: 1, padding: "10px 0", textAlign: "center" }}>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                        }}
                    >
                        {maker.years_active} YRS
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        Active
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Tab Bar ──────────────────────────────────────────
function ProfileTabs({
    tabs,
    activeTab,
    onTabChange,
    theme,
}: {
    tabs: TabItem[]
    activeTab: string
    onTabChange: (id: string) => void
    theme: Theme
}) {
    return (
        <div
            style={{
                display: "flex",
                overflowX: "auto",
                scrollbarWidth: "none",
                borderBottom: `1px solid ${theme.border}`,
                padding: "0 20px",
                marginTop: 10,
                gap: 22,
            }}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        flexShrink: 0,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: activeTab === tab.id ? theme.text : theme.textMuted,
                        padding: "12px 0",
                        marginBottom: -1,
                        background: "none",
                        border: "none",
                        borderBottom: `2px solid ${activeTab === tab.id ? theme.text : "transparent"}`,
                        cursor: "pointer",
                        transition: "color 0.15s ease, border-color 0.15s ease",
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

// ─── About Tab ───────────────────────────────────────
function AboutTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const todayStatus = isOpenNow(maker.opening_hours)
    const todayText = getTodayHours(maker.opening_hours)

    // Split bio at first sentence for editorial treatment
    const dotIndex = maker.bio.indexOf(". ")
    const firstSentence = dotIndex > -1 ? maker.bio.slice(0, dotIndex + 1) : maker.bio
    const restOfBio = dotIndex > -1 ? maker.bio.slice(dotIndex + 2).trim() : ""

    const detailRows: { label: string; value: string; status?: string; statusColor?: string }[] = [
        {
            label: "LOCATION",
            value: `${maker.address}${maker.city ? `, ${maker.city}` : ""}`,
        },
        {
            label: "HOURS",
            value: todayText,
            status: todayStatus ? "Open now" : "Closed now",
            statusColor: todayStatus ? "#4ade80" : theme.textMuted,
        },
        {
            label: "CATEGORY",
            value: maker.category.charAt(0).toUpperCase() + maker.category.slice(1),
        },
        {
            label: "ACTIVE",
            value: `${maker.years_active} year${maker.years_active !== 1 ? "s" : ""}`,
        },
        ...(maker.made_in_ireland ? [{ label: "MADE IN", value: "Ireland" }] : []),
    ]

    return (
        <div>
            {/* Bio — editorial split */}
            <div style={{ padding: "22px 20px 0" }}>
                <p
                    style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: 17,
                        fontStyle: "italic",
                        color: theme.text,
                        lineHeight: 1.55,
                        margin: "0 0 14px",
                        letterSpacing: "-0.01em",
                    }}
                >
                    {firstSentence}
                </p>
                {restOfBio && (
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13.5,
                            color: theme.textSecondary,
                            lineHeight: 1.6,
                            margin: 0,
                        }}
                    >
                        {restOfBio}
                    </p>
                )}
            </div>

            {/* Structured detail rows */}
            <div
                style={{
                    marginTop: 22,
                    borderTop: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                }}
            >
                {detailRows.map((item, i) => (
                    <div
                        key={item.label}
                        style={{
                            padding: "12px 20px",
                            borderBottom: i < detailRows.length - 1 ? `1px solid ${theme.border}` : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 9.5,
                                fontWeight: 500,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                                width: 90,
                                flexShrink: 0,
                                paddingTop: 2,
                            }}
                        >
                            {item.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                {item.value}
                            </span>
                            {item.status && (
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 11,
                                        color: item.statusColor,
                                        marginTop: 2,
                                    }}
                                >
                                    {item.status}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Work Tab ─────────────────────────────────────────
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

// ─── Instagram Tab ────────────────────────────────────
function SocialsTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const handle = maker.instagram_handle || ""
    const cleanHandle = handle.replace("@", "")
    const images = maker.gallery_urls || []

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px" }}>
                <div
                    style={{
                        width: 32,
                        height: 32,
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.textMuted}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 16,
                            fontWeight: 800,
                            color: theme.text,
                        }}
                    >
                        Instagram
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                        }}
                    >
                        {handle}
                    </div>
                </div>
                <a
                    href={`https://instagram.com/${cleanHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: theme.textMuted,
                        border: `1px solid ${theme.border}`,
                        padding: "5px 10px",
                        borderRadius: 0,
                        textDecoration: "none",
                    }}
                >
                    View Profile
                </a>
            </div>

            {images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, padding: "0 12px" }}>
                    {images.slice(0, 9).map((url, i) => (
                        <div
                            key={i}
                            style={{
                                aspectRatio: "1",
                                borderRadius: 0,
                                overflow: "hidden",
                                background: theme.surface,
                                animation: `fadeSlideIn 0.35s ease ${i * 0.04}s both`,
                            }}
                        >
                            <img
                                src={optimizeImageUrl(url, 150) ?? undefined}
                                srcSet={imageSrcSet(url, 150) ?? undefined}
                                alt={`${maker.name} instagram ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                onLoad={(e) => {
                                    ;(e.currentTarget as HTMLImageElement).style.opacity = "1"
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    opacity: 0,
                                    transition: "opacity 0.3s ease",
                                }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: theme.textMuted,
                            lineHeight: 1.6,
                        }}
                    >
                        Visit {handle} on Instagram to see their latest work.
                    </p>
                </div>
            )}

            <a
                href={`https://instagram.com/${cleanHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    margin: "12px 16px 0",
                    border: `1px solid ${theme.border}`,
                    borderRadius: 0,
                    padding: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: theme.textMuted,
                    textDecoration: "none",
                }}
            >
                View all on Instagram
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.textMuted}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            </a>
        </div>
    )
}

// ─── Events Tab ───────────────────────────────────────
function EventsTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const events = maker.events || []

    const parsedDates = useMemo(
        () =>
            events.map((event) => {
                const date = new Date(event.date)
                return {
                    day: date.getDate(),
                    month: date.toLocaleString("en", { month: "short" }),
                }
            }),
        [events],
    )

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "18px 16px 12px",
                }}
            >
                <span
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 16,
                        fontWeight: 800,
                        color: theme.text,
                    }}
                >
                    Events
                </span>
                <span
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: theme.textMuted,
                    }}
                >
                    {events.length} upcoming
                </span>
            </div>

            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {events.map((event, i) => {
                    const { day, month } = parsedDates[i]

                    return (
                        <div
                            key={i}
                            onClick={() => safeOpen(event.url)}
                            style={{
                                background: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: 0,
                                overflow: "hidden",
                                display: "flex",
                                cursor: event.url ? "pointer" : "default",
                                animation: `fadeSlideIn 0.35s ease ${i * 0.06}s both`,
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    flexShrink: 0,
                                    background: theme.bg,
                                    borderRight: `1px solid ${theme.border}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "14px 6px",
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: "'Syne', sans-serif",
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: theme.text,
                                        lineHeight: 1,
                                    }}
                                >
                                    {day}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 9,
                                        fontWeight: 600,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        color: theme.textMuted,
                                        marginTop: 2,
                                    }}
                                >
                                    {month}
                                </div>
                            </div>

                            <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                                {event.tag && (
                                    <div
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 9,
                                            fontWeight: 600,
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            color: theme.textMuted,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {event.tag}
                                    </div>
                                )}
                                <div
                                    style={{
                                        fontFamily: "'Syne', sans-serif",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: theme.text,
                                        lineHeight: 1.25,
                                        marginBottom: 4,
                                    }}
                                >
                                    {event.name}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 11,
                                        color: theme.textMuted,
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {event.time} {event.location && `\u00B7 ${event.location}`}
                                    {event.details && (
                                        <>
                                            <br />
                                            {event.details}
                                        </>
                                    )}
                                </div>
                                {event.cta && (
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 10,
                                            fontWeight: 600,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            color: theme.textSecondary,
                                            marginTop: 8,
                                            borderBottom: `1px solid ${theme.border}`,
                                            paddingBottom: 1,
                                        }}
                                    >
                                        {event.cta}
                                        <svg
                                            width="9"
                                            height="9"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={theme.textSecondary}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────
export default function MakerProfile({
    maker,
    makers = [],
    onBack,
    isSaved,
    onToggleSave,
    onMakerTap,
    scrollContainerRef,
    onLogoTap,
    breakpoint = "mobile",
    userId,
    onMessage,
}: MakerProfileProps) {
    const [showShare, setShowShare] = useState(false)
    const [showCompact, setShowCompact] = useState(false)
    const [activeTab, setActiveTab] = useState("work")
    const [viewerIndex, setViewerIndex] = useState<number | null>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const { theme, isDark } = useTheme()

    const shareUrl = window.location.origin + "/?maker=" + maker.slug
    const visibleTabs = getVisibleTabs(maker)

    // IDs shown in the nearby carousel — exclude from Keep Exploring to avoid duplication
    const nearbyExcludeIds = useMemo(() => {
        const nearby = (makers || [])
            .filter((m) => m.id !== maker.id)
            .filter((m) => {
                const d = getDistance(maker.lat, maker.lng, m.lat, m.lng)
                return d <= 30
            })
            .sort(
                (a, b) =>
                    getDistance(maker.lat, maker.lng, a.lat, a.lng) - getDistance(maker.lat, maker.lng, b.lat, b.lng),
            )
            .slice(0, 5)
            .map((m) => m.id)
        return new Set(nearby)
    }, [makers, maker.id, maker.lat, maker.lng])

    // Related makers: same category first, then nearest to current maker — excluding nearby carousel
    const relatedMakers = useMemo(() => {
        const distFrom = (m: Maker) => getDistance(maker.lat, maker.lng, m.lat, m.lng)
        const others = makers.filter((m) => m.id !== maker.id && !nearbyExcludeIds.has(m.id))
        const sameCategory = others
            .filter((m) => m.category === maker.category)
            .sort((a, b) => distFrom(a) - distFrom(b))
        const different = others.filter((m) => m.category !== maker.category).sort((a, b) => distFrom(a) - distFrom(b))
        return [...sameCategory, ...different]
    }, [makers, maker.id, maker.category, maker.lat, maker.lng, nearbyExcludeIds])

    useEffect(() => {
        const hero = heroRef.current
        const root = scrollContainerRef?.current
        if (!hero || !root) return
        const io = new IntersectionObserver(([e]) => setShowCompact(!e.isIntersecting), {
            root,
            rootMargin: "-48px 0px 0px 0px",
        })
        io.observe(hero)
        return () => io.disconnect()
    }, [scrollContainerRef])

    useEffect(() => {
        setActiveTab("work")
    }, [maker.id])

    const pageTitle = `${maker.name} \u2014 ${maker.category} in ${maker.city} | maven`
    const pageDescription = maker.bio.length > 155 ? maker.bio.slice(0, 152) + "..." : maker.bio

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: maker.name,
        description: maker.bio,
        address: {
            "@type": "PostalAddress",
            streetAddress: maker.address,
            addressLocality: maker.city,
            addressCountry: maker.country,
        },
        geo: { "@type": "GeoCoordinates", latitude: maker.lat, longitude: maker.lng },
        url: shareUrl,
        ...(maker.website_url && { sameAs: [maker.website_url] }),
    }

    return (
        <div style={{ paddingBottom: 20, animation: "fadeSlideIn 0.25s ease" }}>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:url" content={shareUrl} />
                <meta property="og:type" content="profile" />
                <link rel="canonical" href={shareUrl} />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Helmet>

            {/* Unified sticky header — morphs between hero overlay and compact bar */}
            <MakerProfileHeader
                maker={maker}
                isCompact={showCompact}
                isSaved={isSaved}
                isDark={isDark}
                theme={theme}
                onBack={onBack}
                onLogoTap={onLogoTap}
                onToggleSave={onToggleSave}
                onShare={() => setShowShare(true)}
                scrollContainerRef={scrollContainerRef}
            />

            {/* Hero */}
            <MakerHero
                maker={maker}
                heroRef={heroRef}
                isDark={isDark}
                onImageTap={() => setViewerIndex(0)}
                minHeroHeight={breakpoint === "mobile" ? 340 : 280}
            />

            {/* Info section — inline, always visible */}
            <InfoSection maker={maker} theme={theme} />

            {/* Message button */}
            {maker.is_messageable && onMessage && maker.user_id !== userId && (
                <div style={{ padding: "0 20px", marginTop: 14 }}>
                    <button
                        onClick={() => onMessage(maker.id)}
                        style={{
                            width: "100%",
                            padding: "12px 0",
                            borderRadius: 0,
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "transparent",
                            color: theme.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                        </svg>
                        Message
                    </button>
                </div>
            )}

            {/* Tabs — Gallery / Instagram / Events */}
            {visibleTabs.length > 0 && (
                <>
                    <ProfileTabs tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />
                    <div style={{ minHeight: 120 }}>
                        {activeTab === "work" && (
                            <WorkTab
                                maker={maker}
                                theme={theme}
                                onImageTap={setViewerIndex}
                                columnCount={breakpoint === "mobile" ? 2 : 3}
                            />
                        )}
                        {activeTab === "about" && <AboutTab maker={maker} theme={theme} />}
                        {activeTab === "socials" && <SocialsTab maker={maker} theme={theme} />}
                        {activeTab === "events" && <EventsTab maker={maker} theme={theme} />}
                    </div>
                </>
            )}

            <NearbyMakersCarousel currentMaker={maker} makers={makers || []} onMakerTap={onMakerTap} />

            <RelatedMakersFeed
                makers={relatedMakers}
                onMakerTap={onMakerTap}
                columnCount={breakpoint === "mobile" ? 2 : 3}
            />

            {/* Image viewer modal */}
            {viewerIndex !== null && maker.gallery_urls && (
                <ImageGalleryModal
                    images={maker.gallery_urls}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                    scrollContainerRef={scrollContainerRef}
                />
            )}

            {/* Share modal */}
            {showShare && (
                <ShareModal maker={maker} theme={theme} shareUrl={shareUrl} onClose={() => setShowShare(false)} />
            )}
        </div>
    )
}
