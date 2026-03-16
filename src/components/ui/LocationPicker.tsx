import { useState, useRef, useMemo, useCallback } from "react"
import { useTheme } from "../../contexts/ThemeContext"
import useBreakpoint from "../../hooks/useBreakpoint"
import { getNearestTown } from "../../utils/distance"
import type { Town } from "../../utils/distance"
import { TOWNS } from "../../data/towns"

interface LocationPickerProps {
    userLocation: { lat: number; lng: number } | null
    locationLabel: string | null
    locationSource: string | null
    setLocation: (loc: { lat: number; lng: number } | null, label?: string | null, source?: string) => void
    onClose: () => void
}

export default function LocationPicker({
    userLocation,
    locationLabel,
    locationSource,
    setLocation,
    onClose,
}: LocationPickerProps) {
    const { theme } = useTheme()
    const breakpoint = useBreakpoint()
    const [citySearch, setCitySearch] = useState("")
    const [cityError, setCityError] = useState("")
    const [locationUpdating, setLocationUpdating] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const citySuggestions = useMemo(() => {
        const q = citySearch.trim().toLowerCase()
        if (q.length < 1) return []
        return TOWNS.filter((t) => t.name.toLowerCase().startsWith(q))
            .concat(TOWNS.filter((t) => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q)))
            .slice(0, 5)
    }, [citySearch])

    const handleUseCurrentLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setCityError("Geolocation not supported on this device")
            return
        }
        setLocationUpdating(true)
        setCityError("")

        if (navigator.permissions) {
            try {
                const status = await navigator.permissions.query({ name: "geolocation" })
                if (status.state === "denied") {
                    setCityError(
                        "Location is blocked for this site. Tap the lock icon in your address bar, then allow Location and reload the page.",
                    )
                    setLocationUpdating(false)
                    return
                }
            } catch {}
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                const nearest = getNearestTown(loc.lat, loc.lng, TOWNS)
                const label = nearest ? nearest.name : "Current location"
                setLocation(loc, label, "gps")
                setLocationUpdating(false)
                onClose()
            },
            (err) => {
                setCityError(
                    err.code === 1
                        ? "Location is blocked for this site. Tap the lock icon in your address bar, then allow Location and reload the page."
                        : err.code === 3
                          ? "Location request timed out — try again"
                          : "Could not get location — try again",
                )
                setLocationUpdating(false)
            },
            { timeout: 10000, maximumAge: 60000 },
        )
    }, [setLocation, onClose])

    const handleSelectCity = useCallback(
        (town: Town) => {
            setLocation({ lat: town.lat, lng: town.lng }, town.name)
            onClose()
        },
        [setLocation, onClose],
    )

    const isGps = locationSource === "gps"

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                zIndex: 200,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "15vh 20px 24px",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: theme.card,
                    borderRadius: 0,
                    maxWidth: breakpoint === "mobile" ? 380 : 480,
                    width: "100%",
                    animation: "fadeSlideIn 0.2s ease",
                    overflow: "visible",
                    position: "relative",
                }}
            >
                <div style={{ position: "relative" }}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={userLocation ? locationLabel || "Search..." : "Search for a city..."}
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        autoFocus
                        style={{
                            width: "100%",
                            padding: "16px 20px",
                            borderRadius: 0,
                            border: "none",
                            background: "transparent",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 15,
                            fontWeight: 500,
                            color: theme.text,
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                    />

                    {/* GPS option */}
                    <div style={{ borderTop: `1px solid ${theme.border}` }}>
                        <div
                            onClick={handleUseCurrentLocation}
                            style={{
                                padding: "13px 20px",
                                cursor: locationUpdating ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                opacity: locationUpdating ? 0.5 : 1,
                                background: isGps ? theme.surface : "transparent",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                                <circle cx="7" cy="7" r="2.5" fill={isGps ? theme.text : theme.textMuted} />
                                <circle
                                    cx="7"
                                    cy="7"
                                    r="6"
                                    stroke={isGps ? theme.text : theme.textMuted}
                                    strokeWidth="1.2"
                                    fill="none"
                                />
                                <line
                                    x1="7"
                                    y1="0"
                                    x2="7"
                                    y2="2.5"
                                    stroke={isGps ? theme.text : theme.textMuted}
                                    strokeWidth="1.2"
                                />
                                <line
                                    x1="7"
                                    y1="11.5"
                                    x2="7"
                                    y2="14"
                                    stroke={isGps ? theme.text : theme.textMuted}
                                    strokeWidth="1.2"
                                />
                                <line
                                    x1="0"
                                    y1="7"
                                    x2="2.5"
                                    y2="7"
                                    stroke={isGps ? theme.text : theme.textMuted}
                                    strokeWidth="1.2"
                                />
                                <line
                                    x1="11.5"
                                    y1="7"
                                    x2="14"
                                    y2="7"
                                    stroke={isGps ? theme.text : theme.textMuted}
                                    strokeWidth="1.2"
                                />
                            </svg>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: isGps ? 600 : 500,
                                    color: isGps ? theme.text : theme.textSecondary,
                                }}
                            >
                                {locationUpdating ? "Finding you..." : "Use current location"}
                            </span>
                            {isGps && (
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    style={{ marginLeft: "auto", flexShrink: 0 }}
                                >
                                    <path
                                        d="M2.5 7L5.5 10L11.5 4"
                                        stroke={theme.text}
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </div>
                        {cityError && (
                            <div
                                style={{
                                    padding: "8px 20px 12px",
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    color: "#9b2c2c",
                                    lineHeight: 1.4,
                                }}
                            >
                                {cityError}
                            </div>
                        )}
                    </div>

                    {/* Town suggestions */}
                    {citySuggestions.length > 0 && (
                        <div style={{ borderTop: `1px solid ${theme.border}` }}>
                            {citySuggestions.map((town, i) => (
                                <div
                                    key={town.name + town.county}
                                    onClick={() => handleSelectCity(town)}
                                    style={{
                                        padding: "13px 20px",
                                        cursor: "pointer",
                                        borderBottom:
                                            i < citySuggestions.length - 1 ? `1px solid ${theme.border}` : "none",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        background: locationLabel === town.name ? theme.surface : "transparent",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: theme.text,
                                        }}
                                    >
                                        {town.name}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 12,
                                            color: theme.textMuted,
                                        }}
                                    >
                                        {town.name === town.county ? "" : `Co. ${town.county}`}
                                    </span>
                                    {locationLabel === town.name && (
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 14 14"
                                            fill="none"
                                            style={{ marginLeft: "auto", flexShrink: 0 }}
                                        >
                                            <path
                                                d="M2.5 7L5.5 10L11.5 4"
                                                stroke={theme.text}
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
