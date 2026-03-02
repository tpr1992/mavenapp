import { memo } from "react"
import MakerAvatar from "../ui/MakerAvatar"
import HighlightMatch from "../ui/HighlightMatch"
import { getTodayHours } from "../../utils/time"
import { formatLocation } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"

export default memo(function MakerListItem({
    maker,
    index,
    isSaved,
    onTap,
    onToggleSave,
    showHours = true,
    highlightQuery,
}) {
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
                borderRadius: 6,
                cursor: "pointer",
                transition: "transform 0.15s ease",
                animation: `fadeSlideIn 0.3s ease ${Math.min(index, 10) * 0.05}s both`,
            }}
        >
            <div style={{ position: "relative", flexShrink: 0 }}>
                <MakerAvatar maker={maker} size={48} />
                {maker.made_in_ireland && (
                    <svg
                        width="16"
                        height="11"
                        viewBox="0 0 20 14"
                        style={{
                            position: "absolute",
                            bottom: -1,
                            right: -3,
                            borderRadius: 1,
                        }}
                    >
                        <rect x="0" y="0" width="7" height="14" fill="#169B62" />
                        <rect x="7" y="0" width="6" height="14" fill="#fff" />
                        <rect x="13" y="0" width="7" height="14" fill="#FF883E" />
                    </svg>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: theme.text,
                        }}
                    >
                        {highlightQuery ? <HighlightMatch text={maker.name} query={highlightQuery} /> : maker.name}
                    </span>
                    {maker.is_verified && (
                        <span style={{ fontSize: 12, color: theme.textMuted }} title="Verified">
                            {"\u2713"}
                        </span>
                    )}
                </div>
                <div
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
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
                        fontSize: 20,
                        cursor: "pointer",
                        padding: 10,
                        color: isSaved ? "#c53030" : theme.textMuted,
                        transition: "transform 0.2s ease",
                    }}
                >
                    {isSaved ? "\u2665" : "\u2661"}
                </button>
            )}
        </div>
    )
})
