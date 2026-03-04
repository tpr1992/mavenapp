import { CATEGORIES } from "../../constants/categories"
import { useTheme } from "../../contexts/ThemeContext"

type FeedLayout = "grid" | "single"

interface CategoryPillsProps {
    selected: string
    onSelect: (cat: string) => void
    showOpenNow?: boolean
    openNowActive?: boolean
    onToggleOpenNow?: () => void
    elevated?: boolean
    feedLayout?: FeedLayout
    onFeedLayoutChange?: (layout: FeedLayout) => void
    compact?: boolean
}

export default function CategoryPills({
    selected,
    onSelect,
    showOpenNow = false,
    openNowActive = false,
    onToggleOpenNow,
    elevated = false,
    feedLayout,
    onFeedLayoutChange,
    compact = false,
}: CategoryPillsProps) {
    const { theme } = useTheme()

    const showToggle = feedLayout && onFeedLayoutChange
    const px = compact ? 12 : 16
    const fontSize = compact ? 12.5 : 13

    const pillStyle = (active: boolean) => ({
        padding: `7px ${px}px`,
        borderRadius: 100,
        border: active ? "none" : `1.5px solid ${theme.border}`,
        background: active ? theme.btnBg : elevated ? theme.card : "transparent",
        color: active ? theme.btnText : theme.textSecondary,
        fontFamily: "'DM Sans', sans-serif",
        fontSize,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
        transition: "all 0.2s ease",
        letterSpacing: "0.01em",
        boxShadow: elevated && !active ? "0 1px 4px rgba(0,0,0,0.1)" : undefined,
    })

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    gap: compact ? 6 : 8,
                    overflowX: "auto",
                    padding: showToggle ? `0 ${compact ? 8 : 12}px 8px ${compact ? 16 : 20}px` : "0 20px 8px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}
            >
                {showOpenNow && (
                    <button
                        aria-pressed={openNowActive}
                        onClick={onToggleOpenNow}
                        style={{
                            ...pillStyle(openNowActive),
                            background: openNowActive ? "#22543d" : elevated ? theme.card : "transparent",
                            color: openNowActive ? "#fff" : theme.textSecondary,
                            border: openNowActive ? "none" : `1.5px solid ${theme.border}`,
                        }}
                    >
                        {"\u25CF"} Open
                    </button>
                )}
                {CATEGORIES.filter((cat) => cat !== "All").map((cat) => (
                    <button
                        key={cat}
                        aria-pressed={selected === cat}
                        onClick={() => onSelect(selected === cat ? "All" : cat)}
                        style={pillStyle(selected === cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            {showToggle && (
                <div style={{ flexShrink: 0, paddingRight: compact ? 12 : 16, paddingBottom: 8 }}>
                    <div
                        style={{
                            display: "flex",
                            background: theme.pill,
                            borderRadius: 8,
                            padding: 2,
                            gap: 2,
                        }}
                    >
                        <button
                            onClick={() => onFeedLayoutChange("grid")}
                            style={{
                                width: 28,
                                height: 24,
                                borderRadius: 6,
                                border: "none",
                                background: feedLayout === "grid" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: feedLayout === "grid" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="0"
                                    width="6"
                                    height="14"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                                <rect
                                    x="8"
                                    y="0"
                                    width="6"
                                    height="14"
                                    rx="1.5"
                                    fill={feedLayout === "grid" ? theme.text : theme.textMuted}
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => onFeedLayoutChange("single")}
                            style={{
                                width: 28,
                                height: 24,
                                borderRadius: 6,
                                border: "none",
                                background: feedLayout === "single" ? theme.card : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: feedLayout === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <rect
                                    x="0"
                                    y="0"
                                    width="14"
                                    height="14"
                                    rx="2"
                                    fill={feedLayout === "single" ? theme.text : theme.textMuted}
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
