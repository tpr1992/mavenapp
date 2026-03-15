import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import { isOpenNow } from "../utils/time"
import { getDistance, getCountyCenter } from "../utils/distance"
import { TOWNS } from "../data/towns"
import useDebounce from "../hooks/useDebounce"
import useSearch from "../hooks/useSearch"
import CategoryPills from "../components/ui/CategoryPills"
import type { FeedLayout } from "../hooks/useFeedLayout"
import LocationPicker from "../components/ui/LocationPicker"
import TrendingCarousel from "../components/discover/TrendingCarousel"
import MasonryGrid from "../components/discover/MasonryGrid"
import DiscoverHeader from "../components/discover/DiscoverHeader"
import type { Maker, SponsoredPost } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface DebugMeta {
    p95Engagement: number
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
    onReset: () => void
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
    onReset,
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
    const { hits: searchHits } = useSearch(debouncedQuery)

    const { theme } = useTheme()
    const feedRef = useRef<HTMLDivElement>(null)

    // Reset all carousels (trending + card galleries) on logo/discover tap
    const initialRefreshKey = useRef(refreshKey)
    useEffect(() => {
        if (refreshKey === initialRefreshKey.current) return
        const el = feedRef.current
        if (!el) return
        el.querySelectorAll<HTMLDivElement>("[data-carousel-scroll='simple']").forEach((scroll) => {
            scroll.scrollTo({ left: 0, behavior: "smooth" })
        })
    }, [refreshKey])

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

    const prevTrendingRef = useRef<Maker[]>([])
    const trendingMakers = useMemo(() => {
        if (isHidden) return prevTrendingRef.current
        // Trending = makers with growing engagement (current > previous week).
        // This differs from the feed (which blends proximity + engagement + freshness),
        // so trending surfaces makers that are gaining momentum regardless of location.
        const withGrowth = makers
            .filter((m) => {
                const cur = m.currentWeekClicks ?? 0
                const prev = m.previousWeekClicks ?? 0
                return cur > prev && cur >= 3
            })
            .sort((a, b) => {
                // Sort by growth ratio, weighted by volume
                const aGrowth =
                    ((a.currentWeekClicks ?? 0) - (a.previousWeekClicks ?? 0)) *
                    Math.log2(2 + (a.currentWeekClicks ?? 0))
                const bGrowth =
                    ((b.currentWeekClicks ?? 0) - (b.previousWeekClicks ?? 0)) *
                    Math.log2(2 + (b.currentWeekClicks ?? 0))
                return bGrowth - aGrowth
            })
            .slice(0, 5)
        if (withGrowth.length > 0) {
            prevTrendingRef.current = withGrowth
            return withGrowth
        }
        // Fallback: most engaged makers by decayed score (survives week rollovers)
        const byEngagement = makers
            .filter((m) => (m.engagementScore ?? 0) > 0)
            .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
            .slice(0, 5)
        if (byEngagement.length > 0) {
            prevTrendingRef.current = byEngagement
            return byEngagement
        }
        // Last resort: top scored makers from the feed
        const fallback = makers.slice(0, 5)
        prevTrendingRef.current = fallback
        return fallback
    }, [makers, isHidden])

    const NEARBY_RADIUS_KM = 50
    const q = debouncedQuery.toLowerCase().trim()

    const countyMatch = useMemo(() => getCountyCenter(q, TOWNS), [q])

    const prevFilteredRef = useRef<Maker[]>([])
    const allFiltered = useMemo(() => {
        if (isHidden) return prevFilteredRef.current
        const base = makers
            .filter((m) => category === "All" || m.category === category.toLowerCase())
            .filter((m) => !openNow || isOpenNow(m.opening_hours))

        let result: Maker[]
        if (!q) {
            result = base
        } else if (searchHits.length > 0) {
            // Use RPC search results when available (full-text + fuzzy + synonyms)
            const hitMap = new Map(searchHits.map((h) => [h.id, h.search_rank]))
            result = base
                .filter((m) => hitMap.has(m.id))
                .sort((a, b) => (hitMap.get(b.id) ?? 0) - (hitMap.get(a.id) ?? 0))
        } else if (countyMatch) {
            // Client-side fallback while RPC is loading or returned nothing
            const distMap = new Map<string, number>()
            const getDist = (m: Maker) => {
                let d = distMap.get(m.id)
                if (d === undefined) {
                    d = getDistance(countyMatch.lat, countyMatch.lng, m.lat, m.lng)
                    distMap.set(m.id, d)
                }
                return d
            }
            const results = base.filter((m) => {
                if (m.name.toLowerCase().includes(q)) return true
                if (m.category.toLowerCase().includes(q)) return true
                if (m.city.toLowerCase().includes(q)) return true
                if (m.county.toLowerCase() === countyMatch.county.toLowerCase()) return true
                return getDist(m) <= NEARBY_RADIUS_KM
            })
            result = results.sort((a, b) => {
                const aIn = a.county.toLowerCase() === countyMatch.county.toLowerCase()
                const bIn = b.county.toLowerCase() === countyMatch.county.toLowerCase()
                if (aIn !== bIn) return aIn ? -1 : 1
                return getDist(a) - getDist(b)
            })
        } else {
            result = base.filter(
                (m) =>
                    m.name.toLowerCase().includes(q) ||
                    m.category.toLowerCase().includes(q) ||
                    m.city.toLowerCase().includes(q) ||
                    m.county.toLowerCase().includes(q),
            )
        }
        prevFilteredRef.current = result
        return result
    }, [makers, category, openNow, q, countyMatch, searchHits, isHidden])

    const visibleMakers = useMemo(() => allFiltered.slice(0, visibleCount), [allFiltered, visibleCount])
    const hasMore = visibleCount < allFiltered.length

    const makerSuggestions = useMemo(() => {
        if (isHidden) return []
        const raw = searchQuery.trim().toLowerCase()
        if (raw.length < 1) return []

        const sugCounty = getCountyCenter(raw, TOWNS)

        const nameStarts = makers.filter((m) => m.name.toLowerCase().startsWith(raw))
        const textMatches = makers.filter(
            (m) =>
                !m.name.toLowerCase().startsWith(raw) &&
                (m.name.toLowerCase().includes(raw) ||
                    m.category.toLowerCase().includes(raw) ||
                    m.city.toLowerCase().includes(raw) ||
                    m.county.toLowerCase().includes(raw)),
        )

        let results = [...nameStarts, ...textMatches]

        if (sugCounty) {
            const ids = new Set(results.map((m) => m.id))
            const distMap = new Map<string, number>()
            const nearby = makers
                .filter((m) => {
                    if (ids.has(m.id)) return false
                    const dist = getDistance(sugCounty.lat, sugCounty.lng, m.lat, m.lng)
                    distMap.set(m.id, dist)
                    return dist <= NEARBY_RADIUS_KM
                })
                .sort((a, b) => (distMap.get(a.id) ?? 0) - (distMap.get(b.id) ?? 0))
            results = [...results, ...nearby]
        }

        // If client-side found nothing, use RPC search hits (handles typos + synonyms)
        if (results.length === 0 && searchHits.length > 0) {
            const hitIds = new Set(searchHits.map((h) => h.id))
            results = makers.filter((m) => hitIds.has(m.id))
        }

        return results.slice(0, 5)
    }, [searchQuery, makers, searchHits, isHidden])

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

    const refreshTimer = useRef<ReturnType<typeof setTimeout>>(null)

    const handleTouchEnd = () => {
        if (pullStartY.current !== null && pullDistance.current > 60 && !refreshing && onRefresh) {
            setRefreshing(true)
            onRefresh()
            if (refreshTimer.current) clearTimeout(refreshTimer.current)
            refreshTimer.current = setTimeout(() => setRefreshing(false), 1500)
        }
        pullStartY.current = null
        pullDistance.current = 0
        if (pullIndicatorRef.current) {
            pullIndicatorRef.current.style.transform = "translateY(-40px)"
            pullIndicatorRef.current.style.opacity = "0"
        }
    }

    useEffect(() => {
        return () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current)
        }
    }, [])

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
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 18,
                            fontWeight: 800,
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
            ref={feedRef}
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

            <DiscoverHeader
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
                onReset={onReset}
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
                    {debugMeta.isLowData ? "LOW-DATA (55% prox)" : "NORMAL (40% prox)"} {"\u00B7"} p95eng:{" "}
                    {debugMeta.p95Engagement.toFixed(1)} {"\u00B7"} {debugMeta.makersWithClicks}/{debugMeta.totalMakers}{" "}
                    makers w/ ≥10 clicks
                </div>
            )}

            {/* Trending Makers Carousel — hidden during search */}
            {trendingMakers.length > 0 && !q && (
                <TrendingCarousel
                    makers={trendingMakers}
                    onTap={onMakerTap}
                    showOpenStatus={openNow}
                    isDebug={isDebug}
                    imageWidth={breakpoint === "mobile" ? 600 : 800}
                    resetKey={refreshKey}
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
                                fontFamily: "'Syne', sans-serif",
                                fontSize: 18,
                                fontWeight: 800,
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
                        makers={visibleMakers}
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
                        letterSpacing: "-0.03em",
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
