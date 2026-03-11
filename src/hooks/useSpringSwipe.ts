import { useRef, useCallback } from "react"

interface SpringSwipeConfig {
    /** Number of slides */
    count: number
    /** Current slide index */
    index: number
    /** Viewport/slide width in px — defaults to window.innerWidth */
    viewportWidth?: number
    /** Minimum drag ratio to trigger slide change (0-1). Default: 0.2 */
    threshold?: number
    /** Minimum finger velocity (px/s) for a fast swipe. Default: 500 */
    velocityThreshold?: number
    /** Spring stiffness. Higher = snappier. Default: 300 */
    stiffness?: number
    /** Spring damping. Higher = less oscillation. Default: 30 */
    damping?: number
    /** Edge rubber-band factor (0-1). Default: 0.3 */
    rubberBand?: number
    /** Called when spring settles on a new index */
    onIndexChange: (newIndex: number) => void
    /** Called on every animation/drag frame with translateX offset */
    onTransform: (offset: number) => void
}

/**
 * Reusable spring-physics swipe hook for transform-based carousels.
 *
 * Returns imperative handlers you wire to touch events. All animation
 * runs via requestAnimationFrame — no CSS transitions, no React state
 * during gestures. Carries finger velocity into the spring for iOS-like
 * momentum.
 *
 * Usage:
 *   const swipe = useSpringSwipe({ count, index, onIndexChange, onTransform })
 *
 *   // In your touch handlers:
 *   onTouchStart → swipe.start(clientX)
 *   onTouchMove  → swipe.move(clientX, clientY, startY, preventDefault)
 *   onTouchEnd   → swipe.end(endClientX)
 */
export default function useSpringSwipe({
    count,
    index,
    viewportWidth,
    threshold = 0.2,
    velocityThreshold = 500,
    stiffness = 300,
    damping = 30,
    rubberBand = 0.3,
    onIndexChange,
    onTransform,
}: SpringSwipeConfig) {
    const vw = viewportWidth ?? window.innerWidth

    // Gesture state
    const swipeX = useRef(0)
    const startX = useRef(0)
    const gestureAxis = useRef<"none" | "x" | "y">("none")
    const hasMoved = useRef(false)
    const active = useRef(false)

    // Velocity tracking — last 100ms of touch positions
    const touchHistory = useRef<{ x: number; t: number }[]>([])

    // Spring animation
    const rafId = useRef(0)
    const animating = useRef(false)

    // Track start time for flick detection when no touchmove fires
    const startTime = useRef(0)

    const cancel = useCallback(() => {
        if (rafId.current) {
            cancelAnimationFrame(rafId.current)
            rafId.current = 0
        }
        animating.current = false
    }, [])

    const springTo = useCallback(
        (targetOffset: number, initialVelocity: number, onDone: () => void) => {
            cancel()
            animating.current = true

            let position = -index * vw + swipeX.current
            let velocity = initialVelocity
            let lastTime = performance.now()

            const step = (now: number) => {
                const dt = Math.min((now - lastTime) / 1000, 0.032)
                lastTime = now

                const displacement = position - targetOffset
                const springForce = -stiffness * displacement
                const dampingForce = -damping * velocity
                velocity += (springForce + dampingForce) * dt
                position += velocity * dt

                onTransform(position)

                if (Math.abs(displacement) < 0.5 && Math.abs(velocity) < 50) {
                    onTransform(targetOffset)
                    animating.current = false
                    onDone()
                    return
                }
                rafId.current = requestAnimationFrame(step)
            }
            rafId.current = requestAnimationFrame(step)
        },
        [index, vw, stiffness, damping, cancel, onTransform],
    )

    const start = useCallback(
        (clientX: number) => {
            cancel()
            touchHistory.current = []
            startX.current = clientX
            startTime.current = performance.now()
            gestureAxis.current = "none"
            hasMoved.current = false
            active.current = true
            swipeX.current = 0
        },
        [cancel],
    )

    const move = useCallback(
        (clientX: number, clientY: number, startY: number, preventDefault: () => void): boolean => {
            if (!active.current) return false
            const dx = clientX - startX.current
            const dy = clientY - startY

            // Lock axis after 8px of movement
            if (gestureAxis.current === "none" && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                gestureAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
            }

            if (gestureAxis.current !== "x") return false

            preventDefault()
            hasMoved.current = true

            // Track velocity — seed with start position on first move
            const now = performance.now()
            if (touchHistory.current.length === 0) {
                touchHistory.current.push({ x: startX.current, t: now - 16 })
            }
            touchHistory.current.push({ x: clientX, t: now })
            while (touchHistory.current.length > 2 && now - touchHistory.current[0].t > 100) {
                touchHistory.current.shift()
            }

            // Rubber-band at edges
            const atStart = index === 0 && dx > 0
            const atEnd = index === count - 1 && dx < 0
            swipeX.current = atStart || atEnd ? dx * rubberBand : dx
            onTransform(-index * vw + swipeX.current)
            return true
        },
        [index, count, vw, rubberBand, onTransform],
    )

    const end = useCallback(
        (endClientX?: number): boolean => {
            if (!active.current) return false
            active.current = false

            // Calculate finger velocity from touch history
            const history = touchHistory.current
            let fingerVelocity = 0

            if (history.length >= 2) {
                const last = history[history.length - 1]
                const first = history[0]
                const dt = (last.t - first.t) / 1000
                if (dt > 0) fingerVelocity = (last.x - first.x) / dt
            } else if (endClientX !== undefined) {
                // No touchmove events fired (ultra-fast flick) — compute from start→end
                const dx = endClientX - startX.current
                const dt = (performance.now() - startTime.current) / 1000
                if (dt > 0 && Math.abs(dx) > 5) {
                    fingerVelocity = dx / dt
                    swipeX.current = dx
                }
            }
            touchHistory.current = []

            // Nothing moved and no velocity — not a swipe
            if (!hasMoved.current && Math.abs(fingerVelocity) < velocityThreshold) {
                return false
            }

            const minDrag = vw * threshold
            const fastSwipe = Math.abs(fingerVelocity) > velocityThreshold

            let targetIndex = index
            if ((swipeX.current > minDrag || (fastSwipe && fingerVelocity > 0)) && index > 0) {
                targetIndex = index - 1
            } else if ((swipeX.current < -minDrag || (fastSwipe && fingerVelocity < 0)) && index < count - 1) {
                targetIndex = index + 1
            }

            const targetOffset = -targetIndex * vw

            springTo(targetOffset, fingerVelocity, () => {
                swipeX.current = 0
                if (targetIndex !== index) {
                    onIndexChange(targetIndex)
                }
            })
            return true
        },
        [index, count, vw, threshold, velocityThreshold, springTo, onIndexChange],
    )

    return {
        /** Call with clientX from touchstart */
        start,
        /** Call with (clientX, clientY, startY, preventDefault). Returns true if horizontal swipe is active. */
        move,
        /** Call on touchend with optional endClientX for flick detection. Returns true if a swipe was handled. */
        end,
        /** Cancel any running spring animation */
        cancel,
        /** Whether the user has moved enough to count as a drag */
        hasMoved,
        /** Whether a spring animation is currently running */
        animating,
    }
}
