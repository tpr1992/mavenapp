import { memo } from "react"
import MakerAvatar from "../ui/MakerAvatar"
import HighlightMatch from "../ui/HighlightMatch"
import { getTodayHours } from "../../utils/time"
import { formatLocation } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import type { Maker } from "../../types"
import { font } from "../../styles/tokens"

interface MakerListItemProps {
    maker: Maker
    index: number
    isSaved: boolean
    onTap: (maker: Maker) => void
    onToggleSave?: (id: string) => void
    showHours?: boolean
    highlightQuery?: string
    isDebug?: boolean
    eager?: boolean
    stagger?: boolean
}

export default memo(function MakerListItem({
    maker,
    index,
    isSaved,
    onTap,
    onToggleSave,
    showHours = true,
    highlightQuery,
    isDebug,
    eager = false,
    stagger = true,
}: MakerListItemProps) {
    const { theme } = useTheme()

    return (
        <div
            onClick={() => onTap(maker)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "transparent",
                borderRadius: 0,
                cursor: "pointer",
                transition: "transform 0.15s ease",
                animation: stagger ? `fadeSlideIn 0.3s ease ${Math.min(index, 10) * 0.05}s both` : undefined,
            }}
        >
            <div style={{ position: "relative", flexShrink: 0 }}>
                <MakerAvatar maker={maker} size={48} eager={eager} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isDebug && (
                        <span
                            style={{
                                background: "rgba(0,0,0,0.7)",
                                color: "#fff",
                                fontSize: 9,
                                fontFamily: "monospace",
                                padding: "1px 5px",
                                borderRadius: 0,
                                flexShrink: 0,
                            }}
                        >
                            #{maker.rank} {"\u00B7"} {(maker.score ?? 0).toFixed(2)} {"\u00B7"}{" "}
                            {maker.currentWeekClicks ?? 0}/{maker.previousWeekClicks ?? 0}
                        </span>
                    )}
                    <span
                        style={{
                            fontFamily: font.body,
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: theme.text,
                        }}
                    >
                        {highlightQuery ? <HighlightMatch text={maker.name} query={highlightQuery} /> : maker.name}
                    </span>
                    {/* {maker.is_verified && (
                        <span style={{ fontSize: 12, color: theme.textMuted }} title="Verified">
                            {"\u2713"}
                        </span>
                    )} */}
                </div>
                <div
                    style={{
                        fontFamily: font.body,
                        fontSize: 12,
                        color: theme.textMuted,
                        marginTop: 2,
                    }}
                >
                    {formatLocation(maker)}
                    {" \u00B7 "}
                    {maker.category}
                    {showHours && (
                        <>
                            {" "}
                            {"\u00B7"} {getTodayHours(maker.opening_hours)}
                        </>
                    )}
                </div>
            </div>
            {onToggleSave && (
                <button
                    aria-label={isSaved ? `Unsave ${maker.name}` : `Save ${maker.name}`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleSave(maker.id)
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 10,
                        color: isSaved ? "#fc8181" : theme.textMuted,
                        transition: "transform 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                    </svg>
                </button>
            )}
        </div>
    )
})
