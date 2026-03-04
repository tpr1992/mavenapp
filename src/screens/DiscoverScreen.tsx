import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import CategoryIcon from "../components/ui/CategoryIcon"
import { isOpenNow } from "../utils/time"
import { formatLocation } from "../utils/distance"
import useDebounce from "../hooks/useDebounce"
import CategoryPills from "../components/ui/CategoryPills"
import type { FeedLayout } from "../hooks/useFeedLayout"
import LocationPicker from "../components/ui/LocationPicker"
import TrendingCarousel from "../components/discover/TrendingCarousel"
import MasonryGrid from "../components/discover/MasonryGrid"
import SearchBar from "../components/ui/SearchBar"
import { TRENDING_MIN_CURRENT, TRENDING_MIN_COMBINED } from "../utils/scoring"
import type { Maker, SponsoredPost } from "../types"

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
}: DiscoverScreenProps) {
    const [searchOpen, setSearchOpen] = useState(false)
    const [showLocationPicker, setShowLocationPicker] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)
    const [compactSearchFocused, setCompactSearchFocused] = useState(false)
    // "full" = at the top, "compact" = sticky mini bar, "hidden" = scrolling down
    const [compactBar, setCompactBar] = useState("hidden")
    const [compactSearchOpen, setCompactSearchOpen] = useState(false)

    // Reset compact bar when returning from a maker profile
    useEffect(() => {
        if (!isHidden) setCompactBar("hidden")
    }, [isHidden])
    const [refreshing, setRefreshing] = useState(false)
    const PAGE_SIZE = 20
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const pullStartY = useRef<number | null>(null)
    const pullDistance = useRef(0)
    const pullIndicatorRef = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const compactSearchRef = useRef<HTMLInputElement>(null)
    const debouncedQuery = useDebounce(searchQuery)
    const fullHeaderRef = useRef<HTMLDivElement>(null)
    const lastScrollTop = useRef(0)
    const lastTime = useRef(Date.now())
    const velocity = useRef(0)
    const pastFullHeader = useRef(false)
    const searchOpenRef = useRef(searchOpen)
    const searchQueryRef = useRef(searchQuery)
    searchOpenRef.current = searchOpen
    searchQueryRef.current = searchQuery
    const compactPillsRef = useRef<HTMLDivElement>(null)
    const [pillsFade, setPillsFade] = useState({ left: false, right: true })

    const { theme } = useTheme()

    useEffect(() => {
        const el = compactPillsRef.current
        if (!el) return
        const update = () => {
            const atLeft = el.scrollLeft <= 2
            const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
            setPillsFade({ left: !atLeft, right: !atRight })
        }
        requestAnimationFrame(update)
        el.addEventListener("scroll", update, { passive: true })
        // Also listen for touch events in case scroll event doesn't fire
        el.addEventListener("touchmove", update, { passive: true })
        const ro = new ResizeObserver(update)
        ro.observe(el)
        // Poll briefly after becoming visible to catch delayed layout
        const interval = setInterval(update, 100)
        const timeout = setTimeout(() => clearInterval(interval), 1000)
        return () => {
            el.removeEventListener("scroll", update)
            el.removeEventListener("touchmove", update)
            ro.disconnect()
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [compactBar, category])

    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        const onScroll = () => {
            const now = Date.now()
            const st = el.scrollTop
            const dt = Math.max(now - lastTime.current, 1)
            const delta = st - lastScrollTop.current
            const v = delta / dt

            velocity.current = velocity.current * 0.7 + v * 0.3

            // Use bounding rect for pixel-perfect header visibility check
            const containerTop = el.getBoundingClientRect().top
            const headerRect = fullHeaderRef.current?.getBoundingClientRect()
            const isPast = headerRect ? headerRect.bottom <= containerTop : false

            if (!isPast) {
                // Full header is still visible — always hide compact bar
                setCompactBar("hidden")
                pastFullHeader.current = false
                velocity.current = 0
            } else if (compactSearchOpen) {
                // Keep compact bar visible while search is active
                setCompactBar("visible")
                pastFullHeader.current = true
            } else if (!pastFullHeader.current && isPast) {
                // Just scrolled past the main header — reset search if no active query
                if (searchOpenRef.current && !searchQueryRef.current.trim()) setSearchOpen(false)
                pastFullHeader.current = true
            } else if (velocity.current < -0.12) {
                // Scrolling up with intent, past full header — show compact
                setCompactBar("visible")
                pastFullHeader.current = true
            } else if (velocity.current > 0.12) {
                // Scrolling down — hide compact
                setCompactBar("hidden")
                pastFullHeader.current = true
            }

            if (Math.abs(delta) > 5) {
                lastScrollTop.current = st
                lastTime.current = now
            }
        }
        el.addEventListener("scroll", onScroll, { passive: true })
        return () => el.removeEventListener("scroll", onScroll)
    }, [scrollContainerRef, compactSearchOpen])

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

            {/* Compact sticky bar — only appears when scrolling up past the full header */}
            <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
                <div
                    style={{
                        background: theme.bg,
                        borderBottom: compactBar === "visible" ? `1px solid ${theme.border}` : "1px solid transparent",
                        transform: compactBar === "visible" ? "translateY(0)" : "translateY(-100%)",
                        opacity: compactBar === "visible" ? 1 : 0,
                        transition:
                            "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease, border-color 0.4s ease",
                        pointerEvents: compactBar === "visible" ? "auto" : "none",
                    }}
                >
                    {/* Single row: logo | pills | search */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 16px 10px 20px",
                        }}
                    >
                        <h2
                            onClick={() => {
                                onScrollToTop()
                                onCategoryChange("All")
                                setSearchQuery("")
                                setCompactSearchOpen(false)
                                setSearchOpen(false)
                                setCompactBar("hidden")
                            }}
                            style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 18,
                                fontWeight: 700,
                                color: theme.text,
                                margin: 0,
                                letterSpacing: "-0.02em",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            maven
                        </h2>
                        <div
                            style={{
                                flex: 1,
                                overflow: "hidden",
                                ...(() => {
                                    const l = pillsFade.left ? "transparent 0%, black 16px" : "black 0%"
                                    const r = pillsFade.right
                                        ? "black calc(100% - 16px), transparent 100%"
                                        : "black 100%"
                                    const mask = `linear-gradient(to right, ${l}, ${r})`
                                    return { maskImage: mask, WebkitMaskImage: mask }
                                })(),
                            }}
                        >
                            <div
                                ref={compactPillsRef}
                                style={{
                                    display: "flex",
                                    gap: 6,
                                    overflowX: "auto",
                                    scrollbarWidth: "none",
                                    msOverflowStyle: "none",
                                    padding: "0 4px",
                                }}
                            >
                                <button
                                    aria-pressed={openNow}
                                    onClick={() => onOpenNowChange(!openNow)}
                                    style={{
                                        padding: "5px 12px",
                                        borderRadius: 100,
                                        border: openNow ? "none" : `1.5px solid ${theme.border}`,
                                        background: openNow ? "#22543d" : "transparent",
                                        color: openNow ? "#fff" : theme.textSecondary,
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {"\u25CF"} Open Now
                                </button>
                                {["Clothing", "Objects", "Art"].map((cat) => (
                                    <button
                                        key={cat}
                                        aria-pressed={category === cat}
                                        onClick={() => onCategoryChange(category === cat ? "All" : cat)}
                                        style={{
                                            padding: "5px 12px",
                                            borderRadius: 100,
                                            border: category === cat ? "none" : `1.5px solid ${theme.border}`,
                                            background: category === cat ? theme.btnBg : "transparent",
                                            color: category === cat ? theme.btnText : theme.textSecondary,
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            aria-label={compactSearchOpen ? "Close search" : "Search"}
                            aria-expanded={compactSearchOpen}
                            onClick={() => {
                                setCompactSearchOpen((v) => !v)
                                setTimeout(() => {
                                    if (compactSearchRef.current) compactSearchRef.current.focus()
                                }, 50)
                            }}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                border: "none",
                                background: compactSearchOpen ? theme.btnBg : theme.pill,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                position: "relative",
                                transition: "background 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                            }}
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="none"
                                style={{
                                    position: "absolute",
                                    opacity: compactSearchOpen ? 0 : 1,
                                    transform: compactSearchOpen ? "scale(0.6)" : "scale(1)",
                                    transition: "opacity 0.2s ease, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                                }}
                            >
                                <circle cx="7" cy="7" r="5.5" stroke="#777" strokeWidth="1.6" />
                                <line
                                    x1="11"
                                    y1="11"
                                    x2="14.5"
                                    y2="14.5"
                                    stroke="#777"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 10 10"
                                fill="none"
                                style={{
                                    position: "absolute",
                                    opacity: compactSearchOpen ? 1 : 0,
                                    transform: compactSearchOpen ? "scale(1)" : "scale(0.6)",
                                    transition: "opacity 0.2s ease, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                                }}
                            >
                                <line
                                    x1="2"
                                    y1="2"
                                    x2="8"
                                    y2="8"
                                    stroke="#fff"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1="8"
                                    y1="2"
                                    x2="2"
                                    y2="8"
                                    stroke="#fff"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateRows: compactSearchOpen ? "1fr" : "0fr",
                            transition: "grid-template-rows 0.15s ease-out",
                        }}
                    >
                        <div style={{ overflow: "hidden" }}>
                            <div
                                style={{
                                    padding: "0 20px 10px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        background: theme.inputBg,
                                        borderRadius: 100,
                                        padding: "9px 16px",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        style={{ flexShrink: 0, opacity: 0.4 }}
                                    >
                                        <circle cx="7" cy="7" r="5.5" stroke="#1a1a1a" strokeWidth="1.5" />
                                        <line
                                            x1="11"
                                            y1="11"
                                            x2="14.5"
                                            y2="14.5"
                                            stroke="#1a1a1a"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <input
                                        ref={compactSearchRef}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setCompactSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setCompactSearchFocused(false), 200)}
                                        placeholder="Search makers..."
                                        style={{
                                            flex: 1,
                                            border: "none",
                                            outline: "none",
                                            background: "transparent",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 16,
                                            fontWeight: 400,
                                            color: theme.text,
                                            letterSpacing: "0.01em",
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                background: theme.border,
                                                border: "none",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                padding: 0,
                                            }}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <line
                                                    x1="2.5"
                                                    y1="2.5"
                                                    x2="7.5"
                                                    y2="7.5"
                                                    stroke={theme.textMuted}
                                                    strokeWidth="1.4"
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1="7.5"
                                                    y1="2.5"
                                                    x2="2.5"
                                                    y2="7.5"
                                                    stroke={theme.textMuted}
                                                    strokeWidth="1.4"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {compactSearchOpen && compactSearchFocused && searchQuery && makerSuggestions.length > 0 && (
                            <div style={{ padding: "0 20px 10px", position: "relative", zIndex: 10 }}>
                                <div
                                    style={{
                                        background: theme.card,
                                        borderRadius: 12,
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                        border: `1px solid ${theme.border}`,
                                        overflow: "hidden",
                                    }}
                                >
                                    {makerSuggestions.map((maker, i) => (
                                        <div
                                            key={maker.id}
                                            onClick={() => onMakerTap(maker)}
                                            style={{
                                                padding: "10px 14px",
                                                cursor: "pointer",
                                                borderBottom:
                                                    i < makerSuggestions.length - 1
                                                        ? `1px solid ${theme.border}`
                                                        : "none",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            <CategoryIcon
                                                category={maker.category}
                                                size={14}
                                                style={{ flexShrink: 0 }}
                                            />
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <span
                                                    style={{
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: theme.text,
                                                    }}
                                                >
                                                    {maker.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontSize: 11,
                                                        color: theme.textMuted,
                                                        marginLeft: 6,
                                                    }}
                                                >
                                                    {maker.category} · {formatLocation(maker)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Full header — renders in flow, scrolls away naturally */}
            <div ref={fullHeaderRef}>
                <div style={{ padding: "12px 16px 14px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 14,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <h1
                                onClick={() => {
                                    onScrollToTop()
                                    setSearchQuery("")
                                    setSearchOpen(false)
                                    setCompactBar("hidden")
                                }}
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontSize: 30,
                                    fontWeight: 700,
                                    color: theme.text,
                                    margin: 0,
                                    letterSpacing: "-0.03em",
                                    lineHeight: 0.75,
                                    cursor: "pointer",
                                }}
                            >
                                maven
                            </h1>
                            <div
                                onClick={() => setShowLocationPicker(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    cursor: "pointer",
                                }}
                            >
                                {locationSource === "gps" ? (
                                    <div
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: "#22543d",
                                            flexShrink: 0,
                                            animation: "locationPulse 2.5s ease-out infinite",
                                        }}
                                    />
                                ) : (
                                    <svg
                                        width="11"
                                        height="11"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        style={{ flexShrink: 0 }}
                                    >
                                        <path
                                            d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z"
                                            fill={locationLabel ? theme.textSecondary : theme.textMuted}
                                        />
                                    </svg>
                                )}
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13.5,
                                        fontWeight: 500,
                                        color: theme.textSecondary,
                                        letterSpacing: "0.01em",
                                    }}
                                >
                                    {locationLabel || "Set location"}
                                </span>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                                    <path
                                        d="M2.5 3.75L5 6.25L7.5 3.75"
                                        stroke={theme.textMuted}
                                        strokeWidth="1.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                                aria-label={searchOpen ? "Close search" : "Search"}
                                aria-expanded={searchOpen}
                                onClick={() => {
                                    setSearchOpen((v) => !v)
                                    if (!searchOpen && searchRef.current) searchRef.current.focus()
                                }}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {searchOpen ? (
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                                        <line
                                            x1="2"
                                            y1="2"
                                            x2="8"
                                            y2="8"
                                            stroke={theme.textMuted}
                                            strokeWidth="1.4"
                                            strokeLinecap="round"
                                        />
                                        <line
                                            x1="8"
                                            y1="2"
                                            x2="2"
                                            y2="8"
                                            stroke={theme.textMuted}
                                            strokeWidth="1.4"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="5.5" stroke={theme.textMuted} strokeWidth="1.6" />
                                        <line
                                            x1="11"
                                            y1="11"
                                            x2="14.5"
                                            y2="14.5"
                                            stroke={theme.textMuted}
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    {/* <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14.5,
                            color: theme.textMuted,
                            margin: 0,
                            letterSpacing: "0.005em",
                            lineHeight: 1.4,
                        }}
                    >
                        Discover local makers &amp; craftspeople
                    </p> */}

                    {/* Search bar */}
                    <div
                        style={{
                            height: searchOpen ? "auto" : 0,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                paddingTop: 12,
                                opacity: searchOpen ? 1 : 0,
                                transform: searchOpen ? "translateY(0)" : "translateY(-8px)",
                                transition: searchOpen
                                    ? "opacity 0.35s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                                    : "opacity 0.2s ease, transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
                                willChange: "opacity, transform",
                            }}
                        >
                            <SearchBar
                                ref={searchRef}
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                placeholder="Search makers, categories, places..."
                            />
                        </div>
                    </div>

                    {/* Maker suggestions dropdown */}
                    {searchOpen && searchFocused && searchQuery && makerSuggestions.length > 0 && (
                        <div style={{ position: "relative", zIndex: 10, marginTop: 8 }}>
                            <div
                                style={{
                                    background: theme.card,
                                    borderRadius: 12,
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                    border: `1px solid ${theme.border}`,
                                    overflow: "hidden",
                                }}
                            >
                                {makerSuggestions.map((maker, i) => (
                                    <div
                                        key={maker.id}
                                        onClick={() => onMakerTap(maker)}
                                        style={{
                                            padding: "11px 16px",
                                            cursor: "pointer",
                                            borderBottom:
                                                i < makerSuggestions.length - 1 ? `1px solid ${theme.border}` : "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                        }}
                                    >
                                        <CategoryIcon category={maker.category} size={15} style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <span
                                                style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 13.5,
                                                    fontWeight: 600,
                                                    color: theme.text,
                                                }}
                                            >
                                                {maker.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 11.5,
                                                    color: theme.textMuted,
                                                    marginLeft: 6,
                                                }}
                                            >
                                                {maker.category} · {maker.city}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
                />
            )}

            {/* Category filter pills */}
            <div style={{ marginTop: 20 }}>
                <CategoryPills
                    selected={category}
                    onSelect={onCategoryChange}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => onOpenNowChange(!openNow)}
                />
            </div>

            {/* All Makers */}
            <div style={{ marginTop: 12 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                        padding: "0 16px",
                    }}
                >
                    <h3
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 18,
                            fontWeight: 600,
                            color: theme.text,
                            margin: 0,
                        }}
                    >
                        {category === "All" ? "All Makers" : category}
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            background: theme.pill,
                            borderRadius: 8,
                            padding: 2,
                            gap: 2,
                        }}
                    >
                        <button
                            onClick={() => setFeedLayout("grid")}
                            style={{
                                width: 30,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: feedLayout === "grid" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: feedLayout === "grid" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="0"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="8"
                                    y="0"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="0"
                                    y="8"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="8"
                                    y="8"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => setFeedLayout("single")}
                            style={{
                                width: 30,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: feedLayout === "single" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: feedLayout === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="0"
                                    width="14"
                                    height="14"
                                    rx="2"
                                    fill={feedLayout === "single" ? theme.text : theme.textMuted}
                                />
                            </svg>
                        </button>
                    </div>
                </div>

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
