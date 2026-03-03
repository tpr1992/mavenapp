import { useState, useRef, useEffect, useCallback, memo } from "react"

export default memo(function ImageGalleryModal({ images, initialIndex, onClose, scrollContainerRef }) {
    const [index, setIndex] = useState(initialIndex)
    const [scale, setScale] = useState(1)
    const [translate, setTranslate] = useState({ x: 0, y: 0 })
    const [swipeX, setSwipeX] = useState(0)
    const touchRef = useRef({})
    const imgRef = useRef(null)

    const total = images.length

    // Lock scroll on mount, preserve position on unmount
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!el) return
        const savedOverflowY = el.style.overflowY
        const savedOverflowX = el.style.overflowX
        el.style.overflowY = "hidden"
        return () => {
            el.style.overflowY = savedOverflowY
            el.style.overflowX = savedOverflowX
        }
    }, [scrollContainerRef])

    const goTo = useCallback(
        (next) => {
            if (next < 0 || next >= total) return
            setIndex(next)
            setScale(1)
            setTranslate({ x: 0, y: 0 })
            setSwipeX(0)
        },
        [total],
    )

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowLeft") goTo(index - 1)
            if (e.key === "ArrowRight") goTo(index + 1)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [index, goTo, onClose])

    const onTouchStart = (e) => {
        const t = e.touches
        if (t.length === 2) {
            const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
            touchRef.current = { type: "pinch", initDist: dist, initScale: scale }
        } else if (t.length === 1) {
            touchRef.current = {
                type: scale > 1 ? "pan" : "swipe",
                startX: t[0].clientX,
                startY: t[0].clientY,
                initTranslate: { ...translate },
                moved: false,
            }
        }
    }

    const onTouchMove = (e) => {
        const t = e.touches
        const ref = touchRef.current

        if (ref.type === "pinch" && t.length === 2) {
            e.preventDefault()
            const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
            const newScale = Math.min(4, Math.max(1, ref.initScale * (dist / ref.initDist)))
            setScale(newScale)
            if (newScale <= 1.05) setTranslate({ x: 0, y: 0 })
        } else if (ref.type === "pan" && t.length === 1) {
            e.preventDefault()
            const dx = t[0].clientX - ref.startX
            const dy = t[0].clientY - ref.startY
            setTranslate({ x: ref.initTranslate.x + dx, y: ref.initTranslate.y + dy })
        } else if (ref.type === "swipe" && t.length === 1) {
            const dx = t[0].clientX - ref.startX
            ref.moved = true
            setSwipeX(dx)
        }
    }

    const onTouchEnd = () => {
        const ref = touchRef.current

        if (ref.type === "pinch") {
            if (scale < 1.1) {
                setScale(1)
                setTranslate({ x: 0, y: 0 })
            }
        } else if (ref.type === "swipe" && ref.moved) {
            if (swipeX > 60 && index > 0) goTo(index - 1)
            else if (swipeX < -60 && index < total - 1) goTo(index + 1)
            else setSwipeX(0)
        }

        touchRef.current = {}
    }

    // Double-tap to zoom, single-tap to close (when not zoomed)
    const lastTapRef = useRef(0)
    const tapTimerRef = useRef(null)
    const onTap = (_e) => {
        // Ignore if it was a swipe/pinch
        if (touchRef.current.moved) return
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            // Double-tap toggle zoom
            clearTimeout(tapTimerRef.current)
            if (scale > 1) {
                setScale(1)
                setTranslate({ x: 0, y: 0 })
            } else {
                setScale(2.5)
            }
            lastTapRef.current = 0
        } else {
            lastTapRef.current = now
            // Single tap — close if not zoomed (after brief delay to rule out double-tap)
            if (scale <= 1) {
                tapTimerRef.current = setTimeout(() => onClose(), 250)
            }
        }
    }

    const isInteracting = !!touchRef.current.type

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: "rgba(0,0,0,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 0.2s ease",
                touchAction: "none",
            }}
        >
            {/* Backdrop click to close (only when not zoomed) */}
            <div onClick={() => scale <= 1 && onClose()} style={{ position: "absolute", inset: 0, zIndex: 0 }} />

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
                onClick={onClose}
                aria-label="Close"
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 3,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
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
                    onClick={() => goTo(index - 1)}
                    aria-label="Previous"
                    style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 3,
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
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
                    onClick={() => goTo(index + 1)}
                    aria-label="Next"
                    style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 3,
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
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

            {/* Image strip */}
            <div
                ref={imgRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={onTap}
                style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: `${total * 100}%`,
                        height: "100%",
                        transform:
                            scale > 1
                                ? `translateX(${-index * (100 / total)}%) scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`
                                : `translateX(calc(${-index * (100 / total)}% + ${swipeX}px))`,
                        transition: isInteracting ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        willChange: "transform",
                    }}
                >
                    {images.map((url, i) => (
                        <div
                            key={i}
                            style={{
                                width: `${100 / total}%`,
                                height: "100%",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <img
                                src={url}
                                alt={`Image ${i + 1} of ${total}`}
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
                    ))}
                </div>
            </div>
        </div>
    )
})
