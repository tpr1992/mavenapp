import { memo } from "react"
import { optimizeImageUrl } from "../../utils/image"
import { CATEGORY_EMOJI } from "../../constants/categories"
import { isOpenNow } from "../../utils/time"
import { formatDistance } from "../../utils/distance"
import { useTheme } from "../../contexts/ThemeContext"
import MadeInIrelandBadge from "../ui/MadeInIrelandBadge"

export default memo(function FeaturedMakerCard({ maker, onTap, showOpenStatus }) {
  const { isDark } = useTheme()

  return (
    <div style={{ padding: "0 4px" }}>
      <div
        onClick={() => onTap(maker)}
        style={{
          background: maker.gallery_urls?.[0]
            ? `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.75) 100%), url(${optimizeImageUrl(maker.gallery_urls[0], 400)}) center/cover`
            : maker.hero_color,
          borderRadius: 20,
          padding: "28px 24px",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "transform 0.2s ease",
          filter: isDark ? "brightness(0.78) saturate(0.85)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Featured Maker
          </span>
          {maker.made_in_ireland && <MadeInIrelandBadge variant="hero" />}
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#fff",
            margin: "10px 0 8px",
            lineHeight: 1.2,
          }}
        >
          {maker.name}
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            color: "rgba(255,255,255,0.8)",
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 280,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {maker.bio}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {CATEGORY_EMOJI[maker.category]} {maker.category}
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {maker.distance != null ? `\u25C8 ${formatDistance(maker.distance)} away` : `\u25C8 ${maker.city}`}
          </span>
          {showOpenStatus && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: isOpenNow(maker.opening_hours) ? "rgba(134,239,172,0.9)" : "rgba(255,255,255,0.4)",
              }}
            >
              {isOpenNow(maker.opening_hours) ? "\u25CF Open" : "\u25CB Closed"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})
