import { optimizeImageUrl } from "../../utils/image"
import { CATEGORY_EMOJI } from "../../constants/categories"
import { isOpenNow } from "../../utils/time"
import { formatDistance } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"

export default function StudioSpotlightCard({ maker, onTap, isSaved, onToggleSave, showOpenStatus }) {
  const { theme } = useTheme()

  return (
    <div
      onClick={() => onTap(maker)}
      style={{
        background: "transparent",
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.15s ease",
      }}
    >
      {/* Hero banner */}
      <div
        style={{
          height: 120,
          background: maker.gallery_urls?.[0]
            ? `linear-gradient(135deg, ${maker.hero_color}90, ${maker.hero_color}cc), url(${optimizeImageUrl(maker.gallery_urls[0], 300)}) center/cover`
            : `linear-gradient(135deg, ${maker.hero_color}20, ${maker.hero_color}45)`,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Decorative shapes */}
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `${maker.hero_color}15`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: 30,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `${maker.hero_color}10`,
          }}
        />
        <div style={{ fontSize: 40, opacity: 0.5, zIndex: 1 }}>
          {CATEGORY_EMOJI[maker.category]}
        </div>

        {/* Spotlight pill */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 14,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 10 }}>&#10022;</span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              color: "#888",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Spotlight
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave(maker.id)
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: isSaved ? "#c53030" : "#999",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 2,
          }}
        >
          {isSaved ? "\u2665" : "\u2661"}
        </button>

        {/* Open badge */}
        {showOpenStatus && isOpenNow(maker.opening_hours) && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 14,
              padding: "3px 9px",
              borderRadius: 100,
              background: "rgba(34,84,61,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              color: "#fff",
              zIndex: 2,
            }}
          >
            &#9679; Open
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px 18px" }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              color: theme.text,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {maker.name}
          </h3>
          {maker.is_verified && (
            <span style={{ fontSize: 11, color: theme.textSecondary }}>&#10003;</span>
          )}
        </div>

        {/* Meta */}
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: theme.textMuted,
            marginBottom: 12,
          }}
        >
          {maker.category} &middot; {maker.city}{maker.distance != null && <> &middot; {formatDistance(maker.distance)}</>}
        </div>

        {/* Pull quote */}
        {maker.spotlight_quote && (
          <div
            style={{
              borderLeft: `3px solid ${maker.hero_color}60`,
              paddingLeft: 14,
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13.5,
                fontStyle: "italic",
                color: theme.textSecondary,
                margin: 0,
                lineHeight: 1.55,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              &ldquo;{maker.spotlight_quote}&rdquo;
            </p>
          </div>
        )}

        {/* CTA row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11.5,
              color: theme.textMuted,
            }}
          >
            {maker.years_active} years crafting
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: maker.hero_color,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View studio
            <span style={{ fontSize: 11 }}>&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  )
}
