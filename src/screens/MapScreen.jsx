import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Helmet } from "react-helmet-async"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import { CATEGORY_ICON } from "../constants/categories"
import { isOpenNow, getTodayHours } from "../utils/time"
import { formatLocation } from "../utils/distance"
import { optimizeImageUrl } from "../utils/image"
import { TOWNS } from "../data/towns"
import CategoryPills from "../components/ui/CategoryPills"
import MakerAvatar from "../components/ui/MakerAvatar"
import { useTheme } from "../contexts/ThemeContext"

// Fix Leaflet default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: undefined,
    iconUrl: undefined,
    shadowUrl: undefined,
})

function createPinIcon(maker, isSelected, isDark) {
    const icon = CATEGORY_ICON[maker.category] || ""

    let bg, color, border, shadow, backdrop
    if (isSelected) {
        bg = isDark ? "#e8e6e3" : "#1a1a1a"
        color = isDark ? "#1a1a1a" : "#fff"
        border = "none"
        shadow = "0 4px 12px rgba(0,0,0,0.35)"
        backdrop = "none"
    } else {
        bg = isDark ? "rgba(30,30,30,0.5)" : "rgba(255,255,255,0.5)"
        color = isDark ? "#e8e6e3" : "#1a1a1a"
        border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)"
        shadow = isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.18)"
        backdrop = "blur(16px) saturate(1.4)"
    }
    const scale = isSelected ? "scale(1.1)" : "scale(1)"

    const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        background: ${bg};
        color: ${color};
        padding: 6px 10px;
        border-radius: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        gap: 4px;
        border: ${border};
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      ">
        <span style="display:inline-flex;align-items:center">${icon}</span>
        ${maker.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>
      <div style="
        width: 8px;
        height: 8px;
        background: ${bg};
        border: ${border};
        transform: rotate(45deg);
        margin-top: -5px;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      "></div>
    </div>
  `

    // Estimate width based on name length for accurate anchor
    const estimatedWidth = maker.name.length * 7 + 50

    return L.divIcon({
        html,
        className: "",
        iconSize: [estimatedWidth, 40],
        iconAnchor: [estimatedWidth / 2, 40],
    })
}

function SwipeableMapCard({ maker, onDismiss, onTap, onToggleSave, isSaved, theme }) {
    const cardRef = useRef(null)
    const contentRef = useRef(null)
    const dragRef = useRef({ startY: 0, startTime: 0, active: false })
    const [cardState, setCardState] = useState("peek") // peek | expanded
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

    const rubberBand = (distance) => {
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
    const handlePointerDown = useCallback((e) => {
        if (e.target.closest("button") || e.target.closest("a")) return
        // Block synthetic pointer events fired by iOS after a touch-based collapse
        if (Date.now() - touchCollapseAtRef.current < 600) return
        dragRef.current = { startY: e.clientY, startTime: Date.now(), active: true }
        setIsDragging(true)
        setBouncing(false)
        e.currentTarget.setPointerCapture(e.pointerId)
    }, [])

    const handlePointerMove = useCallback((e) => {
        if (!dragRef.current.active) return
        setDragOffset(e.clientY - dragRef.current.startY)
    }, [])

    const handlePointerUp = useCallback(
        (e) => {
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
        let mode = null // null | "scroll" | "drag"
        let dragStartY = 0
        let dragStartTime = 0

        const rb = (dist) => (1 - 1 / ((dist * 0.55) / 300 + 1)) * 300

        const onTouchStart = (e) => {
            startY = e.touches[0].clientY
            lastY = startY
            mode = null
        }

        const onTouchMove = (e) => {
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
                                        src={optimizeImageUrl(url, 200)}
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
                        {maker.website && (
                            <a
                                href={maker.website}
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
}

export default function MapScreen({ makers = [], onMakerTap, savedIds, onToggleSave, userLocation }) {
    const { isDark, theme } = useTheme()

    const [category, setCategory] = useState("All")
    const [openNow, setOpenNow] = useState(false)
    const [selectedMaker, setSelectedMaker] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)

    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const clusterGroupRef = useRef(null)
    const markerMapRef = useRef(new Map())
    const prevSelectedRef = useRef(null)
    const tileLayerRef = useRef(null)

    const townSuggestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (q.length < 1) return []
        return TOWNS.filter((t) => t.name.toLowerCase().startsWith(q))
            .concat(TOWNS.filter((t) => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q)))
            .slice(0, 4)
    }, [searchQuery])

    const filtered = useMemo(
        () =>
            makers
                .filter((m) => category === "All" || m.category === category.toLowerCase())
                .filter((m) => !openNow || isOpenNow(m.opening_hours))
                .filter(
                    (m) =>
                        !searchQuery ||
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.category.toLowerCase().includes(searchQuery.toLowerCase()),
                ),
        [makers, category, openNow, searchQuery],
    )

    const handleSelectTown = (town) => {
        const map = mapInstanceRef.current
        if (map) {
            map.flyTo([town.lat, town.lng], 13, { duration: 0.8 })
        }
        setSearchQuery("")
        setSearchFocused(false)
    }

    // Initialize the Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return

        const center = userLocation ? [userLocation.lat, userLocation.lng] : [53.27, -9.05]

        const map = L.map(mapContainerRef.current, {
            center,
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
        })

        const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

        tileLayerRef.current = L.tileLayer(tileUrl, {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map)

        L.control.attribution({ position: "topleft", prefix: false }).addTo(map)

        mapInstanceRef.current = map

        return () => {
            map.remove()
            mapInstanceRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Switch tile layer when isDark changes
    useEffect(() => {
        if (!mapInstanceRef.current || !tileLayerRef.current) return
        const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        tileLayerRef.current.setUrl(tileUrl)
    }, [isDark])

    // Rebuild cluster group when data or theme changes
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        if (clusterGroupRef.current) {
            map.removeLayer(clusterGroupRef.current)
        }

        const markers = new Map()
        const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 65,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount()
                const bg = isDark ? "#e8e6e3" : "#1a1a1a"
                const clusterColor = isDark ? "#1a1a1a" : "#fff"
                const sz = count >= 10 ? 40 : 34
                return L.divIcon({
                    html: `<div style="
                      width:${sz}px;height:${sz}px;border-radius:50%;
                      background:${bg};color:${clusterColor};
                      display:flex;align-items:center;justify-content:center;
                      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
                      box-shadow:0 2px 10px rgba(0,0,0,${isDark ? "0.5" : "0.2"});
                    ">${count}</div>`,
                    className: "",
                    iconSize: [sz, sz],
                    iconAnchor: [sz / 2, sz / 2],
                })
            },
        })

        filtered.forEach((maker) => {
            const pinIcon = createPinIcon(maker, false, isDark)
            const marker = L.marker([maker.lat, maker.lng], { icon: pinIcon })
            marker.on("click", () => {
                // Preload hero + gallery images so card expand is instant
                const heroUrl = maker.gallery_urls?.[0]
                if (heroUrl) {
                    new window.Image().src = optimizeImageUrl(heroUrl, 600)
                    new window.Image().src = optimizeImageUrl(heroUrl, 120)
                }
                maker.gallery_urls?.slice(1, 6).forEach((url) => {
                    new window.Image().src = optimizeImageUrl(url, 200)
                })
                setSelectedMaker(maker)
                map.flyTo([maker.lat, maker.lng], Math.max(map.getZoom(), 15))
            })
            clusterGroup.addLayer(marker)
            markers.set(maker.id, { marker, maker })
        })

        map.addLayer(clusterGroup)
        clusterGroupRef.current = clusterGroup
        markerMapRef.current = markers
    }, [filtered, isDark])

    // Update pin icons on selection change (no cluster rebuild)
    useEffect(() => {
        const markers = markerMapRef.current
        if (!markers.size) return

        const prev = prevSelectedRef.current
        if (prev) {
            const entry = markers.get(prev.id)
            if (entry) {
                entry.marker.setIcon(createPinIcon(entry.maker, false, isDark))
                entry.marker.setZIndexOffset(0)
            }
        }
        if (selectedMaker) {
            const entry = markers.get(selectedMaker.id)
            if (entry) {
                entry.marker.setIcon(createPinIcon(entry.maker, true, isDark))
                entry.marker.setZIndexOffset(1000)
            }
        }
        prevSelectedRef.current = selectedMaker
    }, [selectedMaker, isDark])

    // Prefetch hero thumbnails for visible pins when map stops moving
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        let timeout
        const prefetchVisible = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                const bounds = map.getBounds()
                filtered.forEach((maker) => {
                    if (bounds.contains([maker.lat, maker.lng])) {
                        const url = maker.gallery_urls?.[0]
                        if (url) new window.Image().src = optimizeImageUrl(url, 120)
                    }
                })
            }, 400) // debounce — wait for map to settle
        }

        map.on("moveend", prefetchVisible)
        prefetchVisible() // initial viewport
        return () => {
            clearTimeout(timeout)
            map.off("moveend", prefetchVisible)
        }
    }, [filtered])

    return (
        <div style={{ height: "100%", position: "relative", overscrollBehavior: "contain" }}>
            <Helmet>
                <title>Map — maven</title>
                <meta
                    name="description"
                    content="Find local makers near you on the map. Explore craftspeople in Galway, Ireland."
                />
            </Helmet>
            {/* Leaflet Map Container */}
            <div
                ref={mapContainerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                }}
            />

            {/* Search Bar */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    zIndex: 1001,
                }}
            >
                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            background: theme.inputBg,
                            borderRadius: 14,
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                            border: `1px solid ${theme.border}`,
                        }}
                    >
                        <span style={{ fontSize: 16, color: theme.textSecondary }}>{"\u2315"}</span>
                        <input
                            placeholder="Search makers or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                            style={{
                                border: "none",
                                outline: "none",
                                flex: 1,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: theme.text,
                                background: "transparent",
                            }}
                        />
                    </div>

                    {/* Town suggestions dropdown */}
                    {searchFocused && townSuggestions.length > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                marginTop: 6,
                                background: theme.card,
                                borderRadius: 12,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                border: `1px solid ${theme.border}`,
                                overflow: "hidden",
                                zIndex: 1001,
                            }}
                        >
                            {townSuggestions.map((town, i) => (
                                <div
                                    key={town.name + town.county}
                                    onClick={() => handleSelectTown(town)}
                                    style={{
                                        padding: "11px 16px",
                                        cursor: "pointer",
                                        borderBottom:
                                            i < townSuggestions.length - 1 ? `1px solid ${theme.border}` : "none",
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 13.5,
                                            fontWeight: 600,
                                            color: theme.text,
                                        }}
                                    >
                                        {town.name}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 11.5,
                                            color: theme.textMuted,
                                        }}
                                    >
                                        {town.name === town.county ? "" : `Co. ${town.county}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Pills */}
            <div
                style={{
                    position: "absolute",
                    top: 64,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                }}
            >
                <CategoryPills
                    selected={category}
                    onSelect={setCategory}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => setOpenNow(!openNow)}
                    elevated
                />
            </div>

            {/* Bottom Card — swipeable sheet */}
            {selectedMaker && (
                <SwipeableMapCard
                    key={selectedMaker.id}
                    maker={selectedMaker}
                    onDismiss={() => setSelectedMaker(null)}
                    onTap={onMakerTap}
                    onToggleSave={onToggleSave}
                    isSaved={savedIds.has(selectedMaker.id)}
                    theme={theme}
                />
            )}
        </div>
    )
}
