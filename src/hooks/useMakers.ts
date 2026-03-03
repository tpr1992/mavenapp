import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"
import { compositeScore, velocityScore } from "../utils/scoring"
import { interleavedByCategory } from "../utils/interleave"
import type { Maker, MakerClickStats } from "../types"

interface UserLocation {
    lat: number
    lng: number
}

export default function useMakers(userLocation: UserLocation | null) {
    const [rawMakers, setRawMakers] = useState<Maker[]>([])
    const [clickStats, setClickStats] = useState<Record<string, MakerClickStats>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fetchedRef = useRef(false)

    const fetchMakers = useCallback(async () => {
        setLoading(true)
        setError(null)

        const [makersResult, statsResult] = await Promise.all([
            supabase
                .from("makers")
                .select(
                    "id, slug, name, bio, category, city, county, address, country, lat, lng, hero_color, avatar_url, gallery_urls, website_url, instagram_handle, opening_hours, is_featured, is_spotlight, spotlight_quote, is_verified, made_in_ireland, years_active, events, created_at",
                ),
            supabase.rpc("get_maker_click_stats"),
        ])

        if (makersResult.error) {
            setError(makersResult.error.message)
            setLoading(false)
            return
        }

        // Build click stats lookup { maker_id: { current_week_clicks, previous_week_clicks } }
        const statsMap: Record<string, MakerClickStats> = {}
        if (statsResult.data) {
            for (const row of statsResult.data as Array<{
                maker_id: string
                current_week_clicks: string
                previous_week_clicks: string
            }>) {
                statsMap[row.maker_id] = {
                    maker_id: row.maker_id,
                    current_week_clicks: Number(row.current_week_clicks),
                    previous_week_clicks: Number(row.previous_week_clicks),
                }
            }
        }

        setRawMakers(makersResult.data as Maker[])
        setClickStats(statsMap)
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

    // Compute composite scores, sort, and interleave categories
    const makers = useMemo(() => {
        if (!rawMakers.length) return rawMakers

        // Find max current-week clicks for normalization
        const maxClicks = Math.max(1, ...Object.values(clickStats).map((s) => s.current_week_clicks))

        const scored = rawMakers.map((maker) => {
            const stats = clickStats[maker.id]
            const currentWeek = stats?.current_week_clicks ?? 0
            const previousWeek = stats?.previous_week_clicks ?? 0
            const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, maker.lat, maker.lng) : null

            const score = compositeScore({
                distanceKm: dist,
                currentWeekClicks: currentWeek,
                previousWeekClicks: previousWeek,
                createdAt: maker.created_at,
                maxCurrentWeekClicks: maxClicks,
            })

            const vel = velocityScore(currentWeek, previousWeek)

            return { ...maker, distance: dist, score, velocity: vel }
        })

        // Sort by composite score descending, alphabetical tiebreaker
        scored.sort((a, b) => {
            if (b.score !== a.score) return (b.score ?? 0) - (a.score ?? 0)
            return a.name.localeCompare(b.name)
        })

        // Post-sort: prevent 3+ consecutive same-category makers
        return interleavedByCategory(scored)
    }, [rawMakers, userLocation, clickStats])

    return { makers, loading, error, refetch }
}
