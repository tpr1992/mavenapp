import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"
import type { Maker } from "../types"

interface UserLocation {
    lat: number
    lng: number
}

export default function useMakers(userLocation: UserLocation | null) {
    const [rawMakers, setRawMakers] = useState<Maker[]>([])
    const [popularity, setPopularity] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fetchedRef = useRef(false)

    const fetchMakers = useCallback(async () => {
        setLoading(true)
        setError(null)

        const [makersResult, popResult] = await Promise.all([
            supabase
                .from("makers")
                .select(
                    "id, slug, name, bio, category, city, county, address, country, lat, lng, hero_color, avatar_url, gallery_urls, website_url, instagram_handle, opening_hours, is_featured, is_spotlight, spotlight_quote, is_verified, made_in_ireland, years_active, events",
                ),
            supabase.rpc("get_maker_popularity"),
        ])

        if (makersResult.error) {
            setError(makersResult.error.message)
            setLoading(false)
            return
        }

        // Build popularity lookup { maker_id: score }
        const popMap: Record<string, number> = {}
        if (popResult.data) {
            for (const row of popResult.data as Array<{ maker_id: string; score: string }>) {
                popMap[row.maker_id] = Number(row.score)
            }
        }

        setRawMakers(makersResult.data as Maker[])
        setPopularity(popMap)
        setLoading(false)
    }, [])

    // Fetch once — makers data doesn't change during a session
    useEffect(() => {
        if (fetchedRef.current) return
        fetchedRef.current = true
        fetchMakers()
    }, [fetchMakers])

    const refetch = useCallback(() => {
        fetchedRef.current = false
        fetchMakers()
    }, [fetchMakers])

    // Recompute distances and blend popularity into sort order
    const makers = useMemo(() => {
        if (!rawMakers.length) return rawMakers

        if (userLocation) {
            // With location: sort by 2km distance bands, then popularity within band
            return rawMakers
                .map((maker) => ({
                    ...maker,
                    distance: getDistance(userLocation.lat, userLocation.lng, maker.lat, maker.lng),
                    score: popularity[maker.id] || 0,
                }))
                .sort((a, b) => {
                    const bandA = Math.floor(a.distance / 0.2)
                    const bandB = Math.floor(b.distance / 0.2)
                    if (bandA !== bandB) return bandA - bandB
                    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0)
                    return a.name.localeCompare(b.name)
                })
        }

        // No location — sort by popularity, alphabetical tiebreaker
        return rawMakers
            .map((maker) => ({
                ...maker,
                distance: null,
                score: popularity[maker.id] || 0,
            }))
            .sort((a, b) => {
                if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0)
                return a.name.localeCompare(b.name)
            })
    }, [rawMakers, userLocation, popularity])

    return { makers, loading, error, refetch }
}
