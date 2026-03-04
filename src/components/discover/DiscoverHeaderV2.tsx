import { useState, useRef, useEffect, useCallback } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import { glassBarStyle, glassBarOpaque } from "../../utils/glass"
import CategoryIcon from "../ui/CategoryIcon"
import SearchBar from "../ui/SearchBar"
import { formatLocation } from "../../utils/distance"
import type { Maker } from "../../types"

interface DiscoverHeaderV2Props {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    searchQuery: string
    onSearchQueryChange: (query: string) => void
    category: string
    onCategoryChange: (cat: string) => void
    openNow: boolean
    onOpenNowChange: (val: boolean) => void
    locationLabel: string | null
    locationSource: string | null
    onLocationPickerOpen: () => void
    onScrollToTop: () => void
    onMakerTap: (maker: Maker) => void
    makerSuggestions: Maker[]
    isHidden: boolean
    refreshKey?: number
}

const EXPANDED_THRESHOLD = 5

export default function DiscoverHeaderV2({
    scrollContainerRef,
    searchQuery,
    onSearchQueryChange,
    category,
    onCategoryChange,
    openNow,
    onOpenNowChange,
    locationLabel,
    locationSource,
    onLocationPickerOpen,
    onScrollToTop,
    onMakerTap,
    makerSuggestions,
    isHidden,
    refreshKey,
}: DiscoverHeaderV2Props) {
    const { theme, isDark } = useTheme()
    const gBar = glassBarStyle(isDark)

    // --- State ---
    const [isCompact, setIsCompact] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const [topRowHidden, setTopRowHidden] = useState(false)
    // pillsFade uses direct DOM — no state, no re-renders during pills scroll

    // --- Refs ---
    const wrapperRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchGridRef = useRef<HTMLDivElement>(null)
    const compactPillsRef = useRef<HTMLDivElement>(null)
    const pillsContainerRef = useRef<HTMLDivElement>(null)
    const expandedHeight = useRef(0)

    // Scroll tracking
    const lastScrollTop = useRef(0)
    const lastTime = useRef(Date.now())
    const velocity = useRef(0)

    // Mode tracking (refs to avoid stale closures and redundant setState)
    const isCompactRef = useRef(false)
    const barShown = useRef(false) // compact bar currently at translateY(0)?
    const wasCompactRef = useRef(false) // tracks "first time becoming compact"

    // Rubber band
    const rbOffset = useRef(0)
    const rbPrevScroll = useRef(0)
    const rbPrevTime = useRef(0)
    const rbVelocity = useRef(0)
    const rbAnimating = useRef(false)
    const isTouching = useRef(false)
    const topRowPending = useRef<"collapse" | "expand" | null>(null)

    // Stale closure refs
    const searchQueryRef = useRef(searchQuery)
    searchQueryRef.current = searchQuery
    const searchOpenRef = useRef(searchOpen)
    searchOpenRef.current = searchOpen
    const topRowHiddenRef = useRef(topRowHidden)
    topRowHiddenRef.current = topRowHidden

    // --- Auto-close search on empty + blur ---
    useEffect(() => {
        if (!searchFocused && searchOpen && !searchQuery.trim()) {
            const timer = setTimeout(() => setSearchOpen(false), 300)
            return () => clearTimeout(timer)
        }
    }, [searchFocused, searchOpen, searchQuery])

    // --- Reset on refreshKey (tab re-tap) ---
    useEffect(() => {
        setSearchOpen(false)
        setSearchFocused(false)
        onSearchQueryChange("")
    }, [refreshKey])

    // --- Reset topRowHidden when not compact and search is closed ---
    useEffect(() => {
        if (!isCompact && !searchOpen) {
            setTopRowHidden(false)
        }
    }, [isCompact, searchOpen])

    // --- Reset when returning from a maker profile ---
    useEffect(() => {
        if (!isHidden) {
            barShown.current = false
            isCompactRef.current = false
            wasCompactRef.current = false
            setIsCompact(false)
            setSearchOpen(false)
            const bar = barRef.current
            if (bar) {
                bar.style.transition = "none"
                bar.style.transform = ""
                bar.style.pointerEvents = ""
            }
            const wrapper = wrapperRef.current
            if (wrapper) wrapper.style.top = "0px"
        }
    }, [isHidden])

    // --- Pills fade edge masks (direct DOM — avoids re-renders during scroll) ---
    useEffect(() => {
        const el = compactPillsRef.current
        const container = pillsContainerRef.current
        if (!el || !container) return
        const update = () => {
            const atLeft = el.scrollLeft <= 2
            const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
            const l = !atLeft ? "transparent 0%, black 16px" : "black 0%"
            const r = !atRight ? "black calc(100% - 16px), transparent 100%" : "black 100%"
            const mask = `linear-gradient(to right, ${l}, ${r})`
            container.style.maskImage = mask
            ;(container.style as CSSStyleDeclaration & Record<string, string>).webkitMaskImage = mask
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
    }, [isCompact, category])

    // --- Measure expanded height + initial scroll position check (iOS scroll restoration) ---
    useEffect(() => {
        const bar = barRef.current
        if (bar) expandedHeight.current = bar.offsetHeight
        const slideAway = expandedHeight.current || 56
        const el = scrollContainerRef?.current
        if (el && el.scrollTop > slideAway) {
            isCompactRef.current = true
            wasCompactRef.current = true
            setIsCompact(true)
            if (bar) {
                bar.style.transform = "translateY(-100%)"
                bar.style.pointerEvents = "none"
            }
        }
    }, [])

    // --- Scroll handler ---
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        let desktopSettle: ReturnType<typeof setTimeout> | null = null
        let topRowSettle: ReturnType<typeof setTimeout> | null = null
        let slideAwaySettle: ReturnType<typeof setTimeout> | null = null

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
                restoreFrost(bar)
                rbAnimating.current = false
            }, duration)
        }

        const doCommitHide = (bar: HTMLDivElement) => {
            rbAnimating.current = true
            rbOffset.current = 0
            rbVelocity.current = 0
            barShown.current = false
            setSearchOpen(false)
            searchInputRef.current?.blur()
            setSearchFocused(false)
            bar.style.pointerEvents = "none"
            bar.style.transition = "transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)"
            bar.style.transform = "translateY(-100%)"
            setTimeout(() => {
                bar.style.transition = ""
                restoreFrost(bar)
                rbAnimating.current = false
            }, 220)
        }

        const resolveRubberBand = () => {
            if (rbOffset.current <= 0 || rbAnimating.current) return
            const bar = barRef.current
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

            // Snap slide-away zone — header must never be stuck partially scrolled
            const st = el.scrollTop
            const sa = expandedHeight.current || 56
            if (st > 0 && st <= sa && !isCompactRef.current) {
                if (velocity.current > 0.05 || st > sa * 0.5) {
                    el.scrollTo({ top: sa + 1, behavior: "smooth" })
                } else {
                    el.scrollTo({ top: 0, behavior: "smooth" })
                }
            }

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

            const bar = barRef.current
            const wrapper = wrapperRef.current
            const slideAway = expandedHeight.current || 56
            // Once compact, stay compact until fully back at top — like Safari's address bar
            const shouldBeCompact = st > slideAway || (wasCompactRef.current && st >= EXPANDED_THRESHOLD)

            if (desktopSettle) {
                clearTimeout(desktopSettle)
                desktopSettle = null
            }
            if (slideAwaySettle) {
                clearTimeout(slideAwaySettle)
                slideAwaySettle = null
            }

            // Update isCompact state (guarded by ref to avoid redundant setState)
            if (shouldBeCompact && !isCompactRef.current) {
                isCompactRef.current = true
                setIsCompact(true)
            } else if (st < EXPANDED_THRESHOLD && isCompactRef.current) {
                isCompactRef.current = false
                setIsCompact(false)
            }

            if (st < EXPANDED_THRESHOLD) {
                // ── AT TOP ──
                if (bar) {
                    if (rbOffset.current > 0) {
                        rbOffset.current = 0
                        rbVelocity.current = 0
                        restoreFrost(bar)
                    }
                    // Opacity crossfade when morphing compact → expanded
                    if (wasCompactRef.current && barShown.current) {
                        bar.style.opacity = "0"
                        bar.style.transition = "none"
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                if (!bar) return
                                bar.style.transition =
                                    "opacity 0.18s ease, background 0.25s ease, backdrop-filter 0.25s ease, border-color 0.25s ease"
                                bar.style.opacity = "1"
                                setTimeout(() => {
                                    if (!bar) return
                                    bar.style.transition = ""
                                    bar.style.opacity = ""
                                }, 280)
                            })
                        })
                    } else {
                        bar.style.transition = "none"
                    }
                    bar.style.transform = "" // visible, expanded
                    bar.style.pointerEvents = ""
                }
                if (wrapper) wrapper.style.top = "0px"
                // Re-measure expanded height (may have changed with search state)
                if (bar) expandedHeight.current = bar.offsetHeight
                // Close empty search when returning to top from compact
                if (wasCompactRef.current) {
                    if (searchOpenRef.current && !searchQueryRef.current.trim()) {
                        setSearchOpen(false)
                    }
                }
                topRowPending.current = null
                if (topRowSettle) {
                    clearTimeout(topRowSettle)
                    topRowSettle = null
                }
                barShown.current = false
                wasCompactRef.current = false
                setTopRowHidden(false)
                velocity.current = 0
            } else if (!wasCompactRef.current && st <= slideAway && !searchOpenRef.current) {
                // ── SLIDING AWAY (expanded header scrolls up naturally, initial scroll-down only) ──
                if (wrapper) wrapper.style.top = `-${st}px`
                // Desktop: snap to resolved after scroll stops
                if (!isTouching.current) {
                    slideAwaySettle = setTimeout(() => {
                        const cst = el.scrollTop
                        if (cst > 0 && cst <= slideAway && !isCompactRef.current) {
                            el.scrollTo({ top: cst > slideAway * 0.5 ? slideAway + 1 : 0, behavior: "smooth" })
                        }
                    }, 150)
                }
            } else if (shouldBeCompact) {
                // ── COMPACT ZONE ──
                if (!wasCompactRef.current && bar) {
                    // First time becoming compact — header has already slid off via top offset
                    wasCompactRef.current = true
                    if (wrapper) wrapper.style.top = "0px"
                    if (searchOpenRef.current) {
                        // Search active — show compact bar immediately
                        barShown.current = true
                        bar.style.transition = "none"
                        bar.style.transform = "translateY(0)"
                        bar.style.pointerEvents = "auto"
                    } else {
                        // Slide-away already moved header off-screen — keep hidden
                        bar.style.transition = "none"
                        bar.style.transform = "translateY(-100%)"
                        bar.style.pointerEvents = "none"
                    }
                    // Dismiss keyboard
                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                }

                // Dismiss keyboard on any significant scroll
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
                        bar.style.transform = "translateY(0)"
                        restoreFrost(bar)
                    } else {
                        bar.style.transition = "none"
                        bar.style.transform = `translateY(-${rbOffset.current}px)`
                    }
                    if (!isTouching.current && rbOffset.current > 0) {
                        desktopSettle = setTimeout(resolveRubberBand, 150)
                    }
                } else if (barShown.current && delta > 2 && bar && !rbAnimating.current) {
                    const searchActive = searchOpenRef.current && searchQueryRef.current.trim()
                    if (searchActive) {
                        // Active search — collapse top row on scroll down
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
                        setSearchFocused(false)
                    }
                } else if (!barShown.current && velocity.current < -0.08 && !rbAnimating.current && bar) {
                    // Scrolling up with intent — show compact bar with animation
                    barShown.current = true
                    bar.style.pointerEvents = "auto"
                    bar.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
                    bar.style.transform = "translateY(0)"
                } else if (barShown.current && delta < -1 && !rbAnimating.current) {
                    // Scrolling up with bar visible — expand top row
                    if (topRowHiddenRef.current && topRowPending.current !== "expand") {
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
            if (slideAwaySettle) clearTimeout(slideAwaySettle)
        }
    }, [scrollContainerRef, isDark])

    // --- Logo tap (shared between expanded and compact) ---
    const handleLogoTap = useCallback(() => {
        onScrollToTop()
        onSearchQueryChange("")
        setSearchOpen(false)
        onCategoryChange("All")
        barShown.current = false
        wasCompactRef.current = false
        isCompactRef.current = false
        setIsCompact(false)
        const bar = barRef.current
        if (bar) {
            bar.style.transition = "none"
            bar.style.transform = ""
            bar.style.pointerEvents = ""
        }
        const wrapper = wrapperRef.current
        if (wrapper) wrapper.style.top = "0px"
    }, [onScrollToTop, onSearchQueryChange, onCategoryChange])

    // --- Open search ---
    const handleSearchOpen = useCallback(() => {
        const grid = searchGridRef.current
        if (grid) grid.style.gridTemplateRows = "1fr"
        searchInputRef.current?.focus()
        setSearchOpen(true)
    }, [])

    // --- Search icon SVG ---
    const searchIcon = (
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
    )

    const searchBtnStyle = {
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
    } as const

    return (
        <div ref={wrapperRef} style={{ position: "sticky", top: 0, zIndex: 50 }}>
            <div
                ref={barRef}
                style={{
                    background: isCompact ? gBar.background : theme.bg,
                    backdropFilter: isCompact ? gBar.backdropFilter : "none",
                    WebkitBackdropFilter: isCompact ? gBar.WebkitBackdropFilter : "none",
                    borderBottom: isCompact ? gBar.border : "1px solid transparent",
                    willChange: isCompact ? "transform" : "auto",
                }}
            >
                {isCompact ? (
                    /* Compact top row: collapsible grid with logo + pills + search btn */
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
                                    onClick={handleLogoTap}
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
                                <div ref={pillsContainerRef} style={{ flex: 1, overflow: "hidden" }}>
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
                                                transition:
                                                    "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
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
                                                    transition:
                                                        "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {!searchOpen && (
                                    <button aria-label="Search" onClick={handleSearchOpen} style={searchBtnStyle}>
                                        {searchIcon}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Expanded row: big logo + location picker + search btn */
                    <div style={{ padding: "12px 16px 14px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                                <h1
                                    onClick={handleLogoTap}
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
                                    onClick={onLocationPickerOpen}
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
                                    <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 10 10"
                                        fill="none"
                                        style={{ flexShrink: 0 }}
                                    >
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
                                {!searchOpen && (
                                    <button aria-label="Search" onClick={handleSearchOpen} style={searchBtnStyle}>
                                        {searchIcon}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Search grid — always in same DOM position, never unmounts */}
                <div
                    ref={searchGridRef}
                    style={{
                        display: "grid",
                        gridTemplateRows: searchOpen || topRowHidden ? "1fr" : "0fr",
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
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={onSearchQueryChange}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                placeholder="Search makers, categories, places..."
                                containerStyle={{
                                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                                }}
                            />
                        </div>
                    </div>
                    {searchOpen && searchFocused && searchQuery && makerSuggestions.length > 0 && (
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
