import React, { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { optimizeImageUrl, imageSrcSet } from "../utils/image"
import CategoryIcon from "../components/ui/CategoryIcon"
import { isOpenNow, getTodayHours } from "../utils/time"

import MadeInIrelandBadge from "../components/ui/MadeInIrelandBadge"
import { useTheme } from "../contexts/ThemeContext"
import { safeOpen } from "../utils/safeOpen"
import RelatedMakersFeed from "../components/makers/RelatedMakersFeed"
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
    const cachedSet = useMemo(() => {
        const set = new Set<number>()
        images.forEach((url, i) => {
            const src = optimizeImageUrl(url, 300)
            if (!src) return
            const probe = new Image()
            probe.src = src
            if (probe.complete) set.add(i)
        })
        return set
    }, [images])
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
                            const imgSrc = optimizeImageUrl(url, 300) ?? undefined
                            const cached = cachedSet.has(originalIndex)
                            return (
                                <div
                                    key={i}
                                    onClick={() => onImageTap && onImageTap(originalIndex)}
                                    style={{
                                        borderRadius: 12,
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
                    const { day, month } = parsedDates[i]

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
}: MakerProfileProps) {
    const [showShare, setShowShare] = useState(false)
    const [showCompact, setShowCompact] = useState(false)
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
