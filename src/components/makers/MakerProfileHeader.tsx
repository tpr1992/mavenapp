import React, { useState, useEffect, useRef, useCallback, memo } from "react"
import { GLASS, glassBarStyle } from "../../utils/glass"
import { safeOpen } from "../../utils/safeOpen"
import type { Maker, Theme } from "../../types"

interface MakerProfileHeaderProps {
    maker: Maker
    isCompact: boolean
    isSaved: boolean
    isDark: boolean
    theme: Theme
    onBack: () => void
    onLogoTap: () => void
    onToggleSave: (id: string) => void
    onShare: () => void
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>
}

export default memo(function MakerProfileHeader({
    maker,
    isCompact,
    isSaved,
    isDark,
    theme,
    onBack,
    onLogoTap,
    onToggleSave,
    onShare,
    scrollContainerRef,
}: MakerProfileHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuMounting, setMenuMounting] = useState(false)
    const [menuDismissing, setMenuDismissing] = useState(false)
    const menuClosedAtRef = useRef(0)
    const menuBtnRef = useRef<HTMLButtonElement>(null)
    const menuVisible = menuOpen || menuDismissing

    const dismissMenu = useCallback(() => {
        if (!menuOpen) return
        menuClosedAtRef.current = Date.now()
        setMenuOpen(false)
        setMenuDismissing(true)
        setTimeout(() => setMenuDismissing(false), 120)
    }, [menuOpen])

    // Auto-close menu on mode transition
    useEffect(() => {
        if (menuOpen) dismissMenu()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCompact])

    // Close menu: tap outside = instant dismiss, drag = velocity-based scroll dismiss
    useEffect(() => {
        const el = scrollContainerRef?.current
        if (!menuOpen || !el) return

        let didMove = false
        let lastScroll = el.scrollTop
        let lastTime = performance.now()

        const onTouchStart = (e: TouchEvent) => {
            const target = e.target as Node
            if (menuBtnRef.current?.contains(target)) return
            didMove = false
            lastScroll = el.scrollTop
            lastTime = performance.now()
        }

        const onScroll = () => {
            const now = performance.now()
            const st = el.scrollTop
            const dt = Math.max(now - lastTime, 1)
            const velocity = Math.abs(st - lastScroll) / dt
            didMove = true
            if (velocity > 0.3) dismissMenu()
            lastScroll = st
            lastTime = now
        }

        const onTouchEnd = (e: TouchEvent) => {
            const target = e.target as Node
            if (menuBtnRef.current?.contains(target)) return
            if (!didMove) {
                const drop = menuBtnRef.current?.parentElement?.querySelector("[data-menu-drop]")
                if (drop?.contains(target)) return
                dismissMenu()
            }
        }

        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (menuBtnRef.current?.contains(target)) return
            const drop = menuBtnRef.current?.parentElement?.querySelector("[data-menu-drop]")
            if (drop?.contains(target)) return
            dismissMenu()
        }

        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("scroll", onScroll, { passive: true })
        el.addEventListener("touchend", onTouchEnd, { passive: true })
        const timer = setTimeout(() => {
            window.addEventListener("click", onClick, { capture: true })
        }, 0)

        return () => {
            clearTimeout(timer)
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("scroll", onScroll)
            el.removeEventListener("touchend", onTouchEnd)
            window.removeEventListener("click", onClick, { capture: true })
        }
    }, [menuOpen, scrollContainerRef, dismissMenu])

    // ── Morph styles ──
    const glass = glassBarStyle(isDark)
    const t =
        "background 0.3s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.3s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.3s cubic-bezier(0.32, 0.72, 0, 1), width 0.3s cubic-bezier(0.32, 0.72, 0, 1), height 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
    const btnSize = isCompact ? 32 : 36

    const btnStyle: React.CSSProperties = {
        background: "none",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        pointerEvents: "auto",
    }

    const iconColor = isCompact ? theme.textSecondary : "rgba(255,255,255,0.7)"
    const dotFill = isCompact ? theme.textSecondary : "rgba(255,255,255,0.9)"

    const menuItems = [
        {
            label: "Share",
            icon: (
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isCompact ? theme.textSecondary : iconColor}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 0.3s ease" }}
                >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
            ),
            action: () => {
                dismissMenu()
                onShare()
            },
        },
        {
            label: "Directions",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z"
                        fill={isCompact ? theme.textSecondary : iconColor}
                        style={{ transition: "fill 0.3s ease" }}
                    />
                </svg>
            ),
            action: () => {
                dismissMenu()
                window.open(
                    /android/i.test(navigator.userAgent)
                        ? `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}`
                        : `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`,
                    "_blank",
                    "noopener,noreferrer",
                )
            },
        },
        ...(maker.website_url
            ? [
                  {
                      label: "Website",
                      icon: (
                          <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isCompact ? theme.textSecondary : iconColor}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ transition: "stroke 0.3s ease" }}
                          >
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                      ),
                      action: () => {
                          dismissMenu()
                          safeOpen(maker.website_url)
                      },
                  },
              ]
            : []),
    ]

    return (
        <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
            <div
                style={{
                    background: isCompact ? glass.background : "transparent",
                    backdropFilter: isCompact ? glass.backdropFilter : "none",
                    WebkitBackdropFilter: isCompact ? glass.WebkitBackdropFilter : "none",
                    borderBottom: isCompact ? glass.border : "1px solid transparent",
                    boxShadow: isCompact ? glass.boxShadow : "none",
                    transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                    pointerEvents: isCompact ? "auto" : "none",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isCompact ? 12 : 10,
                        padding: isCompact ? "10px 16px 10px 12px" : "16px 16px 0",
                        transition: t,
                    }}
                >
                    {/* Back button */}
                    <button onClick={onBack} aria-label="Go back" style={{ ...btnStyle, pointerEvents: "auto" }}>
                        <svg
                            width={isCompact ? 16 : 18}
                            height={isCompact ? 16 : 18}
                            viewBox="0 0 16 16"
                            fill="none"
                            style={{ transition: "width 0.3s ease, height 0.3s ease" }}
                        >
                            <path
                                d="M10 3L5.5 8L10 13"
                                stroke={isCompact ? theme.textSecondary : "rgba(255,255,255,0.7)"}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transition: "stroke 0.3s ease" }}
                            />
                        </svg>
                    </button>

                    {/* Logo */}
                    <span
                        onClick={onLogoTap}
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: isCompact ? 19 : 22,
                            fontWeight: 700,
                            color: isCompact ? theme.text : "rgba(255,255,255,0.9)",
                            letterSpacing: "-0.03em",
                            cursor: "pointer",
                            lineHeight: 1,
                            position: "relative",
                            top: isCompact ? -2 : -3,
                            flexShrink: 0,
                            pointerEvents: "auto",
                            transition: "font-size 0.3s ease, color 0.3s ease, top 0.3s ease",
                        }}
                    >
                        maven
                    </span>

                    {/* Dot separator + maker name — compact only */}
                    <div
                        style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: theme.textMuted,
                            flexShrink: 0,
                            opacity: isCompact ? 1 : 0,
                            transition: "opacity 0.3s ease",
                        }}
                    />
                    <span
                        onClick={() => scrollContainerRef?.current?.scrollTo({ top: 0, behavior: "smooth" })}
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: theme.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            position: "relative",
                            top: 1,
                            opacity: isCompact ? 1 : 0,
                            maxWidth: isCompact ? 200 : 0,
                            transition: "opacity 0.3s ease, max-width 0.3s ease",
                            cursor: "pointer",
                            pointerEvents: isCompact ? "auto" : "none",
                        }}
                    >
                        {maker.name}
                    </span>

                    <div style={{ flex: 1 }} />

                    {/* Action buttons */}
                    <div
                        style={{ display: "flex", gap: 6, flexShrink: 0, position: "relative", pointerEvents: "auto" }}
                    >
                        <button
                            onClick={() => onToggleSave(maker.id)}
                            aria-label={isSaved ? `Unsave ${maker.name}` : `Save ${maker.name}`}
                            style={{
                                ...btnStyle,
                                color: isSaved ? "#fc8181" : isCompact ? theme.textMuted : "rgba(255,255,255,0.85)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <svg
                                width={isCompact ? 18 : 19}
                                height={isCompact ? 18 : 19}
                                viewBox="0 0 24 24"
                                fill={isSaved ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </button>
                        <button
                            ref={menuBtnRef}
                            onClick={() => {
                                if (Date.now() - menuClosedAtRef.current < 300) return
                                if (menuOpen) dismissMenu()
                                else {
                                    setMenuMounting(true)
                                    setMenuOpen(true)
                                    requestAnimationFrame(() => requestAnimationFrame(() => setMenuMounting(false)))
                                }
                            }}
                            aria-label="More options"
                            style={btnStyle}
                        >
                            <svg
                                width={isCompact ? 14 : 16}
                                height={isCompact ? 14 : 16}
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <circle
                                    cx="3.5"
                                    cy="8"
                                    r="1.3"
                                    fill={dotFill}
                                    style={{ transition: "fill 0.3s ease" }}
                                />
                                <circle cx="8" cy="8" r="1.3" fill={dotFill} style={{ transition: "fill 0.3s ease" }} />
                                <circle
                                    cx="12.5"
                                    cy="8"
                                    r="1.3"
                                    fill={dotFill}
                                    style={{ transition: "fill 0.3s ease" }}
                                />
                            </svg>
                        </button>

                        {/* Dropdown menu */}
                        {menuVisible && (
                            <div
                                data-menu-drop
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    right: 0,
                                    background: isCompact ? theme.card : GLASS.dark.background,
                                    backdropFilter: isCompact ? "none" : GLASS.dark.backdropFilter,
                                    WebkitBackdropFilter: isCompact ? "none" : GLASS.dark.WebkitBackdropFilter,
                                    borderRadius: 0,
                                    border: isCompact ? `1px solid ${theme.border}` : GLASS.dark.border,
                                    boxShadow: isCompact
                                        ? "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)"
                                        : "0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.15)",
                                    minWidth: 180,
                                    zIndex: 100,
                                    overflow: "hidden",
                                    transformOrigin: "top right",
                                    opacity: menuDismissing || menuMounting ? 0 : 1,
                                    transform: menuDismissing || menuMounting ? "scale(0.7)" : "scale(1)",
                                    transition: menuMounting
                                        ? "none"
                                        : menuDismissing
                                          ? "opacity 0.12s ease-in, transform 0.12s ease-in"
                                          : "opacity 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.1), transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.1)",
                                    pointerEvents: menuDismissing ? "none" : "auto",
                                }}
                            >
                                {menuItems.map((item, i) => (
                                    <button
                                        key={item.label}
                                        onClick={item.action}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "13px 16px",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: isCompact ? theme.text : "rgba(255,255,255,0.9)",
                                            borderBottom:
                                                i < menuItems.length - 1
                                                    ? `1px solid ${isCompact ? theme.border : "rgba(255,255,255,0.1)"}`
                                                    : "none",
                                            textAlign: "left",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 20,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})
