import React, { useState, useRef, useEffect, useCallback, memo } from "react"
import { isOpenNow, getTodayHours } from "../../utils/time"
import { formatLocation } from "../../utils/distance"
import { optimizeImageUrl } from "../../utils/image"
import MakerAvatar from "../ui/MakerAvatar"
import type { Maker, Theme } from "../../types"

interface SwipeableMapCardProps {
    maker: Maker
    onDismiss: () => void
    onTap: (maker: Maker) => void
    onToggleSave: (id: string) => void
    isSaved: boolean
    theme: Theme
}

export default memo(function SwipeableMapCard({
    maker,
    onDismiss,
    onTap,
    onToggleSave,
    isSaved,
    theme,
}: SwipeableMapCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<{ startY: number; startTime: number; active: boolean }>({
        startY: 0,
        startTime: 0,
        active: false,
    })
    const [cardState, setCardState] = useState<"peek" | "expanded">("peek")
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [visible, setVisible] = useState(false)
    const [bouncing, setBouncing] = useState(false)
    const [dismissTranslate, setDismissTranslate] = useState(0)
    const touchCollapseAtRef = useRef(0)

    const PEEK_HEIGHT = 164
    // 80% of viewport — leaves a clear strip of map + search bar + pills visible above,
    // like Apple Maps. Card never reaches the URL bar on iOS Chrome.
    const EXPANDED_HEIGHT = typeof window !== "undefined" ? Math.round(window.innerHeight * 0.8) : 600

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    const rubberBand = (distance: number) => {
        const c = 0.55
        const d = 300
        return (1 - 1 / ((distance * c) / d + 1)) * d
    }

    const dismiss = useCallback(() => {
        setIsDragging(false)
        setBouncing(false)
        setDismissTranslate(500)
        setTimeout(onDismiss, 350)
    }, [onDismiss])

    // Shared drag handlers — used by handle zone always + content zone in peek
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as Element).closest("button") || (e.target as Element).closest("a")) return
        // Block synthetic pointer events fired by iOS after a touch-based collapse
        if (Date.now() - touchCollapseAtRef.current < 600) return
        dragRef.current = { startY: e.clientY, startTime: Date.now(), active: true }
        setIsDragging(true)
        setBouncing(false)
        e.currentTarget.setPointerCapture(e.pointerId)
    }, [])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragRef.current.active) return
        setDragOffset(e.clientY - dragRef.current.startY)
    }, [])

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!dragRef.current.active) return
            const dy = e.clientY - dragRef.current.startY
            const dt = Math.max(0.01, (Date.now() - dragRef.current.startTime) / 1000)
            const velocity = dy / dt
            dragRef.current.active = false

            if (cardState === "peek") {
                if (dy < -5) {
                    if (Math.abs(velocity) > 700 || Math.abs(dy) > 120) {
                        setCardState("expanded")
                        setIsDragging(false)
                        setDragOffset(0)
                        // Reset content scroll on expand
                        if (contentRef.current) contentRef.current.scrollTop = 0
                    } else {
                        setBouncing(true)
                        setIsDragging(false)
                        setDragOffset(0)
                        setTimeout(() => setBouncing(false), 600)
                    }
                } else if (velocity > 800 || dy > 60) {
                    dismiss()
                } else if (Math.abs(dy) < 5) {
                    setCardState("expanded")
                    setIsDragging(false)
                    setDragOffset(0)
                    if (contentRef.current) contentRef.current.scrollTop = 0
                } else {
                    setIsDragging(false)
                    setDragOffset(0)
                }
            } else {
                if (dy > 5) {
                    if (velocity > 500 || dy > 100) {
                        // Reset scroll before collapsing so peek shows top content
                        if (contentRef.current) contentRef.current.scrollTop = 0
                        setCardState("peek")
                        setIsDragging(false)
                        setDragOffset(0)
                    } else {
                        setBouncing(true)
                        setIsDragging(false)
                        setDragOffset(0)
                        setTimeout(() => setBouncing(false), 600)
                    }
                } else if (dy < -5) {
                    setBouncing(true)
                    setIsDragging(false)
                    setDragOffset(0)
                    setTimeout(() => setBouncing(false), 600)
                } else {
                    setIsDragging(false)
                    setDragOffset(0)
                }
            }
        },
        [cardState, dismiss, setCardState],
    )

    // Expanded state: native scroll + direct DOM drag for scroll→collapse handoff.
    // Browser handles scroll natively (smooth, momentum, elastic).
    // When scrollTop hits 0 and user pulls down, we drive card height via direct DOM
    // (no React re-renders) for buttery smooth collapse, then sync React state after.
    useEffect(() => {
        if (cardState !== "expanded") return
        const el = contentRef.current
        const card = cardRef.current
        if (!el || !card) return

        let startY = 0
        let lastY = 0
        let mode: null | "scroll" | "drag" = null
        let dragStartY = 0
        let dragStartTime = 0

        const rb = (dist: number) => (1 - 1 / ((dist * 0.55) / 300 + 1)) * 300

        const onTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY
            lastY = startY
            mode = null
        }

        const onTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY
            const totalDy = currentY - startY

            if (mode === null) {
                if (Math.abs(totalDy) < 5) {
                    lastY = currentY
                    return
                }
                if (totalDy > 0 && el.scrollTop <= 0) {
                    mode = "drag"
                    dragStartY = currentY
                    dragStartTime = Date.now()
                    card.style.transition = "none"
                } else {
                    mode = "scroll"
                }
            }

            // Seamless handoff: native scroll hit the top, user still pulling down
            if (mode === "scroll" && el.scrollTop <= 0 && currentY - lastY > 0) {
                mode = "drag"
                dragStartY = currentY
                dragStartTime = Date.now()
                card.style.transition = "none"
            }

            if (mode === "drag") {
                let h = EXPANDED_HEIGHT - (currentY - dragStartY)
                if (h < PEEK_HEIGHT) h = PEEK_HEIGHT - rb(PEEK_HEIGHT - h) * 0.3
                card.style.height = Math.max(80, h) + "px"
            }

            lastY = currentY
        }

        const onTouchEnd = () => {
            if (mode === "drag") {
                const dy = lastY - dragStartY
                const dt = Math.max(0.01, (Date.now() - dragStartTime) / 1000)
                const vel = dy / dt

                if (vel > 500 || dy > 100) {
                    // Animate to peek, then sync React state
                    touchCollapseAtRef.current = Date.now()
                    card.style.transition = "height 0.4s cubic-bezier(0.32, 0.72, 0, 1)"
                    card.style.height = PEEK_HEIGHT + "px"

                    const onDone = () => {
                        card.removeEventListener("transitionend", onDone)
                        // Sync React — card.style.height stays as PEEK_HEIGHT,
                        // React will overwrite it on the next render that changes height
                        el.scrollTop = 0
                        card.style.transition = ""
                        setCardState("peek")
                    }
                    card.addEventListener("transitionend", onDone, { once: true })
                    // Fallback if transitionend doesn't fire
                    setTimeout(onDone, 450)
                } else {
                    // Snap back to expanded
                    card.style.transition = "height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    card.style.height = EXPANDED_HEIGHT + "px"
                    const clearTransition = () => {
                        card.removeEventListener("transitionend", clearTransition)
                        card.style.transition = ""
                    }
                    card.addEventListener("transitionend", clearTransition, { once: true })
                    setTimeout(clearTransition, 550)
                }
            }
            mode = null
        }

        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("touchmove", onTouchMove, { passive: true })
        el.addEventListener("touchend", onTouchEnd, { passive: true })

        return () => {
            card.style.transition = ""
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("touchmove", onTouchMove)
            el.removeEventListener("touchend", onTouchEnd)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardState])

    // Height calculation
    const baseHeight = cardState === "expanded" ? EXPANDED_HEIGHT : PEEK_HEIGHT
    let cardHeight = baseHeight
    let translateY = 0

    if (isDragging) {
        if (dragOffset < 0) {
            const pull = Math.abs(dragOffset)
            const targetMax = cardState === "peek" ? EXPANDED_HEIGHT : EXPANDED_HEIGHT
            const room = Math.max(0, targetMax - baseHeight)
            if (pull <= room) {
                cardHeight = baseHeight + pull
            } else {
                cardHeight = targetMax + rubberBand(pull - room)
            }
        } else {
            if (cardState === "expanded") {
                cardHeight = Math.max(PEEK_HEIGHT, baseHeight - dragOffset)
            } else {
                translateY = dragOffset
            }
        }
    }

    if (!visible) translateY = 500
    if (dismissTranslate > 0) translateY = dismissTranslate

    let transition
    if (isDragging) {
        transition = "none"
    } else if (bouncing) {
        transition = "height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
    } else {
        transition = "height 0.4s cubic-bezier(0.32, 0.72, 0, 1), transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)"
    }

    const open = isOpenNow(maker.opening_hours)
    const hours = getTodayHours(maker.opening_hours)
    const heroUrl = maker.gallery_urls?.[0] ? optimizeImageUrl(maker.gallery_urls[0], 600) : null
    const thumbUrl = maker.gallery_urls?.[0] ? optimizeImageUrl(maker.gallery_urls[0], 120) : null

    return (
        <div
            ref={cardRef}
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: cardHeight,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: theme.card === "#fff" ? "rgba(255,255,255,0.55)" : "rgba(30,30,30,0.55)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                borderRadius: "18px 18px 0 0",
                boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
                borderTop: `1px solid ${theme.border}`,
                zIndex: 1000,
                transform: `translateY(${translateY}px)`,
                transition,
                willChange: "height, transform",
            }}
        >
            {/* ── Handle zone: always draggable, large touch target ── */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                    touchAction: "none",
                    userSelect: "none",
                    flexShrink: 0,
                    padding: "14px 0 18px",
                    cursor: "grab",
                }}
            >
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
                </div>
            </div>

            {/* ── Content zone ── */}
            <div
                ref={contentRef}
                {...(cardState === "peek"
                    ? {
                          onPointerDown: handlePointerDown,
                          onPointerMove: handlePointerMove,
                          onPointerUp: handlePointerUp,
                      }
                    : {})}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: cardState === "expanded" ? "auto" : "hidden",
                    overflowX: "hidden",
                    overscrollBehavior: "contain",
                    ...(cardState === "peek"
                        ? { touchAction: "none", userSelect: "none", cursor: "grab" }
                        : { touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }),
                }}
            >
                {/* Peek row: avatar + info — draggable only in peek state, scrolls in expanded */}
                <div
                    {...(cardState === "peek"
                        ? {
                              onPointerDown: handlePointerDown,
                              onPointerMove: handlePointerMove,
                              onPointerUp: handlePointerUp,
                          }
                        : {})}
                    style={{
                        padding: "2px 18px 12px",
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        ...(cardState === "peek" ? { touchAction: "none", userSelect: "none", cursor: "grab" } : {}),
                    }}
                >
                    <MakerAvatar maker={maker} size={50} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: theme.text,
                                }}
                            >
                                {maker.name}
                            </span>
                            {maker.is_verified && (
                                <span style={{ fontSize: 12, color: theme.textSecondary }}>{"\u2713"}</span>
                            )}
                        </div>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: theme.textSecondary,
                                marginTop: 2,
                            }}
                        >
                            {maker.category} {"\u00B7"} {formatLocation(maker)}
                        </div>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                marginTop: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                            }}
                        >
                            <span
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: open ? "#22543d" : "#9b2c2c",
                                    display: "inline-block",
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ color: open ? "#22543d" : "#9b2c2c", fontWeight: 600 }}>
                                {open ? "Open" : "Closed"}
                            </span>
                            <span style={{ color: theme.textMuted }}>
                                {"\u00B7"} {hours}
                            </span>
                        </div>
                    </div>
                    {thumbUrl && cardState === "peek" && (
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 10,
                                overflow: "hidden",
                                flexShrink: 0,
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            <img
                                src={thumbUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                        </div>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleSave(maker.id)
                        }}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            border: `1px solid ${theme.border}`,
                            background: theme.card,
                            cursor: "pointer",
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            color: isSaved ? "#c53030" : theme.textSecondary,
                        }}
                    >
                        {isSaved ? "\u2665" : "\u2661"}
                    </button>
                </div>

                {/* ── Expanded profile content ── */}
                <div style={{ padding: "0 18px" }}>
                    {/* Hero image */}
                    {heroUrl && (
                        <div
                            style={{
                                marginTop: 14,
                                borderRadius: 14,
                                overflow: "hidden",
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            <img
                                src={heroUrl}
                                alt={maker.name}
                                style={{
                                    width: "100%",
                                    height: 200,
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                        </div>
                    )}

                    {/* Bio */}
                    {maker.bio && (
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13.5,
                                lineHeight: 1.6,
                                color: theme.textSecondary,
                                margin: "14px 0 0",
                                pointerEvents: "none",
                            }}
                        >
                            {maker.bio}
                        </p>
                    )}

                    {/* Gallery strip */}
                    {maker.gallery_urls?.length > 1 && (
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                marginTop: 16,
                                overflowX: "auto",
                                WebkitOverflowScrolling: "touch",
                                scrollbarWidth: "none",
                                paddingBottom: 2,
                            }}
                        >
                            {maker.gallery_urls.slice(1, 6).map((url, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 88,
                                        height: 88,
                                        borderRadius: 10,
                                        overflow: "hidden",
                                        flexShrink: 0,
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <img
                                        src={optimizeImageUrl(url, 200) ?? undefined}
                                        alt=""
                                        loading="lazy"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action row — compact icon pills */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 16,
                            marginBottom: 16,
                        }}
                    >
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 14px",
                                borderRadius: 100,
                                border: `1px solid ${theme.border}`,
                                background: "transparent",
                                color: theme.text,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="3 11 22 2 13 21 11 13 3 11" />
                            </svg>
                            Directions
                        </a>
                        {maker.website_url && (
                            <a
                                href={maker.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "8px 14px",
                                    borderRadius: 100,
                                    border: `1px solid ${theme.border}`,
                                    background: "transparent",
                                    color: theme.text,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Website
                            </a>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTap(maker)
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 14px",
                                borderRadius: 100,
                                border: `1px solid ${theme.border}`,
                                background: "transparent",
                                color: theme.text,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Full profile
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
})
