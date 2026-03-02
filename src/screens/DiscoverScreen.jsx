import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react"
import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"
import { useTheme } from "../contexts/ThemeContext"
import { CATEGORY_EMOJI } from "../constants/categories"
import { isOpenNow } from "../utils/time"
import { formatLocation, formatLocationName } from "../utils/distance"
import { safeOpen } from "../utils/safeOpen"
import useDebounce from "../hooks/useDebounce"
import Carousel, { TRANSITION_IOS } from "../components/ui/Carousel"
import CategoryPills from "../components/ui/CategoryPills"
import MakerListItem from "../components/makers/MakerListItem"
import LocationPicker from "../components/ui/LocationPicker"

import { optimizeImageUrl } from "../utils/image"

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

// ─── Trending Carousel ──────────────────────────────────────────────────
function TrendingCard({ maker, onTap, showOpenStatus, isDark }) {
    return (
        <div onClick={() => onTap(maker)} style={{ padding: "0 4px", cursor: "pointer" }}>
            <div
                style={{
                    background: maker.gallery_urls?.[0]
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.75) 100%), url(${optimizeImageUrl(maker.gallery_urls[0], 400)}) center/cover`
                        : maker.hero_color,
                    borderRadius: 20,
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                    filter: isDark ? "brightness(0.78) saturate(0.85)" : "none",
                    minHeight: 160,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -30,
                        right: -30,
                        width: 150,
                        height: 150,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -50,
                        left: -20,
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.04)",
                    }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.6)",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                        }}
                    >
                        Trending This Week
                    </span>
                </div>
                <h2
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#fff",
                        margin: "10px 0 8px",
                        lineHeight: 1.2,
                    }}
                >
                    {maker.name}
                </h2>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13.5,
                        color: "rgba(255,255,255,0.8)",
                        margin: 0,
                        lineHeight: 1.5,
                        maxWidth: 280,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {maker.bio}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            lineHeight: 1,
                            color: "rgba(255,255,255,0.6)",
                        }}
                    >
                        {CATEGORY_EMOJI[maker.category]} {maker.category}
                    </span>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            lineHeight: 1,
                            color: "rgba(255,255,255,0.6)",
                        }}
                    >
                        {`\u25C8 ${formatLocationName(maker, { full: true })}`}
                    </span>
                    {showOpenStatus && (
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: isOpenNow(maker.opening_hours)
                                    ? "rgba(134,239,172,0.9)"
                                    : "rgba(255,255,255,0.4)",
                            }}
                        >
                            {isOpenNow(maker.opening_hours) ? "\u25CF Open" : "\u25CB Closed"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

const TrendingCarousel = memo(function TrendingCarousel({ makers, onTap, showOpenStatus }) {
    const { isDark } = useTheme()
    if (!makers.length) return null
    return (
        <Carousel
            items={makers}
            renderItem={(maker) => (
                <TrendingCard maker={maker} onTap={onTap} showOpenStatus={showOpenStatus} isDark={isDark} />
            )}
            loop
            autoPlay={7000}
            transition={TRANSITION_IOS}
            dots="pill"
        />
    )
})

// ─── Masonry Grid (memoized) ─────────────────────────
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

const MasonryGrid = memo(function MasonryGrid({
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
                            <div style={{ fontSize: 36, opacity: 0.6, zIndex: 1 }}>
                                {CATEGORY_EMOJI[maker.category]}
                            </div>
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
}) {
    const [viewMode, setViewMode] = useState("gallery")
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
    const observerRef = useRef(null)
    const pullStartY = useRef(null)
    const pullDistance = useRef(0)
    const pullIndicatorRef = useRef(null)
    const searchRef = useRef(null)
    const compactSearchRef = useRef(null)
    const debouncedQuery = useDebounce(searchQuery)
    const fullHeaderRef = useRef(null)
    const lastScrollTop = useRef(0)
    const lastTime = useRef(Date.now())
    const velocity = useRef(0)
    const pastFullHeader = useRef(false)
    const searchOpenRef = useRef(searchOpen)
    const searchQueryRef = useRef(searchQuery)
    searchOpenRef.current = searchOpen
    searchQueryRef.current = searchQuery
    const compactPillsRef = useRef(null)
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
        (node) => {
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
                .filter((m) => m.score > 0)
                .sort((a, b) => b.score - a.score)
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

    const pullStartX = useRef(null)
    const pullLocked = useRef(false) // true once we've committed to pull-to-refresh

    const handleTouchStart = (e) => {
        pullLocked.current = false
        if (scrollContainerRef?.current?.scrollTop <= 0) {
            pullStartY.current = e.touches[0].clientY
            pullStartX.current = e.touches[0].clientX
        }
    }

    const handleTouchMove = (e) => {
        if (pullStartY.current === null) return
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
            pullIndicatorRef.current.style.opacity = Math.min(dist / 60, 1)
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
            style={{ paddingBottom: 100 }}
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
                                    onClick={() => onOpenNowChange((v) => !v)}
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
                                            fontSize: 13.5,
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
                                            <span style={{ fontSize: 14, flexShrink: 0 }}>
                                                {CATEGORY_EMOJI[maker.category]}
                                            </span>
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
                                    setTimeout(() => {
                                        if (searchRef.current) searchRef.current.focus()
                                    }, 50)
                                }}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: searchOpen ? theme.btnBg : theme.pill,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    transition: "background 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                                }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    style={{
                                        position: "absolute",
                                        opacity: searchOpen ? 0 : 1,
                                        transform: searchOpen ? "scale(0.6)" : "scale(1)",
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
                                    width="12"
                                    height="12"
                                    viewBox="0 0 10 10"
                                    fill="none"
                                    style={{
                                        position: "absolute",
                                        opacity: searchOpen ? 1 : 0,
                                        transform: searchOpen ? "scale(1)" : "scale(0.6)",
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
                    </div>
                    <p
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
                    </p>

                    {/* Search bar */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateRows: searchOpen ? "1fr" : "0fr",
                            transition: "grid-template-rows 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
                        }}
                    >
                        <div style={{ overflow: "hidden" }}>
                            <div
                                style={{
                                    paddingTop: 12,
                                    opacity: searchOpen ? 1 : 0,
                                    transform: searchOpen ? "translateY(0)" : "translateY(-4px)",
                                    transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        background: theme.inputBg,
                                        borderRadius: 100,
                                        padding: "10px 16px",
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
                                        ref={searchRef}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                        placeholder="Search makers, categories, places..."
                                        style={{
                                            flex: 1,
                                            border: "none",
                                            outline: "none",
                                            background: "transparent",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14,
                                            fontWeight: 400,
                                            color: theme.text,
                                            letterSpacing: "0.01em",
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            style={{
                                                width: 22,
                                                height: 22,
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
                                        <span style={{ fontSize: 15, flexShrink: 0 }}>
                                            {CATEGORY_EMOJI[maker.category]}
                                        </span>
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

                <CategoryPills
                    selected={category}
                    onSelect={onCategoryChange}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => onOpenNowChange((v) => !v)}
                />
            </div>

            {/* Trending Makers Carousel */}
            {trendingMakers.length > 0 && (
                <TrendingCarousel makers={trendingMakers} onTap={onMakerTap} showOpenStatus={openNow} />
            )}

            {/* All Makers */}
            <div style={{ marginTop: 28 }}>
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
                            onClick={() => setViewMode("gallery")}
                            style={{
                                width: 30,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: viewMode === "gallery" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: viewMode === "gallery" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="0"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={viewMode === "gallery" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="8"
                                    y="0"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={viewMode === "gallery" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="0"
                                    y="8"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={viewMode === "gallery" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="8"
                                    y="8"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill={viewMode === "gallery" ? theme.text : theme.textMuted}
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            style={{
                                width: 30,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: viewMode === "list" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="1"
                                    width="14"
                                    height="2.5"
                                    rx="1"
                                    fill={viewMode === "list" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="0"
                                    y="5.75"
                                    width="14"
                                    height="2.5"
                                    rx="1"
                                    fill={viewMode === "list" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="0"
                                    y="10.5"
                                    width="14"
                                    height="2.5"
                                    rx="1"
                                    fill={viewMode === "list" ? theme.text : theme.textMuted}
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
                ) : viewMode === "list" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
                        {visibleMakers.map((maker, i) => (
                            <MakerListItem
                                key={maker.id}
                                maker={maker}
                                index={i}
                                isSaved={savedIds.has(maker.id)}
                                onTap={onMakerTap}
                                onToggleSave={onToggleSave}
                                highlightQuery={q}
                            />
                        ))}
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
