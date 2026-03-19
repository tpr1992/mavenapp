import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { glassBarStyle, glassBarOpaque } from "../utils/glass"

const EXPANDED_THRESHOLD = 5

interface UseHeaderCollapseOptions {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    barRef: React.RefObject<HTMLDivElement | null>
    searchInputRef: React.RefObject<HTMLInputElement | null>
    mainFiltersRef?: React.RefObject<HTMLDivElement | null>
    isDark: boolean
    searchOpen: boolean
    searchQuery: string
    isHidden: boolean
    refreshKey?: number
    onSearchQueryChange: (query: string) => void
    setSearchOpen: (open: boolean) => void
    setSearchFocused: (focused: boolean) => void
}

export function useHeaderCollapse({
    scrollContainerRef,
    barRef,
    searchInputRef,
    mainFiltersRef,
    isDark,
    searchOpen,
    searchQuery,
    isHidden,
    refreshKey,
    onSearchQueryChange,
    setSearchOpen,
    setSearchFocused,
}: UseHeaderCollapseOptions) {
    const [isCompact, setIsCompact] = useState(false)
    const [topRowHidden, setTopRowHidden] = useState(false)
    const [spacerH, setSpacerH] = useState(56)
    const [filtersInHeader, setFiltersInHeader] = useState(false)
    const filtersInHeaderRef = useRef(false)

    const expandedHeight = useRef(0)

    // Scroll tracking
    const lastScrollTop = useRef(0)
    const lastTime = useRef(Date.now())
    const velocity = useRef(0)

    // Mode tracking (refs to avoid stale closures and redundant setState)
    const isCompactRef = useRef(false)
    const barShown = useRef(false)
    const wasCompactRef = useRef(false)

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

    // Reset topRowHidden when not compact and search is closed
    useEffect(() => {
        if (!isCompact && !searchOpen) {
            setTopRowHidden(false)
        }
    }, [isCompact, searchOpen])

    // Reset when returning from a maker profile
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
        }
    }, [isHidden]) // eslint-disable-line react-hooks/exhaustive-deps

    // Reset on refreshKey (tab re-tap)
    useEffect(() => {
        setSearchOpen(false)
        setSearchFocused(false)
        onSearchQueryChange("")
    }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

    // Measure expanded height for spacer (sync before paint to avoid layout shift)
    const baseSpacerH = useRef(56)
    useLayoutEffect(() => {
        const bar = barRef.current
        if (bar && !isCompactRef.current) {
            if (searchOpen) {
                setSpacerH(bar.offsetHeight)
            } else {
                setSpacerH(baseSpacerH.current)
            }
        }
    }, [searchOpen, isCompact]) // eslint-disable-line react-hooks/exhaustive-deps

    useLayoutEffect(() => {
        const bar = barRef.current
        if (bar && !isCompactRef.current && !searchOpen) {
            baseSpacerH.current = bar.offsetHeight
            expandedHeight.current = bar.offsetHeight
            setSpacerH(bar.offsetHeight)
        }
    }, [isCompact]) // eslint-disable-line react-hooks/exhaustive-deps

    // Initial scroll position check (iOS scroll restoration)
    useEffect(() => {
        const bar = barRef.current
        if (bar) expandedHeight.current = bar.offsetHeight
        const threshold = expandedHeight.current || 56
        const el = scrollContainerRef?.current
        if (el && el.scrollTop > threshold) {
            isCompactRef.current = true
            wasCompactRef.current = true
            setIsCompact(true)
            if (bar) {
                bar.style.transform = "translateY(-100%)"
                bar.style.pointerEvents = "none"
            }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll handler
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        let desktopSettle: ReturnType<typeof setTimeout> | null = null
        let topRowSettle: ReturnType<typeof setTimeout> | null = null

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
            const threshold = expandedHeight.current || 56
            const shouldBeCompact = st > threshold || (wasCompactRef.current && st >= EXPANDED_THRESHOLD)

            if (desktopSettle) {
                clearTimeout(desktopSettle)
                desktopSettle = null
            }

            if (shouldBeCompact && !isCompactRef.current) {
                isCompactRef.current = true
                setIsCompact(true)
            } else if (st < EXPANDED_THRESHOLD && isCompactRef.current) {
                isCompactRef.current = false
                setIsCompact(false)
            }

            if (st < EXPANDED_THRESHOLD) {
                if (bar) {
                    if (rbOffset.current > 0) {
                        rbOffset.current = 0
                        rbVelocity.current = 0
                        restoreFrost(bar)
                    }
                    if (wasCompactRef.current && barShown.current) {
                        bar.style.transition = "background 0.4s ease, border-color 0.4s ease"
                        bar.style.opacity = ""
                        setTimeout(() => {
                            if (bar) bar.style.transition = ""
                        }, 350)
                    } else {
                        bar.style.transition = "none"
                    }
                    bar.style.transform = ""
                    bar.style.pointerEvents = ""
                }
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
            } else if (shouldBeCompact) {
                if (!wasCompactRef.current && bar) {
                    wasCompactRef.current = true
                    if (searchOpenRef.current) {
                        barShown.current = true
                        bar.style.transition = "none"
                        bar.style.transform = "translateY(0)"
                        bar.style.pointerEvents = "auto"
                    } else {
                        bar.style.transition = "none"
                        bar.style.transform = "translateY(-100%)"
                        bar.style.pointerEvents = "none"
                    }
                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                }

                if (Math.abs(delta) > 2) {
                    const ae = document.activeElement
                    if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) {
                        ae.blur()
                    }
                }

                if (rbOffset.current > 0 && bar && !rbAnimating.current) {
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
                        rbOffset.current = 0.1
                        rbPrevScroll.current = st
                        rbPrevTime.current = now
                        rbVelocity.current = 0
                        killFrost(bar)
                        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
                        setSearchFocused(false)
                    }
                } else if (!barShown.current && velocity.current < -0.08 && !rbAnimating.current && bar) {
                    barShown.current = true
                    bar.style.pointerEvents = "auto"
                    bar.style.transition = "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                    bar.style.transform = "translateY(0)"
                } else if (barShown.current && delta < -1 && !rbAnimating.current) {
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
                        topRowPending.current = null
                        if (topRowSettle) {
                            clearTimeout(topRowSettle)
                            topRowSettle = null
                        }
                    }
                }
            }

            // Check if main filters have scrolled behind the compact header
            // Skip during animations/drags to prevent filters unmounting mid-slide
            const filtersEl = mainFiltersRef?.current
            if (filtersEl && !rbAnimating.current && rbOffset.current <= 0) {
                const COMPACT_BAR_H = 40
                const filtersVisualTop = filtersEl.offsetTop - st
                const shouldBeInHeader = filtersVisualTop < COMPACT_BAR_H
                if (shouldBeInHeader !== filtersInHeaderRef.current) {
                    filtersInHeaderRef.current = shouldBeInHeader
                    setFiltersInHeader(shouldBeInHeader)
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
    }, [scrollContainerRef, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleLogoTap = useCallback(() => {
        barShown.current = false
        wasCompactRef.current = false
        isCompactRef.current = false
        filtersInHeaderRef.current = false
        setIsCompact(false)
        setFiltersInHeader(false)
        const bar = barRef.current
        if (bar) {
            bar.style.transition = "none"
            bar.style.transform = ""
            bar.style.pointerEvents = ""
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return { isCompact, topRowHidden, spacerH, handleLogoTap, filtersInHeader }
}
