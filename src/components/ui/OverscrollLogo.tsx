import { useRef, useEffect, memo } from "react"

interface OverscrollLogoProps {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

const LETTERS = ["M", "A", "V", "E", "N"]

const LETTER_CONFIG = [
    { offsetY: -1.3, rotation: -6, scaleBoost: 0.15, xDrift: -30, yJitter: -20 },
    { offsetY: -1.0, rotation: 3.5, scaleBoost: 0.1, xDrift: -10, yJitter: 12 },
    { offsetY: -1.6, rotation: 0, scaleBoost: 0.2, xDrift: 0, yJitter: -35 },
    { offsetY: -0.85, rotation: -3, scaleBoost: 0.08, xDrift: 12, yJitter: 10 },
    { offsetY: -1.2, rotation: 5, scaleBoost: 0.14, xDrift: 35, yJitter: -18 },
]

const MAX_PULL = 200
const DEAD_ZONE = 25

function rubberBand(rawDelta: number, maxPull: number): number {
    const damping = 0.4
    return maxPull * damping * Math.log(1 + rawDelta / (maxPull * damping))
}

export default memo(function OverscrollLogo({ scrollContainerRef }: OverscrollLogoProps) {
    const letterRefs = useRef<(HTMLSpanElement | null)[]>([])
    const gapRef = useRef<HTMLDivElement>(null)
    const topLineRef = useRef<HTMLDivElement>(null)
    const bottomLineRef = useRef<HTMLDivElement>(null)
    const taglineRef = useRef<HTMLDivElement>(null)
    const subtitleRef = useRef<HTMLDivElement>(null)

    const pullRef = useRef(0)
    const rafRef = useRef(0)
    const touchStartRef = useRef<number | null>(null)
    const isAtBottomRef = useRef(false)
    const lastTouchTimeRef = useRef(0)
    const safetyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const applyDom = (progress: number, dur: number, overshoot: number, animate: boolean) => {
        const t = progress * progress * progress
        const gap = 8 + t * 30
        const size = 28 + t * 6
        const alpha = 0.15 + progress * 0.5
        const tagAlpha = Math.max(0, (progress - 0.3) / 0.7) * 0.4

        const bez = `cubic-bezier(0.34, ${overshoot}, 0.64, 1)`
        const tr = animate ? `all ${dur}s ${bez}` : "none"

        if (gapRef.current) {
            gapRef.current.style.gap = `${gap}px`
            gapRef.current.style.transition = animate ? `gap ${dur}s ${bez}` : "none"
        }

        LETTERS.forEach((_, i) => {
            const el = letterRefs.current[i]
            if (!el) return
            const c = LETTER_CONFIG[i]
            el.style.transform = [
                `translateY(${c.offsetY * t * 60 + c.yJitter * t * 1.2}px)`,
                `translateX(${c.xDrift * t * 1.8}px)`,
                `rotate(${c.rotation * t * 2}deg)`,
                `scale(${1 + c.scaleBoost * t * 2})`,
            ].join(" ")
            el.style.opacity = `${Math.max(0.3, 1 - t * 0.45)}`
            el.style.fontSize = `${size}px`
            el.style.color = `rgba(255,255,255,${alpha})`
            el.style.transition = animate ? `all ${dur}s ${bez} ${i * 0.04}s` : "none"
        })

        if (topLineRef.current) {
            topLineRef.current.style.width = `${Math.max(1, progress * 100)}px`
            topLineRef.current.style.background = `rgba(255,255,255,${0.08 + progress * 0.15})`
            topLineRef.current.style.transition = tr
        }
        if (bottomLineRef.current) {
            bottomLineRef.current.style.width = `${Math.max(1, progress * 60)}px`
            bottomLineRef.current.style.background = `rgba(255,255,255,${0.06 + progress * 0.12})`
            bottomLineRef.current.style.transition = tr
        }
        if (taglineRef.current) {
            taglineRef.current.style.opacity = `${tagAlpha}`
            taglineRef.current.style.transform = `translateY(${(1 - tagAlpha / 0.4) * 8}px)`
            taglineRef.current.style.transition = tr
        }
        if (subtitleRef.current) {
            subtitleRef.current.style.opacity = `${0.1 + progress * 0.15}`
            subtitleRef.current.style.transition = tr
        }
    }

    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return

        function stopWatchdog() {
            if (safetyIntervalRef.current) {
                clearInterval(safetyIntervalRef.current)
                safetyIntervalRef.current = null
            }
        }

        function reset() {
            const finalPull = pullRef.current
            if (finalPull > 0) {
                const pullRatio = Math.min(finalPull / MAX_PULL, 1)
                const dur = 0.5 - pullRatio * 0.25
                const over = 1.3 + pullRatio * 0.5
                applyDom(0, dur, over, true)
            }
            pullRef.current = 0
            touchStartRef.current = null
            isAtBottomRef.current = false
            stopWatchdog()
        }

        function startWatchdog() {
            stopWatchdog()
            safetyIntervalRef.current = setInterval(() => {
                if (pullRef.current > 0 && Date.now() - lastTouchTimeRef.current > 300) {
                    reset()
                }
            }, 150)
        }

        function onTouchStart(e: TouchEvent) {
            // Safety: reset any stuck state
            if (pullRef.current > 0) reset()
            const slack = el!.scrollHeight - el!.scrollTop - el!.clientHeight
            isAtBottomRef.current = slack < 5
            if (isAtBottomRef.current) {
                touchStartRef.current = e.touches[0].clientY
            }
        }

        function onTouchMove(e: TouchEvent) {
            if (!isAtBottomRef.current || touchStartRef.current === null) return
            if (!e.touches.length) {
                reset()
                return
            }

            lastTouchTimeRef.current = Date.now()
            const delta = touchStartRef.current - e.touches[0].clientY

            if (delta < DEAD_ZONE) {
                if (pullRef.current > 0) {
                    pullRef.current = 0
                    applyDom(0, 0.5, 1.5, false)
                }
                return
            }

            e.preventDefault()

            // Start watchdog on first real pull
            if (pullRef.current === 0) startWatchdog()

            const adjustedDelta = delta - DEAD_ZONE
            const pulled = rubberBand(adjustedDelta, MAX_PULL)
            const progress = Math.min(pulled / MAX_PULL, 1)
            pullRef.current = progress

            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
                applyDom(progress, 0.5, 1.5, false)
            })
        }

        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("touchmove", onTouchMove, { passive: false })
        document.addEventListener("touchend", reset)
        document.addEventListener("touchcancel", reset)

        return () => {
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("touchmove", onTouchMove)
            document.removeEventListener("touchend", reset)
            document.removeEventListener("touchcancel", reset)
            stopWatchdog()
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [scrollContainerRef])

    return (
        <div
            style={{
                padding: "50px 0 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflow: "hidden",
                userSelect: "none",
            }}
        >
            <div
                ref={topLineRef}
                style={{ width: 1, height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 28 }}
            />

            <div ref={gapRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {LETTERS.map((letter, i) => (
                    <span
                        key={i}
                        ref={(el) => {
                            letterRefs.current[i] = el
                        }}
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 28,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.15)",
                            display: "inline-block",
                            willChange: "transform",
                        }}
                    >
                        {letter}
                    </span>
                ))}
            </div>

            <div
                ref={taglineRef}
                style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 400,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0)",
                    marginTop: 16,
                    transform: "translateY(8px)",
                }}
            >
                discover Irish makers
            </div>

            <div
                ref={subtitleRef}
                style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    fontWeight: 400,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.1)",
                    marginTop: 10,
                }}
            >
                Le Grá
            </div>

            <div
                ref={bottomLineRef}
                style={{ width: 1, height: 1, background: "rgba(255,255,255,0.06)", marginTop: 16 }}
            />
        </div>
    )
})
