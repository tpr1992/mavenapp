import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"
import {
    compositeScore,
    velocityScore,
    LOW_DATA_MAKER_THRESHOLD,
    LOW_DATA_CLICK_THRESHOLD,
    MIN_POPULARITY_BASELINE,
} from "../utils/scoring"
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

        // Compute p95 clicks for popularity normalization
        const clickValues = Object.values(clickStats)
            .map((s) => s.current_week_clicks)
            .sort((a, b) => a - b)
        const p95Idx = Math.floor((clickValues.length - 1) * 0.95)
        const p95 = Math.max(MIN_POPULARITY_BASELINE, clickValues[p95Idx] || 1)

        // Detect low-data mode: fewer than N makers with meaningful clicks
        const makersWithClicks = Object.values(clickStats).filter(
            (s) => s.current_week_clicks >= LOW_DATA_CLICK_THRESHOLD,
        ).length
        const isLowData = makersWithClicks < LOW_DATA_MAKER_THRESHOLD

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
                p95Clicks: p95,
                isLowData,
            })

            const vel = velocityScore(currentWeek, previousWeek)

            return {
                ...maker,
                distance: dist,
                score,
                velocity: vel,
                currentWeekClicks: currentWeek,
                previousWeekClicks: previousWeek,
            }
        })

        // Debug: log scoring breakdown
        console.log(`\n📊 p95 current-week clicks: ${p95}`)
        console.log(
            `Scoring mode: ${isLowData ? "LOW-DATA (55% prox)" : "NORMAL (35% prox)"} | makers w/ ≥${LOW_DATA_CLICK_THRESHOLD} clicks: ${makersWithClicks}/${rawMakers.length}`,
        )
        console.table(
            scored
                .slice()
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((m) => ({
                    name: m.name,
                    dist: m.distance != null ? `${m.distance.toFixed(1)}km` : "—",
                    curr: m.currentWeekClicks,
                    prev: m.previousWeekClicks,
                    vel: m.velocity?.toFixed(3),
                    pop: Math.min(1, m.currentWeekClicks / p95).toFixed(3),
                    score: m.score?.toFixed(4),
                })),
        )

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
