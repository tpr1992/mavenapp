import React, { useState, useRef, useEffect, useCallback, memo } from "react"
import { createPortal } from "react-dom"
import { optimizeImageUrl, imageSrcSet, IMG_QUALITY } from "../../utils/image"
import useSpringSwipe from "../../hooks/useSpringSwipe"

interface ImageGalleryModalProps {
    images: string[]
    initialIndex: number
    onClose: () => void
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>
}

export default memo(function ImageGalleryModal({
    images,
    initialIndex,
    onClose,
    scrollContainerRef,
}: ImageGalleryModalProps) {
    const [index, setIndex] = useState(initialIndex)
    const [closing, setClosing] = useState(false)
    const doClose = useCallback(() => {
        setClosing(true)
        setTimeout(onClose, 150)
    }, [onClose])
    const total = images.length

    // Cache viewport dimensions to avoid layout thrashing during gestures
    const vw = useRef(window.innerWidth)
    const vh = useRef(window.innerHeight)

    // --- Refs for gesture state (no re-renders during touch) ---
    const containerRef = useRef<HTMLDivElement>(null)
    const slideRef = useRef<HTMLDivElement>(null)

    // Transform state for zoom/pan — applied via ref for 60fps
    const scale = useRef(1)
    const tx = useRef(0)
    const ty = useRef(0)

    // Touch tracking for pinch/pan (swipe is handled by useSpringSwipe)
    const gesture = useRef<"none" | "swipe" | "pan" | "pinch">("none")
    const startTouch = useRef({ x: 0, y: 0 })
    const startTranslate = useRef({ x: 0, y: 0 })
    const pinchStartDist = useRef(0)
    const pinchStartScale = useRef(1)
    const pinchMidpoint = useRef({ x: 0, y: 0 })
    const hasMoved = useRef(false)

    // Double-tap
    const lastTapTime = useRef(0)
    const lastTapPos = useRef({ x: 0, y: 0 })
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // --- Spring swipe hook ---
    const swipe = useSpringSwipe({
        count: total,
        index,
        viewportWidth: vw.current,
        onIndexChange: setIndex,
        onTransform: useCallback((offset: number) => {
            const el = containerRef.current
            if (el) {
                el.style.transition = "none"
                el.style.transform = `translateX(${offset}px)`
            }
        }, []),
    })

    // Lock scroll on mount
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        const saved = el.style.overflowY
        el.style.overflowY = "hidden"
        return () => {
            el.style.overflowY = saved
        }
    }, [scrollContainerRef])

    // --- Apply zoom/pan transforms directly to DOM ---
    const applySlideTransform = useCallback((animate = false) => {
        const el = slideRef.current
        if (!el) return
        if (animate) {
            el.style.transition = "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)"
        } else {
            el.style.transition = "none"
        }
        el.style.transform = `translate(${tx.current}px, ${ty.current}px) scale(${scale.current})`
    }, [])

    // Reset transforms when index changes
    useEffect(() => {
        scale.current = 1
        tx.current = 0
        ty.current = 0
        applySlideTransform(false)
        // Position the strip — spring already placed us correctly, just sync
        const el = containerRef.current
        if (el) {
            el.style.transition = "none"
            el.style.transform = `translateX(${-index * vw.current}px)`
        }
    }, [index, applySlideTransform])

    // --- Pan bounds clamping ---
    const clampTranslate = useCallback(() => {
        if (scale.current <= 1) {
            tx.current = 0
            ty.current = 0
            return
        }
        const maxX = (vw.current * (scale.current - 1)) / 2
        const maxY = (vh.current * (scale.current - 1)) / 2
        tx.current = Math.max(-maxX, Math.min(maxX, tx.current))
        ty.current = Math.max(-maxY, Math.min(maxY, ty.current))
    }, [])

    // --- Touch handlers ---
    const onTouchStart = useCallback(
        (e: React.TouchEvent) => {
            swipe.cancel()
            const t = e.touches

            if (t.length === 2) {
                gesture.current = "pinch"
                pinchStartDist.current = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
                pinchStartScale.current = scale.current
                pinchMidpoint.current = {
                    x: (t[0].clientX + t[1].clientX) / 2,
                    y: (t[0].clientY + t[1].clientY) / 2,
                }
                startTranslate.current = { x: tx.current, y: ty.current }
            } else if (t.length === 1) {
                gesture.current = scale.current > 1 ? "pan" : "swipe"
                startTouch.current = { x: t[0].clientX, y: t[0].clientY }
                startTranslate.current = { x: tx.current, y: ty.current }
                hasMoved.current = false
                if (gesture.current === "swipe") {
                    swipe.start(t[0].clientX)
                }
            }
        },
        [swipe],
    )

    const onTouchMove = useCallback(
        (e: React.TouchEvent) => {
            const t = e.touches

            if (gesture.current === "pinch" && t.length === 2) {
                e.preventDefault()
                const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
                const newScale = Math.min(4, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)))

                const mid = {
                    x: (t[0].clientX + t[1].clientX) / 2,
                    y: (t[0].clientY + t[1].clientY) / 2,
                }
                const cx = vw.current / 2
                const cy = vh.current / 2

                if (pinchStartScale.current <= 1) {
                    const ratio = newScale / pinchStartScale.current
                    tx.current = (cx - pinchMidpoint.current.x) * (ratio - 1)
                    ty.current = (cy - pinchMidpoint.current.y) * (ratio - 1)
                } else {
                    const ratio = newScale / pinchStartScale.current
                    tx.current = startTranslate.current.x * ratio + (mid.x - pinchMidpoint.current.x)
                    ty.current = startTranslate.current.y * ratio + (mid.y - pinchMidpoint.current.y)
                }

                scale.current = newScale
                clampTranslate()
                applySlideTransform()
                return
            }

            if (gesture.current === "pan" && t.length === 1) {
                e.preventDefault()
                const dx = t[0].clientX - startTouch.current.x
                const dy = t[0].clientY - startTouch.current.y
                hasMoved.current = Math.abs(dx) > 5 || Math.abs(dy) > 5

                tx.current = startTranslate.current.x + dx
                ty.current = startTranslate.current.y + dy
                clampTranslate()
                applySlideTransform()
                return
            }

            if (gesture.current === "swipe" && t.length === 1) {
                const handled = swipe.move(t[0].clientX, t[0].clientY, startTouch.current.y, () => e.preventDefault())
                if (handled) hasMoved.current = true
            }
        },
        [swipe, clampTranslate, applySlideTransform],
    )

    const onTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (gesture.current === "pinch") {
                if (scale.current < 1.1) {
                    scale.current = 1
                    tx.current = 0
                    ty.current = 0
                    applySlideTransform(true)
                } else {
                    clampTranslate()
                    applySlideTransform(true)
                }
            } else if (gesture.current === "swipe") {
                // Pass final finger position for flick detection when no touchmove fired
                const endX = e.changedTouches?.[0]?.clientX
                swipe.end(endX)
            } else if (gesture.current === "pan") {
                clampTranslate()
                applySlideTransform(true)
            }

            gesture.current = "none"
        },
        [swipe, clampTranslate, applySlideTransform],
    )

    // --- Double-tap to zoom / single-tap to close ---
    const onTap = useCallback(
        (e: React.MouseEvent) => {
            if (hasMoved.current || swipe.hasMoved.current) return

            const now = Date.now()
            const tapX = e.clientX
            const tapY = e.clientY
            const timeDiff = now - lastTapTime.current
            const posDiff = Math.hypot(tapX - lastTapPos.current.x, tapY - lastTapPos.current.y)

            if (timeDiff < 300 && posDiff < 30) {
                // Double-tap
                if (tapTimer.current) clearTimeout(tapTimer.current)
                lastTapTime.current = 0

                if (scale.current > 1) {
                    scale.current = 1
                    tx.current = 0
                    ty.current = 0
                } else {
                    const targetScale = 2.5
                    tx.current = (vw.current / 2 - tapX) * (targetScale - 1)
                    ty.current = (vh.current / 2 - tapY) * (targetScale - 1)
                    scale.current = targetScale
                    clampTranslate()
                }
                applySlideTransform(true)
            } else {
                lastTapTime.current = now
                lastTapPos.current = { x: tapX, y: tapY }
                // Single tap on dark area — close immediately
                const target = e.target as HTMLElement
                if (target.tagName !== "IMG" && scale.current <= 1) {
                    doClose()
                }
            }
        },
        [doClose, clampTranslate, applySlideTransform, swipe.hasMoved],
    )

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") doClose()
            if (e.key === "ArrowLeft") swipe.goTo(index - 1)
            if (e.key === "ArrowRight") swipe.goTo(index + 1)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [index, total, doClose])

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (tapTimer.current) clearTimeout(tapTimer.current)
            swipe.cancel()
        }
    }, [swipe])

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(0,0,0,0.95)",
                animation: closing ? "none" : "fadeIn 0.2s ease",
                opacity: closing ? 0 : 1,
                transition: closing ? "opacity 0.15s ease-out" : "none",
                touchAction: "none",
                overflow: "hidden",
            }}
        >
            {/* Counter */}
            <div
                style={{
                    position: "absolute",
                    top: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                    zIndex: 3,
                    pointerEvents: "none",
                }}
            >
                {index + 1} / {total}
            </div>

            {/* Close button */}
            <button
                onClick={doClose}
                aria-label="Close"
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 3,
                    width: 40,
                    height: 40,
                    borderRadius: 0,
                    border: "none",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 20,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            {/* Nav arrows (desktop) */}
            {index > 0 && (
                <button
                    onClick={() => swipe.goTo(index - 1)}
                    aria-label="Previous"
                    style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 3,
                        width: 40,
                        height: 40,
                        borderRadius: 0,
                        border: "none",
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            )}
            {index < total - 1 && (
                <button
                    onClick={() => swipe.goTo(index + 1)}
                    aria-label="Next"
                    style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 3,
                        width: 40,
                        height: 40,
                        borderRadius: 0,
                        border: "none",
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            )}

            {/* Image strip — positioned via ref, not React state */}
            <div
                ref={containerRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={onTap}
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    display: "flex",
                    transform: `translateX(${-index * vw.current}px)`,
                    willChange: "transform",
                }}
            >
                {images.map((url, i) => {
                    return (
                        <div
                            key={i}
                            style={{
                                width: vw.current,
                                height: "100%",
                                flexShrink: 0,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                ref={i === index ? slideRef : undefined}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transformOrigin: "center center",
                                    willChange: "transform",
                                    backfaceVisibility: "hidden",
                                }}
                            >
                                <img
                                    src={optimizeImageUrl(url, 1200, { quality: IMG_QUALITY.lightbox }) ?? undefined}
                                    srcSet={imageSrcSet(url, 600, { quality: IMG_QUALITY.lightbox })}
                                    alt={`Image ${i + 1} of ${total}`}
                                    loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                                    draggable={false}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        objectFit: "contain",
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                        pointerEvents: "none",
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>,
        document.body,
    )
})
