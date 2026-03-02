import { useState, useRef, useCallback } from "react"
import { useTheme } from "../contexts/ThemeContext"
import { getNearestTown } from "../utils/distance"
import { TOWNS } from "../data/towns"

const CATEGORIES = [
  { name: "Clothing", emoji: "\u{1F457}" },
  { name: "Objects", emoji: "\u2726" },
  { name: "Art", emoji: "\u{1F3A8}" },
]

export default function OnboardingScreen({ onComplete, setLocation }) {
  const [step, setStep] = useState(0)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [transitioning, setTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState("next")
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const { theme } = useTheme()

  const goTo = useCallback((nextStep, direction = "next") => {
    if (transitioning) return
    setSlideDirection(direction)
    setTransitioning(true)
    setTimeout(() => {
      setStep(nextStep)
      setTransitioning(false)
    }, 250)
  }, [transitioning])

  const goNext = useCallback(() => {
    if (step < 2) goTo(step + 1, "next")
  }, [step, goTo])

  const goPrev = useCallback(() => {
    if (step > 0) goTo(step - 1, "prev")
  }, [step, goTo])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) return

    if (deltaX < -50 && step < 2) {
      goNext()
    } else if (deltaX > 50 && step > 0) {
      goPrev()
    }
  }, [step, goNext, goPrev])

  const toggleCategory = useCallback((name) => {
    setSelectedCategories((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : [...prev, name]
    )
  }, [])

  const handleLocationAllow = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          const nearest = getNearestTown(loc.lat, loc.lng, TOWNS)
          const label = nearest ? nearest.name : "Current location"
          setLocation(loc, label, "gps")
          onComplete(selectedCategories)
        },
        () => onComplete(selectedCategories),
        { timeout: 10000 }
      )
    } else {
      onComplete(selectedCategories)
    }
  }, [onComplete, selectedCategories, setLocation])

  const handleLocationSkip = useCallback(() => {
    onComplete(selectedCategories)
  }, [onComplete, selectedCategories])

  // Transition styles
  const getContentStyle = () => {
    if (!transitioning) {
      return {
        opacity: 1,
        transform: "translateX(0)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }
    }
    const offset = slideDirection === "next" ? "-30px" : "30px"
    return {
      opacity: 0,
      transform: `translateX(${offset})`,
      transition: "opacity 0.2s ease, transform 0.2s ease",
    }
  }

  const renderWelcome = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: "0 32px",
      gap: 20,
    }}>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 40,
        fontWeight: 700,
        color: theme.text,
        margin: 0,
        letterSpacing: "-0.03em",
      }}>
        maven
      </h1>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 16,
        color: theme.textSecondary,
        margin: 0,
        textAlign: "center",
        lineHeight: 1.5,
        maxWidth: 280,
      }}>
        Discover local makers &amp; craftspeople in Galway
      </p>
      <button
        onClick={goNext}
        style={{
          width: "100%",
          maxWidth: 320,
          marginTop: 20,
          padding: "16px 24px",
          borderRadius: 100,
          border: "none",
          background: theme.btnBg,
          color: theme.btnText,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
          transition: "transform 0.15s ease, opacity 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; e.currentTarget.style.opacity = "0.9" }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
      >
        Get Started
      </button>
    </div>
  )

  const renderCategories = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flex: 1,
      padding: "0 28px",
      justifyContent: "center",
    }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 24,
        fontWeight: 700,
        color: theme.text,
        margin: "0 0 8px",
        letterSpacing: "-0.02em",
        textAlign: "center",
      }}>
        What interests you?
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        color: theme.textMuted,
        margin: "0 0 28px",
        textAlign: "center",
      }}>
        Pick as many as you like
      </p>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "center",
        maxWidth: 340,
        marginBottom: 32,
      }}>
        {CATEGORIES.map(({ name, emoji }) => {
          const isSelected = selectedCategories.includes(name)
          return (
            <button
              key={name}
              onClick={() => toggleCategory(name)}
              style={{
                width: 100,
                padding: "20px 12px",
                borderRadius: 16,
                border: `1.5px solid ${isSelected ? theme.text : theme.border}`,
                background: isSelected ? theme.surface : theme.card,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
                transform: isSelected ? "scale(1.03)" : "scale(1)",
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? theme.text : theme.textSecondary,
                letterSpacing: "0.01em",
              }}>
                {name}
              </span>
            </button>
          )
        })}
        {(() => {
          const allSelected = selectedCategories.length === CATEGORIES.length
          return (
            <button
              onClick={() => setSelectedCategories(allSelected ? [] : CATEGORIES.map((c) => c.name))}
              style={{
                width: 100,
                padding: "20px 12px",
                borderRadius: 16,
                border: `1.5px solid ${allSelected ? theme.text : theme.border}`,
                background: allSelected ? theme.surface : theme.card,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
                transform: allSelected ? "scale(1.03)" : "scale(1)",
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{"\u2728"}</span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: allSelected ? 600 : 500,
                color: allSelected ? theme.text : theme.textSecondary,
                letterSpacing: "0.01em",
              }}>
                All
              </span>
            </button>
          )
        })()}
      </div>
      <button
        onClick={goNext}
        style={{
          width: "100%",
          maxWidth: 320,
          padding: "16px 24px",
          borderRadius: 100,
          border: "none",
          background: theme.btnBg,
          color: theme.btnText,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
          transition: "transform 0.15s ease, opacity 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; e.currentTarget.style.opacity = "0.9" }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
      >
        Continue
      </button>
    </div>
  )

  const renderLocation = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: "0 32px",
    }}>
      <div style={{
        fontSize: 48,
        lineHeight: 1,
        marginBottom: 20,
      }}>
        {"\u{1F4CD}"}
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 24,
        fontWeight: 700,
        color: theme.text,
        margin: "0 0 10px",
        letterSpacing: "-0.02em",
        textAlign: "center",
      }}>
        Find makers near you
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        color: theme.textSecondary,
        margin: "0 0 32px",
        textAlign: "center",
        lineHeight: 1.55,
        maxWidth: 280,
      }}>
        Allow location access to find nearby makers and get directions
      </p>
      <button
        onClick={handleLocationAllow}
        style={{
          width: "100%",
          maxWidth: 320,
          padding: "16px 24px",
          borderRadius: 100,
          border: "none",
          background: theme.btnBg,
          color: theme.btnText,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
          transition: "transform 0.15s ease, opacity 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; e.currentTarget.style.opacity = "0.9" }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
      >
        Allow Location
      </button>
      <button
        onClick={handleLocationSkip}
        style={{
          marginTop: 12,
          padding: "8px 16px",
          border: "none",
          background: "transparent",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: theme.textMuted,
          cursor: "pointer",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = theme.textSecondary }}
        onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted }}
      >
        Not now
      </button>
    </div>
  )

  const screens = [renderWelcome, renderCategories, renderLocation]

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        height: "100vh",
        background: theme.bg,
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        borderLeft: `1px solid ${theme.border}`,
        borderRight: `1px solid ${theme.border}`,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Main content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        ...getContentStyle(),
      }}>
        {screens[step]()}
      </div>

      {/* Step dots */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        paddingBottom: 48,
        paddingTop: 24,
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: step === i ? 20 : 8,
              height: 8,
              borderRadius: 100,
              background: step === i ? theme.text : theme.border,
              transition: "all 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
