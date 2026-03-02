import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { CATEGORY_EMOJI } from "../constants/categories"
import { isOpenNow, getTodayHours, DAYS } from "../utils/time"
import { formatDistance } from "../utils/distance"
import MakerAvatar from "../components/ui/MakerAvatar"
import MadeInIrelandBadge from "../components/ui/MadeInIrelandBadge"
import { useTheme } from "../contexts/ThemeContext"
import { safeOpen } from "../utils/safeOpen"
import NearbyMakerCard from "../components/makers/NearbyMakerCard"

const TABS = [
  { id: "gallery", label: "Gallery" },
  { id: "instagram", label: "Instagram" },
  { id: "events", label: "Events" },
]

function getVisibleTabs(maker) {
  return TABS.filter((tab) => {
    if (tab.id === "instagram") return !!maker.instagram_handle
    if (tab.id === "events") return maker.events && maker.events.length > 0
    return true
  })
}

// ─── Hero Section ─────────────────────────────────────
function HeroSection({ maker, onBack, onLogoTap, onShare, onToggleSave, isSaved, heroRef, isDark, theme }) {
  const hasGallery = maker.gallery_urls && maker.gallery_urls.length > 0
  const heroImage = hasGallery ? maker.gallery_urls[0] : null
  const [menuOpen, setMenuOpen] = useState(false)

  const frostedBtn = {
    background: "rgba(20,20,20,0.3)",
    backdropFilter: "blur(12px) saturate(1.4)",
    WebkitBackdropFilter: "blur(12px) saturate(1.4)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "50%",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  }

  const iconColor = theme.textSecondary
  const menuItems = [
    {
      label: "Share",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
      action: () => { setMenuOpen(false); onShare() },
    },
    {
      label: "Directions",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" fill={iconColor} />
        </svg>
      ),
      action: () => { setMenuOpen(false); window.open(/android/i.test(navigator.userAgent) ? `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}` : `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`, "_blank", "noopener,noreferrer") },
    },
    ...(maker.website_url ? [{
      label: "Website",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      ),
      action: () => { setMenuOpen(false); safeOpen(maker.website_url) },
    }] : []),
  ]

  return (
    <div
      ref={heroRef}
      style={{
        position: "relative",
        background: maker.hero_color,
        minHeight: 190,
      }}
    >
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isDark
              ? "brightness(0.75) saturate(0.9)"
              : "brightness(0.9) saturate(1)",
          }}
        />
      )}

      {/* Subtle bottom scrim for text legibility only */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top bar */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "16px 16px 0",
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Go back"
          style={frostedBtn}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5.5 8L10 13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span
          onClick={onLogoTap}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.02em",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          maven
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 6, position: "relative" }}>
          <button
            onClick={() => onToggleSave(maker.id)}
            aria-label={isSaved ? "Unsave" : "Save"}
            style={{
              ...frostedBtn,
              fontSize: 17,
              color: isSaved ? "#fc8181" : "rgba(255,255,255,0.85)",
              transition: "color 0.2s ease",
            }}
          >
            {isSaved ? "\u2665" : "\u2661"}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            style={frostedBtn}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="3.5" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
              <circle cx="8" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
              <circle cx="12.5" cy="8" r="1.3" fill="rgba(255,255,255,0.9)" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 90 }}
              />
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: theme.card,
                borderRadius: 14,
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
                minWidth: 180,
                zIndex: 100,
                overflow: "hidden",
                animation: "fadeSlideIn 0.15s ease",
              }}>
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
                      color: theme.text,
                      borderBottom: i < menuItems.length - 1 ? `1px solid ${theme.border}` : "none",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Maker info */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          padding: "20px 20px 16px",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 6,
          }}
        >
          {maker.category} {maker.city && `\u00B7 ${maker.city}`}
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          {maker.name}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11.5,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {maker.address} {maker.distance != null && `\u00B7 ${formatDistance(maker.distance)}`}
        </div>
      </div>
    </div>
  )
}

// ─── About Section (inline, compact) ─────────────────
function AboutSection({ maker, theme }) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const [hoursExpanded, setHoursExpanded] = useState(false)
  const todayStatus = isOpenNow(maker.opening_hours)
  const todayText = getTodayHours(maker.opening_hours)
  const bioIsLong = maker.bio && maker.bio.length > 120

  return (
    <div style={{ padding: "14px 16px 0" }}>
      {/* Bio — truncated to 2 lines */}
      <p
        onClick={() => bioIsLong && setBioExpanded(!bioExpanded)}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13.5,
          color: theme.textSecondary,
          lineHeight: 1.55,
          margin: "0 0 10px",
          cursor: bioIsLong ? "pointer" : "default",
          ...(!bioExpanded && bioIsLong ? {
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          } : {}),
        }}
      >
        {maker.bio}
        {bioIsLong && !bioExpanded && (
          <span style={{ color: theme.textMuted, fontWeight: 500 }}>{" "}more</span>
        )}
      </p>

      {/* Compact info row — pills + status inline */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <span style={{ padding: "4px 10px", borderRadius: 100, background: theme.pill, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: theme.textSecondary }}>
          {CATEGORY_EMOJI[maker.category]} {maker.category}
        </span>
        <span style={{ padding: "4px 10px", borderRadius: 100, background: theme.pill, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: theme.textSecondary }}>
          {todayStatus ? "\u25CF " : "\u25CB "}{todayText}
        </span>
        {maker.years_active && (
          <span style={{ padding: "4px 10px", borderRadius: 100, background: theme.pill, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: theme.textSecondary }}>
            {maker.years_active} yrs
          </span>
        )}
        {maker.made_in_ireland && <MadeInIrelandBadge variant="card" />}
      </div>

      {/* Hours — collapsible, compact */}
      <button
        onClick={() => setHoursExpanded(!hoursExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: theme.surface,
          borderRadius: hoursExpanded ? "12px 12px 0 0" : 12,
          border: "none",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "border-radius 0.2s ease",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>Hours</span>
        <span style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
          {todayText}
          <svg
            width="9" height="9" viewBox="0 0 10 10" fill="none"
            style={{ transform: hoursExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {hoursExpanded && (
        <div style={{ background: theme.surface, borderRadius: "0 0 12px 12px", padding: "2px 14px 10px", animation: "fadeSlideIn 0.2s ease" }}>
          {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
            const hours = maker.opening_hours?.[day]
            const isToday = DAYS[new Date().getDay()] === day
            return (
              <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: day !== "sun" ? `1px solid ${theme.border}` : "none" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: isToday ? 700 : 400, color: isToday ? theme.text : theme.textSecondary, textTransform: "capitalize" }}>
                  {day}{isToday ? " \u00B7" : ""}
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: isToday ? 600 : 400, color: !hours || hours === "closed" ? theme.textMuted : isToday ? theme.text : theme.textSecondary }}>
                  {!hours || hours === "closed" ? "Closed" : hours.replace("-", " \u2013 ")}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────
function ProfileTabs({ tabs, activeTab, onTabChange, theme }) {
  return (
    <div
      style={{
        display: "flex",
        overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: `1px solid ${theme.border}`,
        padding: "0 4px",
        marginTop: 10,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flexShrink: 0,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: activeTab === tab.id ? theme.text : theme.textMuted,
            padding: "13px 18px 11px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${activeTab === tab.id ? theme.text : "transparent"}`,
            cursor: "pointer",
            transition: "color 0.15s ease, border-color 0.15s ease",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Gallery Tab ──────────────────────────────────────
function GalleryTab({ maker, theme, onImageTap }) {
  const images = maker.gallery_urls || []
  const HEIGHTS_L = [195, 155, 175, 190]
  const HEIGHTS_R = [215, 160, 180, 170]

  if (!images.length) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>
          {CATEGORY_EMOJI[maker.category] || "\u2726"}
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: theme.textMuted,
          lineHeight: 1.6,
        }}>
          No gallery images yet.
        </p>
      </div>
    )
  }

  const leftImages = images.filter((_, i) => i % 2 === 0)
  const rightImages = images.filter((_, i) => i % 2 === 1)

  return (
    <div style={{ padding: "12px 12px 0" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {leftImages.map((url, i) => (
            <div
              key={i}
              onClick={() => onImageTap && onImageTap(i * 2)}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                height: HEIGHTS_L[i % HEIGHTS_L.length],
                background: theme.surface,
                animation: `fadeSlideIn 0.4s ease ${i * 0.06}s both`,
                cursor: "pointer",
              }}
            >
              <img
                src={url}
                alt={`${maker.name} ${i * 2 + 1}`}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
          {rightImages.map((url, i) => (
            <div
              key={i}
              onClick={() => onImageTap && onImageTap(i * 2 + 1)}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                height: HEIGHTS_R[i % HEIGHTS_R.length],
                background: theme.surface,
                animation: `fadeSlideIn 0.4s ease ${(i * 2 + 1) * 0.06}s both`,
                cursor: "pointer",
              }}
            >
              <img
                src={url}
                alt={`${maker.name} ${i * 2 + 2}`}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Instagram Tab ────────────────────────────────────
function InstagramTab({ maker, theme }) {
  const handle = maker.instagram_handle || ""
  const cleanHandle = handle.replace("@", "")
  const images = maker.gallery_urls || []

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px" }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: theme.text }}>
            Instagram
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: theme.textMuted, letterSpacing: "0.04em" }}>
            {handle}
          </div>
        </div>
        <a
          href={`https://instagram.com/${cleanHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: theme.textMuted,
            border: `1px solid ${theme.border}`,
            padding: "5px 10px",
            borderRadius: 100,
            textDecoration: "none",
          }}
        >
          View Profile
        </a>
      </div>

      {images.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, padding: "0 12px" }}>
          {images.slice(0, 9).map((url, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: 6,
                overflow: "hidden",
                background: theme.surface,
                animation: `fadeSlideIn 0.35s ease ${i * 0.04}s both`,
              }}
            >
              <img
                src={url}
                alt={`${maker.name} instagram ${i + 1}`}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textMuted, lineHeight: 1.6 }}>
            Visit {handle} on Instagram to see their latest work.
          </p>
        </div>
      )}

      <a
        href={`https://instagram.com/${cleanHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          margin: "12px 16px 0",
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          padding: 14,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: theme.textMuted,
          textDecoration: "none",
        }}
      >
        View all on Instagram
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  )
}

// ─── Events Tab ───────────────────────────────────────
function EventsTab({ maker, theme }) {
  const events = maker.events || []

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 16px 12px" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: theme.text }}>
          Events
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.textMuted }}>
          {events.length} upcoming
        </span>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((event, i) => {
          const date = new Date(event.date)
          const day = date.getDate()
          const month = date.toLocaleString("en", { month: "short" })

          return (
            <div
              key={i}
              onClick={() => safeOpen(event.url)}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                cursor: event.url ? "pointer" : "default",
                animation: `fadeSlideIn 0.35s ease ${i * 0.06}s both`,
              }}
            >
              <div
                style={{
                  width: 56,
                  flexShrink: 0,
                  background: theme.bg,
                  borderRight: `1px solid ${theme.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 6px",
                }}
              >
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
                  {day}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: theme.textMuted, marginTop: 2 }}>
                  {month}
                </div>
              </div>

              <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                {event.tag && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 4 }}>
                    {event.tag}
                  </div>
                )}
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: theme.text, lineHeight: 1.25, marginBottom: 4 }}>
                  {event.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: theme.textMuted, lineHeight: 1.55 }}>
                  {event.time} {event.location && `\u00B7 ${event.location}`}
                  {event.details && <><br />{event.details}</>}
                </div>
                {event.cta && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: theme.textSecondary,
                    marginTop: 8,
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: 1,
                  }}>
                    {event.cta}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Image Modal (Full-screen viewer with swipe/pinch/zoom) ──
function ImageModal({ images, initialIndex, onClose, scrollContainerRef }) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [swipeX, setSwipeX] = useState(0)
  const touchRef = useRef({})
  const imgRef = useRef(null)

  const total = images.length

  // Lock scroll on mount, preserve position on unmount
  useEffect(() => {
    const el = scrollContainerRef?.current
    if (!el) return
    const savedOverflowY = el.style.overflowY
    const savedOverflowX = el.style.overflowX
    el.style.overflowY = "hidden"
    return () => {
      el.style.overflowY = savedOverflowY
      el.style.overflowX = savedOverflowX
    }
  }, [scrollContainerRef])

  const goTo = useCallback((next) => {
    if (next < 0 || next >= total) return
    setIndex(next)
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    setSwipeX(0)
  }, [total])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") goTo(index - 1)
      if (e.key === "ArrowRight") goTo(index + 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, goTo, onClose])

  const onTouchStart = (e) => {
    const t = e.touches
    if (t.length === 2) {
      const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
      touchRef.current = { type: "pinch", initDist: dist, initScale: scale }
    } else if (t.length === 1) {
      touchRef.current = {
        type: scale > 1 ? "pan" : "swipe",
        startX: t[0].clientX,
        startY: t[0].clientY,
        initTranslate: { ...translate },
        moved: false,
      }
    }
  }

  const onTouchMove = (e) => {
    const t = e.touches
    const ref = touchRef.current

    if (ref.type === "pinch" && t.length === 2) {
      e.preventDefault()
      const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
      const newScale = Math.min(4, Math.max(1, ref.initScale * (dist / ref.initDist)))
      setScale(newScale)
      if (newScale <= 1.05) setTranslate({ x: 0, y: 0 })
    } else if (ref.type === "pan" && t.length === 1) {
      e.preventDefault()
      const dx = t[0].clientX - ref.startX
      const dy = t[0].clientY - ref.startY
      setTranslate({ x: ref.initTranslate.x + dx, y: ref.initTranslate.y + dy })
    } else if (ref.type === "swipe" && t.length === 1) {
      const dx = t[0].clientX - ref.startX
      ref.moved = true
      setSwipeX(dx)
    }
  }

  const onTouchEnd = () => {
    const ref = touchRef.current

    if (ref.type === "pinch") {
      if (scale < 1.1) {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      }
    } else if (ref.type === "swipe" && ref.moved) {
      if (swipeX > 60 && index > 0) goTo(index - 1)
      else if (swipeX < -60 && index < total - 1) goTo(index + 1)
      else setSwipeX(0)
    }

    touchRef.current = {}
  }

  // Double-tap to zoom, single-tap to close (when not zoomed)
  const lastTapRef = useRef(0)
  const tapTimerRef = useRef(null)
  const onTap = (e) => {
    // Ignore if it was a swipe/pinch
    if (touchRef.current.moved) return
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double-tap toggle zoom
      clearTimeout(tapTimerRef.current)
      if (scale > 1) {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      } else {
        setScale(2.5)
      }
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
      // Single tap — close if not zoomed (after brief delay to rule out double-tap)
      if (scale <= 1) {
        tapTimerRef.current = setTimeout(() => onClose(), 250)
      }
    }
  }

  const isInteracting = !!touchRef.current.type

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
        touchAction: "none",
      }}
    >
      {/* Backdrop click to close (only when not zoomed) */}
      <div
        onClick={() => scale <= 1 && onClose()}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* Counter */}
      <div style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: "rgba(255,255,255,0.7)",
        zIndex: 3,
        pointerEvents: "none",
      }}>
        {index + 1} / {total}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 3,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Nav arrows (desktop) */}
      {index > 0 && (
        <button
          onClick={() => goTo(index - 1)}
          aria-label="Previous"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 3,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {index < total - 1 && (
        <button
          onClick={() => goTo(index + 1)}
          aria-label="Next"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 3,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image strip */}
      <div
        ref={imgRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onTap}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${total * 100}%`,
            height: "100%",
            transform: scale > 1
              ? `translateX(${-index * (100 / total)}%) scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`
              : `translateX(calc(${-index * (100 / total)}% + ${swipeX}px))`,
            transition: isInteracting ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            willChange: "transform",
          }}
        >
          {images.map((url, i) => (
            <div
              key={i}
              style={{
                width: `${100 / total}%`,
                height: "100%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={url}
                alt={`Image ${i + 1} of ${total}`}
                draggable={false}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Share Modal ──────────────────────────────────────
function ShareModal({ maker, theme, shareUrl, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        aria-label={`Share ${maker.name}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.card,
          borderRadius: "20px 20px 0 0",
          padding: "28px 24px 36px",
          maxWidth: 430,
          width: "100%",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 100, background: theme.border, margin: "0 auto 20px" }} />

        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Share {maker.name}
        </h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textMuted, margin: "0 0 20px" }}>
          Send this maker to a friend
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.surface, borderRadius: 12, padding: "4px 4px 4px 16px", marginBottom: 20 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.textSecondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {shareUrl.replace(/^https?:\/\//, "")}
          </span>
          <button
            onClick={handleCopy}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: copied ? "#22543d" : theme.btnBg,
              color: copied ? "#fff" : theme.btnText,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.2s ease, color 0.2s ease",
              minWidth: 72,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {[
            { label: "Email", icon: "\u2709", action: () => window.open(`mailto:?subject=${encodeURIComponent("Check out " + maker.name + " on maven")}&body=${encodeURIComponent(maker.name + "\n" + maker.bio.slice(0, 100) + "...\n\n" + shareUrl)}`, "_blank", "noopener,noreferrer") },
            { label: "WhatsApp", icon: "\uD83D\uDCAC", action: () => window.open(`https://wa.me/?text=${encodeURIComponent("Check out " + maker.name + " on maven!\n" + shareUrl)}`, "_blank", "noopener,noreferrer") },
            { label: "X", icon: "\uD835\uDD4F", action: () => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent("Check out " + maker.name + " on maven!")}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer") },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={opt.action}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "16px 8px",
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.surface }}
              onMouseLeave={(e) => { e.currentTarget.style.background = theme.card }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{opt.icon}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: theme.textSecondary }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────
export default function MakerProfileV2({ maker, makers = [], onBack, isSaved, onToggleSave, onMakerTap, scrollContainerRef, onLogoTap }) {
  const [showShare, setShowShare] = useState(false)
  const [showCompact, setShowCompact] = useState(false)
  const [compactMenuOpen, setCompactMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("gallery")
  const [viewerIndex, setViewerIndex] = useState(null)
  const heroRef = useRef(null)
  const { theme, isDark } = useTheme()

  const shareUrl = window.location.origin + "/?maker=" + maker.slug
  const visibleTabs = getVisibleTabs(maker)

  // Suggested makers: same category first, then nearest, max 5
  const suggestedMakers = useMemo(() => {
    const others = makers.filter((m) => m.id !== maker.id)
    const sameCategory = others.filter((m) => m.category === maker.category)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    const different = others.filter((m) => m.category !== maker.category)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    return [...sameCategory, ...different].slice(0, 5)
  }, [makers, maker.id, maker.category])

  useEffect(() => {
    const el = scrollContainerRef?.current
    if (!el) return
    const onScroll = () => {
      const heroBottom = heroRef.current?.offsetHeight || 0
      setShowCompact(el.scrollTop > heroBottom - 48)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [scrollContainerRef])

  useEffect(() => {
    setActiveTab("gallery")
  }, [maker.id])

  const pageTitle = `${maker.name} \u2014 ${maker.category} in ${maker.city} | maven`
  const pageDescription = maker.bio.length > 155 ? maker.bio.slice(0, 152) + "..." : maker.bio

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: maker.name,
    description: maker.bio,
    address: { "@type": "PostalAddress", streetAddress: maker.address, addressLocality: maker.city, addressCountry: maker.country },
    geo: { "@type": "GeoCoordinates", latitude: maker.lat, longitude: maker.lng },
    url: shareUrl,
    ...(maker.website_url && { sameAs: [maker.website_url] }),
  }

  return (
    <div style={{ paddingBottom: 20, animation: "fadeSlideIn 0.25s ease" }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="profile" />
        <link rel="canonical" href={shareUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Compact sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, height: 0 }}>
        <div style={{
          background: theme.bg,
          borderBottom: showCompact ? `1px solid ${theme.border}` : "1px solid transparent",
          transform: showCompact ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.3s ease",
          pointerEvents: showCompact ? "auto" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 12px" }}>
            <button
              onClick={onBack}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", background: theme.pill,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 15, color: theme.textSecondary,
              }}
            >
              {"\u2190"}
            </button>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span
                onClick={onLogoTap}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: theme.text, letterSpacing: "-0.02em", cursor: "pointer", flexShrink: 0 }}
              >
                maven
              </span>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: theme.textMuted, flexShrink: 0 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                {maker.name}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0, position: "relative" }}>
              <button
                onClick={() => onToggleSave(maker.id)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none", background: theme.pill,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: isSaved ? "#c53030" : theme.textMuted, transition: "color 0.2s ease",
                }}
              >
                {isSaved ? "\u2665" : "\u2661"}
              </button>
              <button
                onClick={() => setCompactMenuOpen((v) => !v)}
                aria-label="More options"
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none", background: theme.pill,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="3.5" cy="8" r="1.3" fill={theme.textSecondary} />
                  <circle cx="8" cy="8" r="1.3" fill={theme.textSecondary} />
                  <circle cx="12.5" cy="8" r="1.3" fill={theme.textSecondary} />
                </svg>
              </button>
              {compactMenuOpen && (
                <>
                  <div
                    onClick={() => setCompactMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 90 }}
                  />
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: theme.card,
                    borderRadius: 14,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                    minWidth: 180,
                    zIndex: 100,
                    overflow: "hidden",
                    animation: "fadeSlideIn 0.15s ease",
                  }}>
                    {[
                      { label: "Share", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>, action: () => { setCompactMenuOpen(false); setShowShare(true) } },
                      { label: "Directions", icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5zm0 6.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" fill={theme.textSecondary} /></svg>, action: () => { setCompactMenuOpen(false); window.open(/android/i.test(navigator.userAgent) ? `https://www.google.com/maps/dir/?api=1&destination=${maker.lat},${maker.lng}` : `https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`, "_blank", "noopener,noreferrer") } },
                      ...(maker.website_url ? [{ label: "Website", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>, action: () => { setCompactMenuOpen(false); safeOpen(maker.website_url) } }] : []),
                    ].map((item, i, arr) => (
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
                          color: theme.text,
                          borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : "none",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <HeroSection
        maker={maker}
        onBack={onBack}
        onLogoTap={onLogoTap}
        onShare={() => setShowShare(true)}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
        heroRef={heroRef}
        isDark={isDark}
        theme={theme}
      />

      {/* About section — inline, always visible */}
      <AboutSection maker={maker} theme={theme} />

      {/* Tabs — Gallery / Instagram / Events */}
      {visibleTabs.length > 0 && (
        <>
          <ProfileTabs tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />
          <div style={{ minHeight: 120 }}>
            {activeTab === "gallery" && <GalleryTab maker={maker} theme={theme} onImageTap={setViewerIndex} />}
            {activeTab === "instagram" && <InstagramTab maker={maker} theme={theme} />}
            {activeTab === "events" && <EventsTab maker={maker} theme={theme} />}
          </div>
        </>
      )}

      {/* Suggested Makers */}
      {suggestedMakers.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ padding: "0 16px", marginBottom: 14 }}>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 600,
                color: theme.text,
                margin: 0,
              }}
            >
              Suggested
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              overflowX: "auto",
              padding: "0 4px 4px",
              scrollbarWidth: "none",
            }}
          >
            {suggestedMakers.map((m) => (
              <NearbyMakerCard key={m.id} maker={m} onTap={onMakerTap} />
            ))}
          </div>
        </div>
      )}


      {/* Image viewer modal */}
      {viewerIndex !== null && maker.gallery_urls && (
        <ImageModal
          images={maker.gallery_urls}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          scrollContainerRef={scrollContainerRef}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal maker={maker} theme={theme} shareUrl={shareUrl} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
