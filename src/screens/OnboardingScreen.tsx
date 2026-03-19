import { useState, useRef, useCallback } from "react"
import { useTheme } from "../contexts/ThemeContext"
import { getNearestTown } from "../utils/distance"
import { TOWNS } from "../data/towns"
import { font } from "../styles/tokens"

interface UserLocation {
    lat: number
    lng: number
}

interface OnboardingScreenProps {
    onComplete: () => void
    setLocation: (loc: UserLocation | null, label?: string | null, source?: string) => void
}

export default function OnboardingScreen({ onComplete, setLocation }: OnboardingScreenProps) {
    const [step, setStep] = useState(0)
    const [transitioning, setTransitioning] = useState(false)
    const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next")
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const { theme } = useTheme()

    const goTo = useCallback(
        (nextStep: number, direction: "next" | "prev" = "next") => {
            if (transitioning) return
            setSlideDirection(direction)
            setTransitioning(true)
            setTimeout(() => {
                setStep(nextStep)
                setTransitioning(false)
            }, 250)
        },
        [transitioning],
    )

    const goNext = useCallback(() => {
        if (step < 1) goTo(step + 1, "next")
    }, [step, goTo])

    const goPrev = useCallback(() => {
        if (step > 0) goTo(step - 1, "prev")
    }, [step, goTo])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (touchStartX.current === null) return
            const deltaX = e.changedTouches[0].clientX - touchStartX.current
            const deltaY = e.changedTouches[0].clientY - (touchStartY.current ?? 0)
            touchStartX.current = null
            touchStartY.current = null

            if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) return

            if (deltaX < -50 && step < 1) {
                goNext()
            } else if (deltaX > 50 && step > 0) {
                goPrev()
            }
        },
        [step, goNext, goPrev],
    )

    const handleLocationAllow = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    const nearest = getNearestTown(loc.lat, loc.lng, TOWNS)
                    const label = nearest ? nearest.name : "Current location"
                    setLocation(loc, label, "gps")
                    onComplete()
                },
                () => onComplete(),
                { timeout: 10000 },
            )
        } else {
            onComplete()
        }
    }, [onComplete, setLocation])

    const handleLocationSkip = useCallback(() => {
        onComplete()
    }, [onComplete])

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

    const fadeIn = (delay: number): React.CSSProperties => ({
        opacity: 0,
        transform: "translateY(10px)",
        animation: `fadeSlideIn 1.2s ease ${delay}s forwards`,
    })

    const renderWelcome = () => (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                padding: "0 32px",
                gap: 20,
            }}
        >
            <h1
                style={{
                    fontFamily: font.wordmark,
                    fontSize: 40,
                    fontWeight: 700,
                    color: theme.text,
                    margin: 0,
                    letterSpacing: "-0.03em",
                    ...fadeIn(0.1),
                }}
            >
                maven
            </h1>
            <p
                style={{
                    fontFamily: font.body,
                    fontSize: 16,
                    color: theme.textSecondary,
                    margin: 0,
                    textAlign: "center",
                    lineHeight: 1.5,
                    maxWidth: 280,
                    ...fadeIn(0.3),
                }}
            >
                Discover local makers &amp; craftspeople in Galway
            </p>
            <button
                onClick={goNext}
                aria-label="Get started"
                style={{
                    width: "100%",
                    maxWidth: 320,
                    marginTop: 20,
                    padding: "16px 24px",
                    borderRadius: 0,
                    border: "none",
                    background: theme.btnBg,
                    color: theme.btnText,
                    fontFamily: font.body,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                    ...fadeIn(0.5),
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.transform = "scale(0.97)"
                    e.currentTarget.style.opacity = "0.9"
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.opacity = "1"
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.opacity = "1"
                }}
            >
                Get Started
            </button>
        </div>
    )

    const renderLocation = () => (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                padding: "0 32px",
            }}
        >
            <div
                style={{
                    fontSize: 48,
                    lineHeight: 1,
                    marginBottom: 20,
                }}
            >
                {"\u{1F4CD}"}
            </div>
            <h2
                style={{
                    fontFamily: font.heading,
                    fontSize: 24,
                    fontWeight: 800,
                    color: theme.text,
                    margin: "0 0 10px",
                    textAlign: "center",
                }}
            >
                Find makers near you
            </h2>
            <p
                style={{
                    fontFamily: font.body,
                    fontSize: 14,
                    color: theme.textSecondary,
                    margin: "0 0 32px",
                    textAlign: "center",
                    lineHeight: 1.55,
                    maxWidth: 280,
                }}
            >
                Allow location access to find nearby makers and get directions
            </p>
            <button
                onClick={handleLocationAllow}
                aria-label="Allow location access"
                style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: "16px 24px",
                    borderRadius: 0,
                    border: "none",
                    background: theme.btnBg,
                    color: theme.btnText,
                    fontFamily: font.body,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.transform = "scale(0.97)"
                    e.currentTarget.style.opacity = "0.9"
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.opacity = "1"
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.opacity = "1"
                }}
            >
                Allow Location
            </button>
            <button
                onClick={handleLocationSkip}
                aria-label="Skip location access"
                style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    border: "none",
                    background: "transparent",
                    fontFamily: font.body,
                    fontSize: 14,
                    fontWeight: 500,
                    color: theme.textMuted,
                    cursor: "pointer",
                    transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.textSecondary
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.textMuted
                }}
            >
                Not now
            </button>
        </div>
    )

    const screens = [renderWelcome, renderLocation]

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                width: "100%",
                maxWidth: "var(--app-max-width)",
                margin: "0 auto",
                height: "100vh",
                background: theme.bg,
                fontFamily: font.body,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                borderLeft: "var(--app-border)",
                borderRight: "var(--app-border)",
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
        >
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    ...getContentStyle(),
                }}
            >
                {screens[step]()}
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: 48,
                    paddingTop: 24,
                }}
            >
                {[0, 1].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: step === i ? 20 : 8,
                            height: 8,
                            borderRadius: 0,
                            background: step === i ? theme.text : theme.border,
                            transition:
                                "width 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
