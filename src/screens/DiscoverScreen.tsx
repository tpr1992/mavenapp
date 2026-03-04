import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import { isOpenNow } from "../utils/time"
import useDebounce from "../hooks/useDebounce"
import CategoryPills from "../components/ui/CategoryPills"
import type { FeedLayout } from "../hooks/useFeedLayout"
import LocationPicker from "../components/ui/LocationPicker"
import TrendingCarousel from "../components/discover/TrendingCarousel"
import MasonryGrid from "../components/discover/MasonryGrid"
import DiscoverHeaderV2 from "../components/discover/DiscoverHeaderV2"
import { TRENDING_MIN_CURRENT, TRENDING_MIN_COMBINED } from "../utils/scoring"
import type { Maker, SponsoredPost } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface DebugMeta {
    p95: number
    isLowData: boolean
    makersWithClicks: number
    totalMakers: number
}

interface DiscoverScreenProps {
    makers?: Maker[]
    makersLoading: boolean
    makersError: string | null
    onRetry: () => void
    onRefresh: () => void
    onMakerTap: (maker: Maker) => void
    savedIds: Set<string>
    onToggleSave: (id: string) => void
    onScrollToTop: () => void
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    locationLabel: string | null
    locationSource: string | null
    userLocation: { lat: number; lng: number } | null
    setLocation: (loc: { lat: number; lng: number } | null, label?: string | null, source?: string) => void
    sponsoredPosts?: SponsoredPost[]
    isHidden: boolean
    category: string
    onCategoryChange: (cat: string) => void
    openNow: boolean
    onOpenNowChange: (val: boolean) => void
    refreshKey?: number
    isDebug?: boolean
    debugMeta?: DebugMeta
    feedLayout: FeedLayout
    setFeedLayout: (layout: FeedLayout) => void
    breakpoint?: Breakpoint
}

export default function DiscoverScreen({
    makers = [],
    makersLoading,
    makersError,
    onRetry,
    onRefresh,
    onMakerTap,
    savedIds,
    onToggleSave,
    onScrollToTop,
    scrollContainerRef,
    locationLabel,
    locationSource,
    userLocation,
    setLocation,
    sponsoredPosts = [],
    isHidden,
    category,
    onCategoryChange,
    openNow,
    onOpenNowChange,
    refreshKey,
    isDebug,
    debugMeta,
    feedLayout,
    setFeedLayout,
    breakpoint = "mobile",
}: DiscoverScreenProps) {
    const [showLocationPicker, setShowLocationPicker] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const [refreshing, setRefreshing] = useState(false)
    const PAGE_SIZE = 20
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const pullStartY = useRef<number | null>(null)
    const pullDistance = useRef(0)
    const pullIndicatorRef = useRef<HTMLDivElement>(null)
    const debouncedQuery = useDebounce(searchQuery)

    const { theme } = useTheme()

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [category, openNow, debouncedQuery])

    // Infinite scroll — callback ref re-observes each time the sentinel mounts
    const sentinelRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (observerRef.current) observerRef.current.disconnect()
            if (!node) return
            const root = scrollContainerRef?.current
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setVisibleCount((prev) => prev + PAGE_SIZE)
                    }
                },
                { root: root || undefined, rootMargin: "300px" },
            )
            observer.observe(node)
            observerRef.current = observer
        },
        [scrollContainerRef],
    )

    const trendingMakers = useMemo(
        () =>
            makers
                .filter((m) => {
                    const vel = m.velocity ?? 0
                    if (vel <= 0) return false
                    const cur = m.currentWeekClicks ?? 0
                    const prev = m.previousWeekClicks ?? 0
                    return cur >= TRENDING_MIN_CURRENT || cur + prev >= TRENDING_MIN_COMBINED
                })
                .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
                .slice(0, 5),
        [makers],
    )

    const q = debouncedQuery.toLowerCase().trim()

    const allFiltered = useMemo(
        () =>
            makers
                .filter((m) => category === "All" || m.category === category.toLowerCase())
                .filter((m) => !openNow || isOpenNow(m.opening_hours))
                .filter(
                    (m) =>
                        !q ||
                        m.name.toLowerCase().includes(q) ||
                        m.category.toLowerCase().includes(q) ||
                        m.city.toLowerCase().includes(q),
                ),
        [makers, category, openNow, q],
    )

    const visibleMakers = useMemo(() => allFiltered.slice(0, visibleCount), [allFiltered, visibleCount])
    const visibleMakerIds = useMemo(() => new Set(visibleMakers.map((m) => m.id)), [visibleMakers])
    const hasMore = visibleCount < allFiltered.length

    const makerSuggestions = useMemo(() => {
        const raw = searchQuery.trim().toLowerCase()
        if (raw.length < 1) return []
        return makers
            .filter((m) => m.name.toLowerCase().startsWith(raw))
            .concat(
                makers.filter(
                    (m) =>
                        !m.name.toLowerCase().startsWith(raw) &&
                        (m.name.toLowerCase().includes(raw) ||
                            m.category.toLowerCase().includes(raw) ||
                            m.city.toLowerCase().includes(raw)),
                ),
            )
            .slice(0, 5)
    }, [searchQuery, makers])

    const pullStartX = useRef<number | null>(null)
    const pullLocked = useRef(false) // true once we've committed to pull-to-refresh

    const handleTouchStart = (e: React.TouchEvent) => {
        pullLocked.current = false
        if (scrollContainerRef?.current && scrollContainerRef.current.scrollTop <= 0) {
            pullStartY.current = e.touches[0].clientY
            pullStartX.current = e.touches[0].clientX
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (pullStartY.current === null || pullStartX.current === null) return
        const dy = e.touches[0].clientY - pullStartY.current
        const dx = Math.abs(e.touches[0].clientX - pullStartX.current)

        // Until locked, require clear vertical-down intent:
        // at least 12px moved and vertical distance > horizontal distance
        if (!pullLocked.current) {
            if (dy < 12) return
            if (dx > dy) {
                // Horizontal gesture — cancel pull tracking entirely
                pullStartY.current = null
                pullStartX.current = null
                return
            }
            pullLocked.current = true
        }

        const dist = Math.max(0, dy)
        pullDistance.current = dist
        if (pullIndicatorRef.current) {
            const capped = Math.min(dist, 80)
            pullIndicatorRef.current.style.transform = `translateY(${capped - 40}px)`
            pullIndicatorRef.current.style.opacity = String(Math.min(dist / 60, 1))
        }
    }

    const handleTouchEnd = () => {
        if (pullStartY.current !== null && pullDistance.current > 60 && !refreshing && onRefresh) {
            setRefreshing(true)
            onRefresh()
            setTimeout(() => setRefreshing(false), 1500)
        }
        pullStartY.current = null
        pullDistance.current = 0
        if (pullIndicatorRef.current) {
            pullIndicatorRef.current.style.transform = "translateY(-40px)"
            pullIndicatorRef.current.style.opacity = "0"
        }
    }

    // Loading skeletons
    if (makersLoading && makers.length === 0) {
        const shimmerBg = {
            background: `linear-gradient(90deg, ${theme.pill} 25%, ${theme.surface} 50%, ${theme.pill} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
        }
        return (
            <div style={{ paddingBottom: 100 }}>
                <div style={{ padding: "16px 16px 14px" }}>
                    <div style={{ ...shimmerBg, width: 80, height: 30, borderRadius: 8, marginBottom: 10 }} />
                    <div style={{ ...shimmerBg, width: 200, height: 14, borderRadius: 6, marginBottom: 16 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                        {[60, 70, 80, 65, 75].map((w, i) => (
                            <div key={i} style={{ ...shimmerBg, width: w, height: 32, borderRadius: 100 }} />
                        ))}
                    </div>
                </div>
                {/* Featured skeleton */}
                <div style={{ padding: "0 16px", marginBottom: 24 }}>
                    <div style={{ ...shimmerBg, height: 160, borderRadius: 20 }} />
                </div>
                {/* All makers skeleton */}
                <div style={{ padding: "0 16px", marginTop: 28, marginBottom: 14 }}>
                    <div style={{ ...shimmerBg, width: 100, height: 18, borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", gap: 4, padding: "0 4px" }}>
                    {[0, 1].map((col) => (
                        <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                            {[180, 220, 160].map((h, i) => (
                                <div key={i} style={{ ...shimmerBg, height: h, borderRadius: 6 }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (makersError && makers.length === 0) {
        return (
            <div
                style={{
                    paddingBottom: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        padding: "40px 24px",
                        background: theme.card,
                        borderRadius: 20,
                        margin: "0 20px",
                        border: `1px solid ${theme.border}`,
                    }}
                >
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u26A0\uFE0F"}</div>
                    <h2
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 18,
                            fontWeight: 600,
                            color: theme.text,
                            margin: "0 0 8px",
                        }}
                    >
                        Something went wrong
                    </h2>
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: theme.textMuted,
                            margin: "0 0 20px",
                            lineHeight: 1.5,
                        }}
                    >
                        {makersError}
                    </p>
                    <button
                        onClick={onRetry}
                        style={{
                            padding: "12px 28px",
                            borderRadius: 100,
                            border: "none",
                            background: theme.btnBg,
                            color: theme.btnText,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            style={{ paddingBottom: 0 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <Helmet>
                <title>maven — Discover Local Makers in Galway</title>
                <meta
                    name="description"
                    content="Discover local craftspeople and makers in Galway, Ireland. Find ceramicists, woodworkers, jewellers, and more near you."
                />
            </Helmet>
            {/* Pull-to-refresh indicator */}
            <div
                ref={pullIndicatorRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    marginLeft: -16,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: theme.card,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "translateY(-40px)",
                    opacity: 0,
                    transition: "transform 0.2s ease, opacity 0.2s ease",
                    zIndex: 60,
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        width: 14,
                        height: 14,
                        border: `2px solid ${theme.border}`,
                        borderTopColor: theme.text,
                        borderRadius: "50%",
                        animation: refreshing ? "spin 0.6s linear infinite" : "none",
                    }}
                />
            </div>

            <DiscoverHeaderV2
                scrollContainerRef={scrollContainerRef}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                category={category}
                onCategoryChange={onCategoryChange}
                openNow={openNow}
                onOpenNowChange={onOpenNowChange}
                locationLabel={locationLabel}
                locationSource={locationSource}
                onLocationPickerOpen={() => setShowLocationPicker(true)}
                onScrollToTop={onScrollToTop}
                onMakerTap={onMakerTap}
                makerSuggestions={makerSuggestions}
                isHidden={isHidden}
                refreshKey={refreshKey}
            />

            {/* Debug scoring summary bar */}
            {isDebug && debugMeta && (
                <div
                    style={{
                        margin: "0 16px 8px",
                        padding: "6px 10px",
                        background: "rgba(0,0,0,0.75)",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "#fff",
                        lineHeight: 1.5,
                    }}
                >
                    {debugMeta.isLowData ? "LOW-DATA (55% prox)" : "NORMAL (35% prox)"} {"\u00B7"} p95: {debugMeta.p95}{" "}
                    {"\u00B7"} {debugMeta.makersWithClicks}/{debugMeta.totalMakers} makers w/ ≥10 clicks
                </div>
            )}

            {/* Trending Makers Carousel */}
            {trendingMakers.length > 0 && (
                <TrendingCarousel
                    key={refreshKey}
                    makers={trendingMakers}
                    onTap={onMakerTap}
                    showOpenStatus={openNow}
                    isDebug={isDebug}
                    imageWidth={breakpoint === "mobile" ? 600 : 800}
                />
            )}

            {/* Category filter pills */}
            <div style={{ marginTop: 12 }}>
                <CategoryPills
                    selected={category}
                    onSelect={onCategoryChange}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => onOpenNowChange(!openNow)}
                    feedLayout={feedLayout}
                    onFeedLayoutChange={setFeedLayout}
                    compact={breakpoint === "mobile"}
                />
            </div>

            <div style={{ marginTop: 8 }}>
                {visibleMakers.length === 0 && !makersLoading ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "60px 24px",
                        }}
                    >
                        <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDD0D"}</div>
                        <h3
                            style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 18,
                                fontWeight: 600,
                                color: theme.text,
                                margin: "0 0 6px",
                            }}
                        >
                            No makers found
                        </h3>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: theme.textMuted,
                                margin: 0,
                            }}
                        >
                            Try a different search or category
                        </p>
                    </div>
                ) : (
                    <MasonryGrid
                        allMakers={makers}
                        visibleIds={visibleMakerIds}
                        sponsoredPosts={sponsoredPosts}
                        savedIds={savedIds}
                        onMakerTap={onMakerTap}
                        onToggleSave={onToggleSave}
                        theme={theme}
                        isDebug={isDebug}
                        singleColumn={feedLayout === "single"}
                        largeCards={breakpoint !== "mobile"}
                        imageWidth={feedLayout === "single" ? 600 : breakpoint === "mobile" ? 400 : 600}
                    />
                )}
                {hasMore && (
                    <>
                        {/* Spinner is always visible below the last item — no blank space */}
                        <div style={{ display: "flex", justifyContent: "center", padding: "28px 0 36px" }}>
                            <div style={{ position: "relative", width: 28, height: 28 }}>
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        borderRadius: "50%",
                                        border: `2.5px solid ${theme.border}`,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        borderRadius: "50%",
                                        border: "2.5px solid transparent",
                                        borderTopColor: theme.textSecondary,
                                        borderRightColor: theme.textSecondary,
                                        animation: "spin 0.55s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                                    }}
                                />
                            </div>
                        </div>
                        {/* Sentinel sits below spinner — 400px rootMargin fires it early */}
                        <div ref={sentinelRef} style={{ height: 1 }} />
                    </>
                )}
            </div>

            <div style={{ paddingTop: 48, paddingBottom: 24, textAlign: "center" }}>
                <span
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: theme.textMuted,
                    }}
                >
                    maven
                </span>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: theme.textMuted,
                        margin: "4px 0 0",
                    }}
                >
                    v0.1.0 {"\u00B7"} Made with {"\u2665"} in Galway
                </p>
            </div>

            {showLocationPicker && (
                <LocationPicker
                    userLocation={userLocation}
                    locationLabel={locationLabel}
                    locationSource={locationSource}
                    setLocation={setLocation}
                    onClose={() => setShowLocationPicker(false)}
                />
            )}
        </div>
    )
}
