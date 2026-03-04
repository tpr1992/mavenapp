import React, { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { optimizeImageUrl } from "../utils/image"
import CategoryIcon from "../components/ui/CategoryIcon"
import { isOpenNow, getTodayHours } from "../utils/time"

import MadeInIrelandBadge from "../components/ui/MadeInIrelandBadge"
import { useTheme } from "../contexts/ThemeContext"
import { glassBarStyle } from "../utils/glass"
import { safeOpen } from "../utils/safeOpen"
import RelatedMakersFeed from "../components/makers/RelatedMakersFeed"
import ShareModal from "../components/modals/ShareModal"
import ImageGalleryModal from "../components/modals/ImageGalleryModal"
import MakerHero from "../components/makers/MakerHero"
import type { Maker, Theme } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface TabItem {
    id: string
    label: string
}

interface MakerProfileV2Props {
    maker: Maker
    makers?: Maker[]
    onBack: () => void
    isSaved: boolean
    onToggleSave: (id: string) => void
    onMakerTap: (maker: Maker) => void
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>
    onLogoTap: () => void
    breakpoint?: Breakpoint
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
    const [bioExpanded, setBioExpanded] = useState(false)
    const todayStatus = isOpenNow(maker.opening_hours)
    const todayText = getTodayHours(maker.opening_hours)
    const bioIsLong = maker.bio && maker.bio.length > 120

    return (
        <div style={{ padding: "14px 16px 0" }}>
            {/* Bio — truncated to 2 lines */}
            <p
                onClick={() => bioIsLong && setBioExpanded(!bioExpanded)}
                style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    color: theme.textSecondary,
                    lineHeight: 1.55,
                    margin: "0 0 10px",
                    cursor: bioIsLong ? "pointer" : "default",
                    ...(!bioExpanded && bioIsLong
                        ? {
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                          }
                        : {}),
                }}
            >
                {maker.bio}
                {bioIsLong && !bioExpanded && <span style={{ color: theme.textMuted, fontWeight: 500 }}> more</span>}
            </p>

            {/* Compact info row — pills + status inline */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span
                    style={{
                        padding: "4px 10px",
                        borderRadius: 100,
                        border: `1.5px solid ${theme.border}`,
                        background: "transparent",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSecondary,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                    }}
                >
                    <CategoryIcon category={maker.category} /> {maker.category}
                </span>
                <span
                    style={{
                        padding: "4px 10px",
                        borderRadius: 100,
                        border: `1.5px solid ${theme.border}`,
                        background: "transparent",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSecondary,
                    }}
                >
                    {todayStatus ? "\u25CF " : "\u25CB "}
                    {todayText}
                </span>
                {maker.years_active && (
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 100,
                            border: `1.5px solid ${theme.border}`,
                            background: "transparent",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            fontWeight: 500,
                            color: theme.textSecondary,
                        }}
                    >
                        {maker.years_active} yrs
                    </span>
                )}
                {maker.made_in_ireland && <MadeInIrelandBadge variant="card" />}
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
                padding: "0 4px",
                marginTop: 10,
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
                        padding: "13px 18px 11px",
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

    return (
        <div style={{ padding: "16px 16px 0" }}>
            {/* Full bio */}
            {maker.bio && (
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: theme.textSecondary,
                        lineHeight: 1.6,
                        margin: "0 0 16px",
                    }}
                >
                    {maker.bio}
                </p>
            )}

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {maker.city && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={theme.textMuted}
                            strokeWidth="2"
                        >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textSecondary }}>
                            {maker.address || maker.city}
                        </span>
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, width: 14, textAlign: "center", color: theme.textMuted }}>
                        {"\u25CF"}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textSecondary }}>
                        {todayStatus ? "Open" : "Closed"} {"\u00B7"} {todayText}
                    </span>
                </div>
                {maker.years_active && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, width: 14, textAlign: "center", color: theme.textMuted }}>
                            {"\u2726"}
                        </span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textSecondary }}>
                            {maker.years_active} years active
                        </span>
                    </div>
                )}
                {maker.website_url && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={theme.textMuted}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <a
                            href={maker.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textSecondary,
                                textDecoration: "underline",
                                textUnderlineOffset: 2,
                            }}
                        >
                            {maker.website_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                    </div>
                )}
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
    const HEIGHT_POOLS = [
        [195, 155, 175, 190],
        [215, 160, 180, 170],
        [200, 170, 185, 165],
    ]

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

    const colImages = Array.from({ length: columnCount }, (_, col) => images.filter((_, i) => i % columnCount === col))

    return (
        <div style={{ padding: "12px 12px 0" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                {colImages.map((colImgs, col) => (
                    <div
                        key={col}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginTop: col > 0 ? 32 / col : 0,
                        }}
                    >
                        {colImgs.map((url, i) => {
                            const originalIndex = i * columnCount + col
                            const heights = HEIGHT_POOLS[col % HEIGHT_POOLS.length]
                            return (
                                <div
                                    key={i}
                                    onClick={() => onImageTap && onImageTap(originalIndex)}
                                    style={{
                                        borderRadius: 12,
                                        overflow: "hidden",
                                        height: heights[i % heights.length],
                                        background: theme.surface,
                                        animation: `fadeSlideIn 0.4s ease ${originalIndex * 0.06}s both`,
                                        cursor: "pointer",
                                    }}
                                >
                                    <img
                                        src={optimizeImageUrl(url, 300) ?? undefined}
                                        alt={`${maker.name} ${originalIndex + 1}`}
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
                        borderRadius: 10,
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
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 16,
                            fontWeight: 600,
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
                        borderRadius: 100,
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
                                borderRadius: 6,
                                overflow: "hidden",
                                background: theme.surface,
                                animation: `fadeSlideIn 0.35s ease ${i * 0.04}s both`,
                            }}
                        >
                            <img
                                src={optimizeImageUrl(url, 150) ?? undefined}
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
                    borderRadius: 10,
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
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 16,
                        fontWeight: 600,
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
                    const date = new Date(event.date)
                    const day = date.getDate()
                    const month = date.toLocaleString("en", { month: "short" })

                    return (
                        <div
                            key={i}
                            onClick={() => safeOpen(event.url)}
                            style={{
                                background: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: 14,
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
                                        fontFamily: "'Playfair Display', serif",
                                        fontSize: 22,
                                        fontWeight: 700,
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
                                        fontFamily: "'Playfair Display', serif",
                                        fontSize: 14,
                                        fontWeight: 600,
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
export default function MakerProfileV2({
    maker,
    makers = [],
    onBack,
    isSaved,
    onToggleSave,
    onMakerTap,
    scrollContainerRef,
    onLogoTap,
    breakpoint = "mobile",
}: MakerProfileV2Props) {
    const [showShare, setShowShare] = useState(false)
    const [showCompact, setShowCompact] = useState(false)
    const [compactMenuOpen, setCompactMenuOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("work")
    const [viewerIndex, setViewerIndex] = useState<number | null>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const { theme, isDark } = useTheme()

    const shareUrl = window.location.origin + "/?maker=" + maker.slug
    const visibleTabs = getVisibleTabs(maker)

    // Related makers: same category first, then nearest — full list for infinite scroll
    const relatedMakers = useMemo(() => {
        const others = makers.filter((m) => m.id !== maker.id)
        const sameCategory = others
            .filter((m) => m.category === maker.category)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        const different = others
            .filter((m) => m.category !== maker.category)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        return [...sameCategory, ...different]
    }, [makers, maker.id, maker.category])

    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        const onScroll = () => {
            const heroBottom = heroRef.current?.offsetHeight || 0
            setShowCompact(el.scrollTop > heroBottom - 48)
        }
        el.addEventListener("scroll", onScroll, { passive: true })
        return () => el.removeEventListener("scroll", onScroll)
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

            {/* Compact sticky header */}
            <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
                <div
                    style={{
                        ...glassBarStyle(isDark),
                        borderBottom: showCompact ? glassBarStyle(isDark).border : "1px solid transparent",
                        transform: showCompact ? "translateY(0)" : "translateY(-100%)",
                        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.3s ease",
                        pointerEvents: showCompact ? "auto" : "none",
                        willChange: "transform",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 12px" }}>
                        <button
                            onClick={onBack}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                border: "none",
                                background: theme.pill,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 15,
                                color: theme.textSecondary,
                            }}
                        >
                            {"\u2190"}
                        </button>

                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <span
                                onClick={onLogoTap}
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: theme.text,
                                    letterSpacing: "-0.02em",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                maven
                            </span>
                            <div
                                style={{
                                    width: 3,
                                    height: 3,
                                    borderRadius: "50%",
                                    background: theme.textMuted,
                                    flexShrink: 0,
                                }}
                            />
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: theme.textSecondary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    minWidth: 0,
                                }}
                            >
                                {maker.name}
                            </span>
                        </div>

                        <div style={{ display: "flex", gap: 6, flexShrink: 0, position: "relative" }}>
                            <button
                                onClick={() => onToggleSave(maker.id)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    color: isSaved ? "#c53030" : theme.textMuted,
                                    transition: "color 0.2s ease",
                                }}
                            >
                                {isSaved ? "\u2665" : "\u2661"}
                            </button>
                            <button
                                onClick={() => setCompactMenuOpen((v) => !v)}
                                aria-label="More options"
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <circle cx="3.5" cy="8" r="1.3" fill={theme.textSecondary} />
                                    <circle cx="8" cy="8" r="1.3" fill={theme.textSecondary} />
                                    <circle cx="12.5" cy="8" r="1.3" fill={theme.textSecondary} />
                                </svg>
                            </button>
                            {compactMenuOpen && (
                                <>
                                    <div
                                        onClick={() => setCompactMenuOpen(false)}
                                        style={{ position: "fixed", inset: 0, zIndex: 90 }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "calc(100% + 8px)",
                                            right: 0,
                                            background: theme.card,
                                            borderRadius: 14,
                                            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                                            minWidth: 180,
                                            zIndex: 100,
                                            overflow: "hidden",
                                            animation: "fadeSlideIn 0.15s ease",
                                        }}
                                    >
                                        {[
                                            {
                                                label: "Share",
                                                icon: (
                                                    <svg
                                                        width="15"
                                                        height="15"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke={theme.textSecondary}
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                                                        <polyline points="16 6 12 2 8 6" />
                                                        <line x1="12" y1="2" x2="12" y2="15" />
                                                    </svg>
                                                ),
                                                action: () => {
                                                    setCompactMenuOpen(false)
                                                    setShowShare(true)
                                                },
                                            },
                                            {
                                                label: "Directions",
                                                icon: (
                                                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                                        <path
                                                            d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z"
                                                            fill={theme.textSecondary}
                                                        />
                                                    </svg>
                                                ),
                                                action: () => {
                                                    setCompactMenuOpen(false)
                                                    window.open(
                                                        /android/i.test(navigator.userAgent)
                                                            ? `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}`
                                                            : `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`,
                                                        "_blank",
                                                        "noopener,noreferrer",
                                                    )
                                                },
                                            },
                                            ...(maker.website_url
                                                ? [
                                                      {
                                                          label: "Website",
                                                          icon: (
                                                              <svg
                                                                  width="15"
                                                                  height="15"
                                                                  viewBox="0 0 24 24"
                                                                  fill="none"
                                                                  stroke={theme.textSecondary}
                                                                  strokeWidth="1.8"
                                                                  strokeLinecap="round"
                                                                  strokeLinejoin="round"
                                                              >
                                                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                                                  <polyline points="15 3 21 3 21 9" />
                                                                  <line x1="10" y1="14" x2="21" y2="3" />
                                                              </svg>
                                                          ),
                                                          action: () => {
                                                              setCompactMenuOpen(false)
                                                              safeOpen(maker.website_url)
                                                          },
                                                      },
                                                  ]
                                                : []),
                                        ].map((item, i, arr) => (
                                            <button
                                                key={item.label}
                                                onClick={item.action}
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "13px 16px",
                                                    border: "none",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    color: theme.text,
                                                    borderBottom:
                                                        i < arr.length - 1 ? `1px solid ${theme.border}` : "none",
                                                    textAlign: "left",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 20,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {item.icon}
                                                </span>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <MakerHero
                maker={maker}
                onBack={onBack}
                onLogoTap={onLogoTap}
                onShare={() => setShowShare(true)}
                onToggleSave={onToggleSave}
                isSaved={isSaved}
                heroRef={heroRef}
                isDark={isDark}
                theme={theme}
                minHeroHeight={breakpoint === "mobile" ? 190 : 280}
            />

            {/* Info section — inline, always visible */}
            <InfoSection maker={maker} theme={theme} />

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
