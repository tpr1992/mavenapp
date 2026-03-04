import { useState, useRef, useEffect } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import { glassStyle, glassBarStyle, glassBarOpaque } from "../../utils/glass"
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
    onOpenFullSearch: () => void
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
    onOpenFullSearch,
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
    const gBar = glassBarStyle(isDark)
    const gDrop = glassStyle(isDark)

    const [compactBar, setCompactBar] = useState("hidden")
    const [compactSearchOpen, setCompactSearchOpen] = useState(false)
    const [compactSearchFocused, setCompactSearchFocused] = useState(false)
    const [topRowHidden, setTopRowHidden] = useState(false)
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
    const topRowPending = useRef<"collapse" | "expand" | null>(null)

    // Prop tracking refs (avoid stale closures in scroll handler)
    const searchQueryRef = useRef(searchQuery)
    searchQueryRef.current = searchQuery
    const isFullSearchOpenRef = useRef(isFullSearchOpen)
    isFullSearchOpenRef.current = isFullSearchOpen
    const compactSearchOpenRef = useRef(compactSearchOpen)
    compactSearchOpenRef.current = compactSearchOpen
    const topRowHiddenRef = useRef(topRowHidden)
    topRowHiddenRef.current = topRowHidden

    // Reset search whenever compact bar hides — covers all hide paths
    useEffect(() => {
        if (compactBar === "hidden") {
            setCompactSearchOpen(false)
            setCompactSearchFocused(false)
            setTopRowHidden(false)
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
        return () => {
            el.removeEventListener("scroll", update)
            el.removeEventListener("touchmove", update)
            ro.disconnect()
        }
    }, [compactBar, category])

    // Track full header visibility via IntersectionObserver (zero layout cost)
    // instead of getBoundingClientRect on every scroll event
    const headerVisible = useRef(true)
    useEffect(() => {
        const header = fullHeaderRef.current
        const root = scrollContainerRef?.current
        if (!header || !root) return
        const io = new IntersectionObserver(
            ([e]) => {
                headerVisible.current = e.isIntersecting
            },
            { root },
        )
        io.observe(header)
        return () => io.disconnect()
    }, [scrollContainerRef, fullHeaderRef])

    // Scroll handler with rubber band dismiss
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        let desktopSettle: ReturnType<typeof setTimeout> | null = null
        let topRowSettle: ReturnType<typeof setTimeout> | null = null

        // Disable expensive backdrop-filter during rubber band for smooth 60fps.
        // Must restore to exact React values (not "") since React won't reconcile
        // properties it believes are already set.
        const s = (bar: HTMLDivElement) => bar.style as CSSStyleDeclaration & Record<string, string>
        const g = glassBarStyle(isDark)
        const killFrost = (bar: HTMLDivElement) => {
            s(bar).backdropFilter = "none"
            s(bar).webkitBackdropFilter = "none"
            s(bar).background = glassBarOpaque(isDark)
        }
        const restoreFrost = (bar: HTMLDivElement) => {
            s(bar).backdropFilter = g.backdropFilter
            s(bar).webkitBackdropFilter = g.WebkitBackdropFilter
            s(bar).background = g.background
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
            // Snap top row on finger release (iOS convention)
            if (topRowPending.current === "collapse") {
                setTopRowHidden(true)
                topRowPending.current = null
            } else if (topRowPending.current === "expand") {
                setTopRowHidden(false)
                topRowPending.current = null
            }
        }

        const onScroll = () => {
            const now = Date.now()
            const st = el.scrollTop
            const dt = Math.max(now - lastTime.current, 1)
            const delta = st - lastScrollTop.current
            const v = delta / dt

            velocity.current = velocity.current * 0.5 + v * 0.5

            const isPast = !headerVisible.current
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
                // Close full search when header scrolls back into view (not when leaving —
                // collapsing height off-screen causes layout reflow that stutters the grid)
                if (pastFullHeader.current) {
                    if (compactSearchOpenRef.current && searchQueryRef.current.trim()) {
                        // Transfer active compact search to full header
                        onOpenFullSearch()
                        setCompactSearchOpen(false)
                    } else if (isFullSearchOpenRef.current && !searchQueryRef.current.trim()) {
                        onCloseFullSearch()
                    }
                }
                topRowPending.current = null
                if (topRowSettle) {
                    clearTimeout(topRowSettle)
                    topRowSettle = null
                }
                barVisible.current = false
                setTopRowHidden(false)
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

                // Dismiss keyboard on any significant scroll (hides suggestions overlay)
                if (Math.abs(delta) > 2) {
                    const ae = document.activeElement
                    if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) {
                        ae.blur()
                    }
                }

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
                    // Bar visible, scrolling down
                    const searchActive = compactSearchOpenRef.current && searchQueryRef.current.trim()
                    if (searchActive) {
                        // Active search — mark pending collapse (commits on finger release)
                        if (!topRowHiddenRef.current && topRowPending.current !== "collapse") {
                            topRowPending.current = "collapse"
                            if (topRowSettle) clearTimeout(topRowSettle)
                            if (!isTouching.current) {
                                topRowSettle = setTimeout(() => {
                                    if (topRowPending.current === "collapse") {
                                        setTopRowHidden(true)
                                        topRowPending.current = null
                                    }
                                }, 150)
                            }
                        }
                    } else {
                        // No active search — enter rubber band dismiss
                        rbOffset.current = 0.1
                        rbPrevScroll.current = st
                        rbPrevTime.current = now
                        rbVelocity.current = 0
                        killFrost(bar)
                        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                        setCompactSearchFocused(false)
                    }
                } else if (!barVisible.current && velocity.current < -0.08 && !rbAnimating.current) {
                    // Scrolling up with intent — show compact bar
                    barVisible.current = true
                    setCompactBar("visible")
                } else if (barVisible.current && delta < -1 && !rbAnimating.current) {
                    // Scrolling up with bar visible
                    if (topRowHiddenRef.current && topRowPending.current !== "expand") {
                        // Top row hidden — mark pending expand (commits on finger release)
                        topRowPending.current = "expand"
                        if (topRowSettle) clearTimeout(topRowSettle)
                        if (!isTouching.current) {
                            topRowSettle = setTimeout(() => {
                                if (topRowPending.current === "expand") {
                                    setTopRowHidden(false)
                                    topRowPending.current = null
                                }
                            }, 150)
                        }
                    } else if (topRowPending.current === "collapse") {
                        // Cancel pending collapse — user reversed direction
                        topRowPending.current = null
                        if (topRowSettle) {
                            clearTimeout(topRowSettle)
                            topRowSettle = null
                        }
                    }
                }
            }

            lastScrollTop.current = st
            lastTime.current = now
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
            if (topRowSettle) clearTimeout(topRowSettle)
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
                    background: gBar.background,
                    backdropFilter: gBar.backdropFilter,
                    WebkitBackdropFilter: gBar.WebkitBackdropFilter,
                    borderBottom: compactBar === "visible" || topRowHidden ? gBar.border : "1px solid transparent",
                    transform: compactBar === "visible" || topRowHidden ? "translateY(0)" : "translateY(-100%)",
                    transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.3s ease",
                    pointerEvents: compactBar === "visible" || topRowHidden ? "auto" : "none",
                    willChange: "transform",
                }}
            >
                {/* Collapsible top row: logo | pills | search */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateRows: topRowHidden ? "0fr" : "1fr",
                        transition: "grid-template-rows 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
                    }}
                >
                    <div style={{ overflow: "hidden" }}>
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
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: theme.text,
                                    margin: "-7px 0 -3px",
                                    lineHeight: 1,
                                    textRendering: "optimizeLegibility",
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
                                            padding: "4px 10px",
                                            borderRadius: 100,
                                            border: openNow ? "none" : `1.5px solid ${theme.border}`,
                                            background: openNow ? "#22543d" : "transparent",
                                            color: openNow ? "#fff" : theme.textSecondary,
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 11,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        {"\u25CF"} Open
                                    </button>
                                    {["Clothing", "Objects", "Art"].map((cat) => (
                                        <button
                                            key={cat}
                                            aria-pressed={category === cat}
                                            onClick={() => onCategoryChange(category === cat ? "All" : cat)}
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 100,
                                                border: category === cat ? "none" : `1.5px solid ${theme.border}`,
                                                background: category === cat ? theme.btnBg : "transparent",
                                                color: category === cat ? theme.btnText : theme.textSecondary,
                                                fontFamily: "'DM Sans', sans-serif",
                                                fontSize: 11,
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
                    </div>
                </div>
                <div
                    ref={compactSearchGridRef}
                    style={{
                        display: "grid",
                        gridTemplateRows: compactSearchOpen || topRowHidden ? "1fr" : "0fr",
                        transition: "grid-template-rows 0.15s ease-out",
                    }}
                >
                    <div style={{ overflow: "hidden" }}>
                        <div
                            style={{
                                padding: topRowHidden ? "10px 20px 10px" : "0 20px 10px",
                                transition: "padding 0.25s ease",
                            }}
                        >
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
                                    background: isDark ? "rgba(32,32,32,0.97)" : "rgba(255,255,255,0.97)",
                                    borderRadius: 12,
                                    boxShadow: isDark
                                        ? "0 8px 30px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset"
                                        : "0 8px 30px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
                                    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.06)",
                                    overflow: "hidden",
                                }}
                            >
                                {makerSuggestions.map((maker, i) => (
                                    <div
                                        key={maker.id}
                                        onClick={() => onMakerTap(maker)}
                                        style={{
                                            padding: "11px 14px",
                                            cursor: "pointer",
                                            borderBottom:
                                                i < makerSuggestions.length - 1
                                                    ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`
                                                    : "none",
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
