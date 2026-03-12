import { useState, useEffect, useCallback } from "react"
import { getNearestTown } from "../utils/distance"
import { TOWNS } from "../data/towns"
import { storageGet, storageSet, storageRemove } from "../utils/storage"

const STORAGE_KEY = "maven_user_location" as const
const LABEL_KEY = "maven_user_location_label" as const
const SOURCE_KEY = "maven_location_source" as const // "gps" | "manual"
const TIMESTAMP_KEY = "maven_location_ts" as const
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface UserLocation {
    lat: number
    lng: number
}

export default function useUserLocation() {
    const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
        try {
            const stored = storageGet(STORAGE_KEY)
            if (!stored) return null
            // Expire GPS locations after 24 hours
            const ts = parseInt(storageGet(TIMESTAMP_KEY) || "0", 10)
            if (ts && Date.now() - ts > MAX_AGE_MS) {
                storageRemove(STORAGE_KEY)
                storageRemove(LABEL_KEY)
                storageRemove(SOURCE_KEY)
                storageRemove(TIMESTAMP_KEY)
                return null
            }
            return JSON.parse(stored)
        } catch {
            return null
        }
    })
    const [locationLabel, setLocationLabel] = useState<string | null>(() => {
        try {
            return storageGet(LABEL_KEY) || null
        } catch {
            return null
        }
    })
    const [locationSource, setLocationSource] = useState<string | null>(() => {
        try {
            return storageGet(SOURCE_KEY) || null
        } catch {
            return null
        }
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const source = storageGet(SOURCE_KEY)

        // If user manually picked a city, respect that — don't override with GPS
        if (source === "manual") {
            setLoading(false)
            return
        }

        // Don't auto-request GPS before onboarding — let the onboarding
        // location step trigger the browser permission prompt instead
        if (!storageGet("maven_onboarding_complete")) {
            setLoading(false)
            return
        }

        if (!navigator.geolocation) {
            setLoading(false)
            return
        }

        // Always refresh GPS for auto-detected locations.
        // Keep any cached location as fallback while waiting / if GPS fails.
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc: UserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                setUserLocation(loc)
                storageSet(STORAGE_KEY, JSON.stringify(loc))
                storageSet(SOURCE_KEY, "gps")
                storageSet(TIMESTAMP_KEY, String(Date.now()))
                const nearest = getNearestTown(loc.lat, loc.lng, TOWNS)
                const label = nearest ? nearest.name : "Current location"
                storageSet(LABEL_KEY, label)
                setLocationLabel(label)
                setLocationSource("gps")
                setLoading(false)
            },
            () => {
                // GPS failed — keep whatever was already in state from localStorage init
                setLoading(false)
            },
            { timeout: 10000, maximumAge: 60000 },
        )
    }, [])

    const setLocation = useCallback((loc: UserLocation | null, label?: string | null, source = "manual") => {
        if (loc) {
            storageSet(STORAGE_KEY, JSON.stringify(loc))
            storageSet(LABEL_KEY, label || "Custom location")
            storageSet(SOURCE_KEY, source)
            storageSet(TIMESTAMP_KEY, String(Date.now()))
            setUserLocation(loc)
            setLocationLabel(label || "Custom location")
            setLocationSource(source)
        } else {
            storageRemove(STORAGE_KEY)
            storageRemove(LABEL_KEY)
            storageRemove(SOURCE_KEY)
            storageRemove(TIMESTAMP_KEY)
            setUserLocation(null)
            setLocationLabel(null)
            setLocationSource(null)
        }
    }, [])

    return { userLocation, locationLabel, locationSource, loading, setLocation }
}
