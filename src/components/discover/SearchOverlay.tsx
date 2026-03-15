import { useTheme } from "../../contexts/ThemeContext"
import MakerAvatar from "../ui/MakerAvatar"
import HighlightMatch from "../ui/HighlightMatch"
import { formatLocation } from "../../utils/distance"
import type { Maker } from "../../types"

interface SearchOverlayProps {
    searchQuery: string
    recentSearches: string[]
    makerSuggestions: Maker[]
    onSearchQueryChange: (query: string) => void
    onMakerTap: (maker: Maker) => void
    onClearRecents: () => void
    onSaveSearch: (query: string) => void
    onRefreshRecents: () => void
}

export default function SearchOverlay({
    searchQuery,
    recentSearches,
    makerSuggestions,
    onSearchQueryChange,
    onMakerTap,
    onClearRecents,
    onSaveSearch,
    onRefreshRecents,
}: SearchOverlayProps) {
    const { theme, isDark } = useTheme()

    if (searchQuery.trim().length === 0 && recentSearches.length === 0) return null

    return (
        <div style={{ padding: "0 20px 10px", position: "relative", zIndex: 10 }}>
            <div
                style={{
                    background: isDark ? "rgba(32,32,32,0.97)" : "rgba(255,255,255,0.97)",
                    borderRadius: 12,
                    boxShadow: isDark
                        ? "0 8px 30px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset"
                        : "0 8px 30px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
                    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    maxHeight: 340,
                    overflowY: "auto",
                }}
            >
                {/* Recent searches — empty query */}
                {!searchQuery.trim() &&
                    recentSearches.length > 0 &&
                    (() => {
                        const items = recentSearches
                        return (
                            <>
                                <div
                                    style={{
                                        padding: "10px 14px 6px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 10,
                                            fontWeight: 600,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            color: theme.textMuted,
                                        }}
                                    >
                                        Recent
                                    </span>
                                    <button
                                        onClick={onClearRecents}
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 11,
                                            color: theme.textMuted,
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                                {items.map((term, i) => (
                                    <div
                                        key={term}
                                        onClick={() => onSearchQueryChange(term)}
                                        style={{
                                            padding: "10px 14px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            borderBottom:
                                                i < items.length - 1
                                                    ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`
                                                    : "none",
                                        }}
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={theme.textMuted}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span
                                            style={{
                                                fontFamily: "'DM Sans', sans-serif",
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: theme.text,
                                            }}
                                        >
                                            {term}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )
                    })()}

                {/* Maker suggestions */}
                {searchQuery.trim() &&
                    makerSuggestions.length > 0 &&
                    makerSuggestions.map((maker, i) => (
                        <div
                            key={maker.id}
                            onClick={() => {
                                onSaveSearch(searchQuery)
                                onRefreshRecents()
                                onMakerTap(maker)
                            }}
                            style={{
                                padding: "9px 14px",
                                cursor: "pointer",
                                borderBottom:
                                    i < makerSuggestions.length - 1
                                        ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`
                                        : "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <MakerAvatar maker={maker} size={28} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: theme.text,
                                    }}
                                >
                                    <HighlightMatch text={maker.name} query={searchQuery.trim()} />
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 11,
                                        color: theme.textMuted,
                                        marginTop: 1,
                                    }}
                                >
                                    {maker.category} · {formatLocation(maker)}
                                </div>
                            </div>
                        </div>
                    ))}

                {/* No results */}
                {searchQuery.trim() && makerSuggestions.length === 0 && (
                    <div style={{ padding: "24px 14px", textAlign: "center" }}>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                fontWeight: 500,
                                color: theme.textSecondary,
                                marginBottom: 4,
                            }}
                        >
                            No makers found
                        </div>
                        <div
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: theme.textMuted,
                            }}
                        >
                            Try a name, category, or county
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
