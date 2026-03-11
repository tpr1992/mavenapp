import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
import { useMotionValue, useMotionValueEvent, animate as motionAnimate } from "framer-motion"
import { useTheme } from "../../contexts/ThemeContext"

export const TRANSITION_IOS = { type: "tween", duration: 0.55, ease: [0.32, 0.72, 0, 1] }

interface CarouselProps {
    items: unknown[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderItem: (item: any, index: number) => React.ReactNode
    loop?: boolean
    autoPlay?: number | false
    transition?: Record<string, unknown>
    dots?: boolean | "pill" | "mini"
    dotPosition?: "below" | "overlay"
    slideWidth?: string
    gap?: number
    padding?: string
    onSlideChange?: (index: number) => void
    resetKey?: number
    style?: React.CSSProperties
}

// Number of slides cloned on each side of the real slides.
// 3 gives enough runway for rapid multi-swipe before teleport fires.
const CLONES = 3

const Carousel = memo(function Carousel({
    items,
    renderItem,
    loop = false,
    autoPlay = false,
    transition = TRANSITION_IOS,
    dots = false,
    dotPosition = "below",
    slideWidth = "100%",
    gap = 0,
    padding = "0",
    onSlideChange,
    resetKey,
    style = {},
}: CarouselProps) {
    const { theme } = useTheme()
    const scrollRef = useRef<HTMLDivElement>(null)
    const dotsRef = useRef<HTMLDivElement>(null)
    const isJumping = useRef(false)
    const isTouching = useRef(false)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const count = items.length
    const loopable = loop && count > 1
    const usePillDots = dots === "pill"
    const useMiniDots = dots === "mini"

    const [activeIndex, setActiveIndex] = useState(0)

    const scrollMV = useMotionValue(0)
    const isAnimating = useRef(false)
    const animCtrl = useRef<{ stop: () => void } | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── Looped array: [...lastN clones, ...items, ...firstN clones] ──
    // Shifting scrollLeft by exactly `count * slideWidth` lands on identical
    // content with identical neighbours — the teleport is invisible.
    const loopedItems = useMemo(() => {
        if (!loopable) return items
        const before = []
        const after = []
        for (let c = 0; c < CLONES; c++) {
            before.push(items[(((count - CLONES + c) % count) + count) % count])
            after.push(items[c % count])
        }
        return [...before, ...items, ...after]
    }, [items, count, loopable])

    // Map any loop-array index to the real item index
    const loopIdxToReal = useCallback(
        (loopIdx: number) => {
            return (((loopIdx - CLONES) % count) + count) % count
        },
        [count],
    )

    // ── Framer-motion programmatic scroll ──
    useMotionValueEvent(scrollMV, "change", (v) => {
        if (isAnimating.current && scrollRef.current) {
            scrollRef.current.scrollLeft = v
        }
    })

    const slideToLoopIndex = useCallback(
        (loopIdx: number) => {
            const el = scrollRef.current
            if (!el) return
            if (animCtrl.current) animCtrl.current.stop()
            isAnimating.current = true
            el.style.scrollSnapType = "none"
            scrollMV.set(el.scrollLeft)
            const targetLeft = loopIdx * el.offsetWidth
            animCtrl.current = motionAnimate(scrollMV, targetLeft, {
                ...transition,
                onComplete: () => {
                    isAnimating.current = false
                    // Snap to exact pixel to prevent sub-pixel misalignment
                    el.scrollLeft = Math.round(targetLeft)
                    // If animation landed in a clone zone, teleport to real zone
                    const idx = Math.round(el.scrollLeft / el.offsetWidth)
                    if (idx < CLONES || idx >= CLONES + count) {
                        if (idx < CLONES) el.scrollLeft += count * el.offsetWidth
                        else el.scrollLeft -= count * el.offsetWidth
                    }
                    scrollMV.set(el.scrollLeft)
                    // Double-rAF: wait for browser to commit scrollLeft before re-enabling snap
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            el.style.scrollSnapType = "x mandatory"
                        })
                    })
                },
            })
        },
        [scrollMV, count, transition],
    )

    // Start at first real slide (index CLONES)
    useEffect(() => {
        const el = scrollRef.current
        if (el && loopable) el.scrollLeft = CLONES * el.offsetWidth
    }, [loopable])

    const updateIndex = useCallback(
        (idx: number) => {
            setActiveIndex(idx)
            onSlideChange?.(idx)
        },
        [onSlideChange],
    )

    const updateMiniDots = useCallback(
        (realIdx: number) => {
            const dotsEl = dotsRef.current
            if (!dotsEl) return
            for (let i = 0; i < count; i++) {
                ;(dotsEl.children[i] as HTMLElement).style.opacity = i === realIdx ? "1" : "0.5"
            }
        },
        [count],
    )

    // ── Teleport from clone zone to real zone ──
    // Shifts by exactly `count` slides — content + neighbours are identical.
    const snapFromClone = useCallback(() => {
        const el = scrollRef.current
        if (!el || isJumping.current || isAnimating.current || isTouching.current) return
        const loopIdx = Math.round(el.scrollLeft / el.offsetWidth)
        if (loopIdx < CLONES || loopIdx >= CLONES + count) {
            isJumping.current = true
            el.style.scrollSnapType = "none"
            if (loopIdx < CLONES) el.scrollLeft += count * el.offsetWidth
            else el.scrollLeft -= count * el.offsetWidth
            // Snap to exact slide boundary to prevent partial-slide alignment
            el.scrollLeft = Math.round(el.scrollLeft / el.offsetWidth) * el.offsetWidth
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.scrollSnapType = "x mandatory"
                    isJumping.current = false
                })
            })
        }
    }, [count])

    // ── Scroll handler: updates dots only, never teleports ──
    useEffect(() => {
        const el = scrollRef.current
        if (!el || count <= 1) return
        let rafId = 0
        const onScroll = () => {
            if (isJumping.current || isAnimating.current) return
            if (rafId) return
            rafId = requestAnimationFrame(() => {
                rafId = 0
                const loopIdx = Math.round(el.scrollLeft / el.offsetWidth)
                const realIdx = loopable ? loopIdxToReal(loopIdx) : loopIdx
                if (useMiniDots) updateMiniDots(realIdx)
                if (usePillDots) updateIndex(realIdx)

                if (loopable) {
                    if (settleTimer.current) clearTimeout(settleTimer.current)
                    settleTimer.current = setTimeout(snapFromClone, 150)
                }
            })
        }
        el.addEventListener("scroll", onScroll, { passive: true })
        return () => {
            el.removeEventListener("scroll", onScroll)
            if (settleTimer.current) clearTimeout(settleTimer.current)
        }
    }, [count, loopable, loopIdxToReal, useMiniDots, usePillDots, updateMiniDots, updateIndex, snapFromClone])

    // ── scrollend: primary teleport trigger ──
    useEffect(() => {
        const el = scrollRef.current
        if (!el || !loopable) return
        const onScrollEnd = () => {
            if (settleTimer.current) clearTimeout(settleTimer.current)
            snapFromClone()
        }
        el.addEventListener("scrollend", onScrollEnd)
        return () => el.removeEventListener("scrollend", onScrollEnd)
    }, [loopable, snapFromClone])

    // ── Auto-play ──
    const startTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (!autoPlay || count <= 1) return
        intervalRef.current = setInterval(() => {
            const el = scrollRef.current
            if (!el) return
            const loopIdx = Math.round(el.scrollLeft / el.offsetWidth)
            const nextLoop = loopIdx + 1
            updateIndex(loopIdxToReal(nextLoop))
            slideToLoopIndex(nextLoop)
        }, autoPlay)
    }, [autoPlay, count, slideToLoopIndex, updateIndex, loopIdxToReal])

    useEffect(() => {
        if (autoPlay) {
            startTimer()
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current)
            }
        }
    }, [autoPlay, startTimer])

    // ── Reset to first slide when resetKey changes ──
    const initialResetKey = useRef(resetKey)
    useEffect(() => {
        if (resetKey === initialResetKey.current) return
        const el = scrollRef.current
        if (!el) return
        const targetLeft = loopable ? CLONES * el.offsetWidth : 0
        el.scrollTo({ left: targetLeft, behavior: "smooth" })
        updateIndex(0)
        if (autoPlay) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            const t = setTimeout(() => startTimer(), 600)
            return () => clearTimeout(t)
        }
    }, [resetKey, loopable, autoPlay, slideToLoopIndex, updateIndex, startTimer])

    // ── Touch tracking ──
    const handleTouchStart = useCallback(() => {
        isTouching.current = true
        if (settleTimer.current) clearTimeout(settleTimer.current)
        if (autoPlay) if (intervalRef.current) clearInterval(intervalRef.current)
    }, [autoPlay])

    const handleTouchEnd = useCallback(() => {
        isTouching.current = false
        if (autoPlay) startTimer()
        if (loopable) settleTimer.current = setTimeout(snapFromClone, 150)
    }, [autoPlay, loopable, startTimer, snapFromClone])

    // ── Pill dot click ──
    const handleDotClick = useCallback(
        (i: number) => {
            if (loopable) {
                slideToLoopIndex(CLONES + i)
            } else {
                const el = scrollRef.current
                if (el) el.scrollTo({ left: i * el.offsetWidth, behavior: "smooth" })
            }
            updateIndex(i)
            if (autoPlay) startTimer()
        },
        [loopable, slideToLoopIndex, updateIndex, autoPlay, startTimer],
    )

    if (!items.length) return null

    const isOverlay = dotPosition === "overlay"

    return (
        <div style={{ position: "relative", overflow: "hidden", ...style }}>
            <div
                ref={scrollRef}
                data-carousel-scroll={loopable ? "loop" : "simple"}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{
                    display: "flex",
                    overflowX: "auto",
                    overflowY: "hidden",
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    gap,
                    padding,
                    overscrollBehavior: "contain",
                    height: "100%",
                    willChange: "scroll-position",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {loopedItems.map((item, i) => {
                    const realIdx = loopable ? loopIdxToReal(i) : i
                    return (
                        <div
                            key={`slide-${i}`}
                            style={{
                                flex: `0 0 ${slideWidth}`,
                                scrollSnapAlign: "start",
                                scrollSnapStop: "always",
                                boxSizing: "border-box",
                                height: "100%",
                                transform: "translateZ(0)",
                            }}
                        >
                            {renderItem(item, realIdx)}
                        </div>
                    )
                })}
            </div>

            {useMiniDots && count > 1 && (
                <div
                    ref={dotsRef}
                    style={{
                        position: isOverlay ? "absolute" : "relative",
                        bottom: isOverlay ? 8 : "auto",
                        left: isOverlay ? "50%" : "auto",
                        transform: isOverlay ? "translateX(-50%)" : "none",
                        display: "flex",
                        justifyContent: isOverlay ? undefined : "center",
                        gap: 4,
                        marginTop: isOverlay ? 0 : 8,
                        zIndex: isOverlay ? 3 : "auto",
                        pointerEvents: "none",
                    }}
                >
                    {items.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#fff",
                                opacity: i === 0 ? 1 : 0.5,
                                transition: "opacity 0.15s ease",
                                boxShadow: "0 0 2px rgba(0,0,0,0.3)",
                            }}
                        />
                    ))}
                </div>
            )}

            {usePillDots && count > 1 && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 6,
                        marginTop: 12,
                    }}
                >
                    {items.map((_, i) => (
                        <div
                            key={i}
                            onClick={() => handleDotClick(i)}
                            style={{
                                width: activeIndex === i ? 18 : 7,
                                height: 7,
                                borderRadius: 100,
                                background: activeIndex === i ? theme.text : theme.border,
                                cursor: "pointer",
                                transition: "width 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
})

export default Carousel
