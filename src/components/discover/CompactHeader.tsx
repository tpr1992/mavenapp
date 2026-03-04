import { useState, useRef, useEffect } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import CategoryIcon from "../ui/CategoryIcon"
import SearchBar from "../ui/SearchBar"
import { formatLocation } from "../../utils/distance"
import type { Maker } from "../../types"

interface CompactHeaderProps {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    fullHeaderRef: React.RefObject<HTMLDivElement | null>
    searchQuery: string
    onSearchQueryChange: (query: string) => void
    isFullSearchOpen: boolean
    onCloseFullSearch: () => void
    category: string
    onCategoryChange: (cat: string) => void
    openNow: boolean
    onOpenNowChange: (val: boolean) => void
    onScrollToTop: () => void
    onMakerTap: (maker: Maker) => void
    makerSuggestions: Maker[]
    isHidden: boolean
    refreshKey?: number
}

export default function CompactHeader({
    scrollContainerRef,
    fullHeaderRef,
    searchQuery,
    onSearchQueryChange,
    isFullSearchOpen,
    onCloseFullSearch,
    category,
    onCategoryChange,
    openNow,
    onOpenNowChange,
    onScrollToTop,
    onMakerTap,
    makerSuggestions,
    isHidden,
    refreshKey,
}: CompactHeaderProps) {
    const { theme, isDark } = useTheme()

    const [compactBar, setCompactBar] = useState("hidden")
    const [compactSearchOpen, setCompactSearchOpen] = useState(false)
    const [compactSearchFocused, setCompactSearchFocused] = useState(false)
    const [pillsFade, setPillsFade] = useState({ left: false, right: true })

    const compactBarElRef = useRef<HTMLDivElement>(null)
    const compactSearchRef = useRef<HTMLInputElement>(null)
    const compactSearchGridRef = useRef<HTMLDivElement>(null)
    const compactPillsRef = useRef<HTMLDivElement>(null)

    // Scroll tracking
    const lastScrollTop = useRef(0)
    const lastTime = useRef(Date.now())
    const velocity = useRef(0)
    const pastFullHeader = useRef(false)

    // Rubber band
    const rbOffset = useRef(0)
    const rbPrevScroll = useRef(0)
    const rbPrevTime = useRef(0)
    const rbVelocity = useRef(0)
    const rbAnimating = useRef(false)
    const isTouching = useRef(false)
    const barVisible = useRef(false)

    // Prop tracking refs (avoid stale closures in scroll handler)
    const searchQueryRef = useRef(searchQuery)
    searchQueryRef.current = searchQuery
    const compactSearchOpenRef = useRef(compactSearchOpen)
    compactSearchOpenRef.current = compactSearchOpen

    // Reset search whenever compact bar hides — covers all hide paths
    useEffect(() => {
        if (compactBar === "hidden") {
            setCompactSearchOpen(false)
            setCompactSearchFocused(false)
        }
    }, [compactBar])

    // Reset when returning from a maker profile
    useEffect(() => {
        if (!isHidden) {
            barVisible.current = false
            setCompactBar("hidden")
        }
    }, [isHidden])

    // Pills fade edge masks
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
        el.addEventListener("touchmove", update, { passive: true })
        const ro = new ResizeObserver(update)
        ro.observe(el)
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

    // Scroll handler with rubber band dismiss
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        let desktopSettle: ReturnType<typeof setTimeout> | null = null

        // Disable expensive backdrop-filter during rubber band for smooth 60fps.
        // Must restore to exact React values (not "") since React won't reconcile
        // properties it believes are already set.
        const s = (bar: HTMLDivElement) => bar.style as CSSStyleDeclaration & Record<string, string>
        const frost = isDark ? "rgba(18,18,18,0.85)" : "rgba(250,248,244,0.85)"
        const killFrost = (bar: HTMLDivElement) => {
            s(bar).backdropFilter = "none"
            s(bar).webkitBackdropFilter = "none"
            s(bar).background = isDark ? "rgb(18,18,18)" : "rgb(250,248,244)"
        }
        const restoreFrost = (bar: HTMLDivElement) => {
            s(bar).backdropFilter = "blur(20px) saturate(1.4)"
            s(bar).webkitBackdropFilter = "blur(20px) saturate(1.4)"
            s(bar).background = frost
        }

        const doSnapBack = (bar: HTMLDivElement) => {
            const barHeight = bar.offsetHeight || 60
            const pullRatio = Math.min(rbOffset.current / barHeight, 0.5)
            const duration = Math.round(100 + pullRatio * 280)

            rbAnimating.current = true
            rbOffset.current = 0
            rbVelocity.current = 0

            bar.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0, 0.08, 1)`
            bar.style.transform = "translateY(0)"
            setTimeout(() => {
                bar.style.transition = ""
                bar.style.transform = ""
                restoreFrost(bar)
                rbAnimating.current = false
            }, duration)
        }

        const doCommitHide = (bar: HTMLDivElement) => {
            rbAnimating.current = true
            rbOffset.current = 0
            rbVelocity.current = 0
            barVisible.current = false

            // Reset search state — React owns gridTemplateRows via compactSearchOpen
            setCompactSearchOpen(false)
            compactSearchRef.current?.blur()
            setCompactSearchFocused(false)

            bar.style.pointerEvents = "none"
            bar.style.transition = "transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)"
            bar.style.transform = "translateY(-100%)"
            setTimeout(() => {
                bar.style.transition = ""
                bar.style.transform = ""
                bar.style.pointerEvents = ""
                restoreFrost(bar)
                setCompactBar("hidden")
                rbAnimating.current = false
            }, 220)
        }

        const resolveRubberBand = () => {
            if (rbOffset.current <= 0 || rbAnimating.current) return
            const bar = compactBarElRef.current
            if (!bar) return
            const barHeight = bar.offsetHeight || 60
            const progress = rbOffset.current / barHeight
            const vel = rbVelocity.current
            if (progress > 0.35 || vel > 0.5) {
                doCommitHide(bar)
            } else {
                doSnapBack(bar)
            }
        }

        const onTouchStart = () => {
            isTouching.current = true
        }
        const onTouchEnd = () => {
            isTouching.current = false
            resolveRubberBand()
        }

        const onScroll = () => {
            const now = Date.now()
            const st = el.scrollTop
            const dt = Math.max(now - lastTime.current, 1)
            const delta = st - lastScrollTop.current
            const v = delta / dt

            velocity.current = velocity.current * 0.7 + v * 0.3

            const containerTop = el.getBoundingClientRect().top
            const headerRect = fullHeaderRef.current?.getBoundingClientRect()
            const isPast = headerRect ? headerRect.bottom <= containerTop : false
            const bar = compactBarElRef.current

            if (desktopSettle) {
                clearTimeout(desktopSettle)
                desktopSettle = null
            }

            if (!isPast) {
                if (rbOffset.current > 0 && bar) {
                    rbOffset.current = 0
                    rbVelocity.current = 0
                    bar.style.transition = ""
                    bar.style.transform = ""
                    restoreFrost(bar)
                }
                barVisible.current = false
                setCompactBar("hidden")
                pastFullHeader.current = false
                velocity.current = 0
            } else {
                if (!pastFullHeader.current) {
                    // Only dismiss keyboard — don't close search bar.
                    // Collapsing its height while off-screen causes a layout reflow
                    // that stutters the masonry grid (it's in normal document flow).
                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                }
                pastFullHeader.current = true

                if (rbOffset.current > 0 && bar && !rbAnimating.current) {
                    // Rubber band active — track movement
                    const scrollDelta = st - rbPrevScroll.current
                    const timeDelta = Math.max(now - rbPrevTime.current, 1)
                    rbPrevScroll.current = st
                    rbPrevTime.current = now

                    rbVelocity.current = rbVelocity.current * 0.5 + (scrollDelta / timeDelta) * 0.5

                    const barHeight = bar.offsetHeight || 60

                    if (scrollDelta > 0) {
                        rbOffset.current = Math.min(rbOffset.current + scrollDelta * 0.8, barHeight)
                    } else if (scrollDelta < 0) {
                        rbOffset.current = Math.max(0, rbOffset.current + scrollDelta * 0.8)
                    }

                    if (rbOffset.current <= 0) {
                        rbOffset.current = 0
                        rbVelocity.current = 0
                        bar.style.transition = ""
                        bar.style.transform = ""
                        restoreFrost(bar)
                    } else {
                        bar.style.transition = "none"
                        bar.style.transform = `translateY(-${rbOffset.current}px)`
                    }

                    if (!isTouching.current && rbOffset.current > 0) {
                        desktopSettle = setTimeout(resolveRubberBand, 150)
                    }
                } else if (barVisible.current && delta > 2 && bar && !rbAnimating.current) {
                    // Bar visible, scrolling down — enter rubber band
                    rbOffset.current = 0.1
                    rbPrevScroll.current = st
                    rbPrevTime.current = now
                    rbVelocity.current = 0
                    killFrost(bar)
                    compactSearchRef.current?.blur()
                    setCompactSearchFocused(false)
                } else if (!barVisible.current && velocity.current < -0.12 && !rbAnimating.current) {
                    // Scrolling up with intent — show compact bar
                    barVisible.current = true
                    setCompactBar("visible")
                }
            }

            if (Math.abs(delta) > 5) {
                lastScrollTop.current = st
                lastTime.current = now
            }
        }

        el.addEventListener("scroll", onScroll, { passive: true })
        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("touchend", onTouchEnd, { passive: true })
        el.addEventListener("touchcancel", onTouchEnd, { passive: true })
        return () => {
            el.removeEventListener("scroll", onScroll)
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("touchend", onTouchEnd)
            el.removeEventListener("touchcancel", onTouchEnd)
            if (desktopSettle) clearTimeout(desktopSettle)
        }
    }, [scrollContainerRef, fullHeaderRef, isDark])

    const fadeMask = (() => {
        const l = pillsFade.left ? "transparent 0%, black 16px" : "black 0%"
        const r = pillsFade.right ? "black calc(100% - 16px), transparent 100%" : "black 100%"
        const mask = `linear-gradient(to right, ${l}, ${r})`
        return { maskImage: mask, WebkitMaskImage: mask }
    })()

    return (
        <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
            <div
                ref={compactBarElRef}
                style={{
                    background: isDark ? "rgba(18,18,18,0.85)" : "rgba(250,248,244,0.85)",
                    backdropFilter: "blur(20px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                    borderBottom: compactBar === "visible" ? `1px solid ${theme.border}` : "1px solid transparent",
                    transform: compactBar === "visible" ? "translateY(0)" : "translateY(-100%)",
                    transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.4s ease",
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
                            onSearchQueryChange("")
                            setCompactSearchOpen(false)
                            onCloseFullSearch()
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
                            ...fadeMask,
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
                            const opening = !compactSearchOpen
                            if (opening) {
                                const grid = compactSearchGridRef.current
                                if (grid) grid.style.gridTemplateRows = "1fr"
                                compactSearchRef.current?.focus()
                            }
                            setCompactSearchOpen(opening)
                        }}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            border: `1.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
                            background: "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        {compactSearchOpen ? (
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
                <div
                    ref={compactSearchGridRef}
                    style={{
                        display: "grid",
                        gridTemplateRows: compactSearchOpen ? "1fr" : "0fr",
                        transition: "grid-template-rows 0.15s ease-out",
                    }}
                >
                    <div style={{ overflow: "hidden" }}>
                        <div style={{ padding: "0 20px 10px" }}>
                            <SearchBar
                                ref={compactSearchRef}
                                value={searchQuery}
                                onChange={onSearchQueryChange}
                                onFocus={() => setCompactSearchFocused(true)}
                                onBlur={() => setTimeout(() => setCompactSearchFocused(false), 200)}
                                placeholder="Search makers, categories, places..."
                                containerStyle={{
                                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                                }}
                            />
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
                                                i < makerSuggestions.length - 1 ? `1px solid ${theme.border}` : "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                        }}
                                    >
                                        <CategoryIcon category={maker.category} size={14} style={{ flexShrink: 0 }} />
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
    )
}
