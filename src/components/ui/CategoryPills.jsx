import { CATEGORIES } from "../../constants/categories"
import { useTheme } from "../../contexts/ThemeContext"

export default function CategoryPills({
    selected,
    onSelect,
    showOpenNow = false,
    openNowActive = false,
    onToggleOpenNow,
}) {
    const { theme } = useTheme()

    const pillStyle = (active) => ({
        padding: "8px 16px",
        borderRadius: 100,
        border: active ? "none" : `1.5px solid ${theme.border}`,
        background: active ? theme.btnBg : "transparent",
        color: active ? theme.btnText : theme.textSecondary,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s ease",
        letterSpacing: "0.01em",
    })

    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                padding: "0 20px 8px",
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
                        background: openNowActive ? "#22543d" : "transparent",
                        color: openNowActive ? "#fff" : theme.textSecondary,
                        border: openNowActive ? "none" : `1.5px solid ${theme.border}`,
                    }}
                >
                    {"\u25CF"} Open Now
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
    )
}
