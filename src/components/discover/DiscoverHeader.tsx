import { useState, useRef, useEffect, useCallback } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import { glassBarStyle } from "../../utils/glass"
import { useHeaderCollapse } from "../../hooks/useHeaderCollapse"
import SearchBar from "../ui/SearchBar"
import SearchOverlay from "./SearchOverlay"
import type { Maker } from "../../types"
import { storageGet, storageSet, storageRemove } from "../../utils/storage"
import { font } from "../../styles/tokens"

const RECENT_KEY = "maven-recent-searches" as const
const MAX_RECENT = 5

function getRecentSearches(): string[] {
    try {
        return JSON.parse(storageGet(RECENT_KEY) || "[]")
    } catch {
        return []
    }
}

function saveRecentSearch(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return
    const recent = getRecentSearches().filter((s) => s !== trimmed)
    recent.unshift(trimmed)
    storageSet(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

function clearRecentSearches() {
    storageRemove(RECENT_KEY)
}

interface DiscoverHeaderProps {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    searchQuery: string
    onSearchQueryChange: (query: string) => void
    locationLabel: string | null
    locationSource: string | null
    onLocationPickerOpen: () => void
    onReset: () => void
    onMakerTap: (maker: Maker) => void
    makerSuggestions: Maker[]
    isHidden: boolean
    refreshKey?: number
    filterSlot?: React.ReactNode
    mainFiltersRef?: React.RefObject<HTMLDivElement | null>
}

export default function DiscoverHeader({
    scrollContainerRef,
    searchQuery,
    onSearchQueryChange,
    locationLabel,
    locationSource,
    onLocationPickerOpen,
    onReset,
    onMakerTap,
    makerSuggestions,
    isHidden,
    refreshKey,
    filterSlot,
    mainFiltersRef,
}: DiscoverHeaderProps) {
    const { theme, isDark } = useTheme()
    const gBar = glassBarStyle(isDark)

    // --- State ---
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)

    // --- Refs ---
    const wrapperRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchGridRef = useRef<HTMLDivElement>(null)

    // --- Scroll collapse hook ---
    const {
        isCompact,
        topRowHidden,
        spacerH,
        handleLogoTap: hookLogoTap,
        filtersInHeader,
    } = useHeaderCollapse({
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
    })

    // --- Auto-close search on empty + blur (only on touch devices) ---
    useEffect(() => {
        if (!searchFocused && searchOpen && !searchQuery.trim()) {
            if (!("ontouchstart" in window)) return
            const timer = setTimeout(() => setSearchOpen(false), 400)
            return () => clearTimeout(timer)
        }
    }, [searchFocused, searchOpen, searchQuery])

    // --- Logo tap (shared between expanded and compact) ---
    const handleLogoTap = useCallback(() => {
        onReset()
        onSearchQueryChange("")
        setSearchOpen(false)
        hookLogoTap()
    }, [onReset, onSearchQueryChange, hookLogoTap])

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
            <circle cx="7" cy="7" r="5.5" stroke={theme.textMuted} strokeWidth="1.5" />
            <line
                x1="11"
                y1="11"
                x2="14.5"
                y2="14.5"
                stroke={theme.textMuted}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    )

    const searchBtnStyle = {
        width: 30,
        height: 30,
        border: "none",
        background: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    } as const

    return (
        <>
            <div ref={wrapperRef} style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
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
                    {/* Top row — morphs between expanded and compact like MakerProfileHeader */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateRows: isCompact && topRowHidden ? "0fr" : "1fr",
                            transition: "grid-template-rows 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        }}
                    >
                        <div style={{ overflow: "hidden" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    height: isCompact ? 40 : 50,
                                    boxSizing: "border-box",
                                    padding: isCompact ? "8px 16px 6px 20px" : "10px 16px 10px 20px",
                                    gap: 10,
                                    transition: "height 0.3s ease, padding 0.3s ease",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: isCompact ? "center" : "baseline",
                                        gap: 10,
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    <h1
                                        onClick={handleLogoTap}
                                        style={{
                                            fontFamily: font.wordmark,
                                            fontSize: isCompact ? 20 : 30,
                                            fontWeight: 700,
                                            color: theme.text,
                                            margin: 0,
                                            lineHeight: 1,
                                            letterSpacing: "-0.03em",
                                            cursor: "pointer",
                                            flexShrink: 0,
                                            textRendering: "optimizeLegibility",
                                            transition: "font-size 0.3s ease",
                                        }}
                                    >
                                        maven
                                    </h1>

                                    {/* Location picker — only in expanded state */}
                                    {!isCompact && (
                                        <div
                                            role="button"
                                            aria-label="Change location"
                                            onClick={onLocationPickerOpen}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
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
                                                    fontFamily: font.body,
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
                                    )}
                                </div>

                                {searchOpen ? (
                                    <button
                                        aria-label="Cancel search"
                                        onClick={() => {
                                            onSearchQueryChange("")
                                            setSearchOpen(false)
                                            setSearchFocused(false)
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                            fontFamily: font.body,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: theme.textSecondary,
                                            whiteSpace: "nowrap",
                                            flexShrink: 0,
                                            alignSelf: "flex-end",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                ) : (
                                    <button aria-label="Search" onClick={handleSearchOpen} style={searchBtnStyle}>
                                        {searchIcon}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search grid — always in same DOM position, never unmounts */}
                    <div
                        ref={searchGridRef}
                        style={{
                            display: "grid",
                            gridTemplateRows: searchOpen ? "1fr" : "0fr",
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
                                        height: 40,
                                        boxSizing: "border-box",
                                        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                                    }}
                                />
                            </div>
                        </div>
                        {searchOpen && searchFocused && (
                            <SearchOverlay
                                searchQuery={searchQuery}
                                recentSearches={recentSearches}
                                makerSuggestions={makerSuggestions}
                                onSearchQueryChange={onSearchQueryChange}
                                onMakerTap={onMakerTap}
                                onClearRecents={() => {
                                    clearRecentSearches()
                                    setRecentSearches([])
                                }}
                                onSaveSearch={saveRecentSearch}
                                onRefreshRecents={() => setRecentSearches(getRecentSearches())}
                            />
                        )}
                    </div>

                    {/* Filter slot — only shows when main filters have scrolled out of view */}
                    {filtersInHeader && filterSlot && <div style={{ padding: "0 0 2px" }}>{filterSlot}</div>}
                </div>
            </div>
            {/* Spacer — reserves space for the expanded header (like MakerHero does for MakerProfileHeader) */}
            <div style={{ height: spacerH }} />
        </>
    )
}
