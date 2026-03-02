import { useTheme } from "../../contexts/ThemeContext"

export default function RecentSearches({ searches, onSelect, onRemove, onClearAll }) {
  const { theme } = useTheme()

  if (!searches || searches.length === 0) return null

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        marginTop: 6,
        background: theme.card,
        borderRadius: 14,
        border: `1px solid ${theme.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 6px",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: theme.textMuted,
          }}
        >
          Recent
        </span>
        <button
          onClick={onClearAll}
          style={{
            background: "none",
            border: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: theme.textMuted,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Clear all
        </button>
      </div>
      <div>
        {searches.map((term, i) => (
          <div
            key={term}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: i < searches.length - 1 ? `1px solid ${theme.border}` : "none",
              cursor: "pointer",
            }}
            onClick={() => onSelect(term)}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13.5,
                color: theme.text,
              }}
            >
              {term}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(term)
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 14,
                color: theme.textMuted,
                cursor: "pointer",
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              {"\u2715"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
