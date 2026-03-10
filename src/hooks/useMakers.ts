import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"
import {
    compositeScore,
    LOW_DATA_MAKER_THRESHOLD,
    LOW_DATA_CLICK_THRESHOLD,
    MIN_ENGAGEMENT_BASELINE,
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

        // Build click stats lookup
        const statsMap: Record<string, MakerClickStats> = {}
        if (statsResult.data) {
            for (const row of statsResult.data as Array<{
                maker_id: string
                current_week_clicks: string
                previous_week_clicks: string
                engagement_score: string
            }>) {
                const engScore = Number(row.engagement_score)
                statsMap[row.maker_id] = {
                    maker_id: row.maker_id,
                    current_week_clicks: Number(row.current_week_clicks),
                    previous_week_clicks: Number(row.previous_week_clicks),
                    // Falls back to current_week_clicks if RPC hasn't been migrated yet
                    engagement_score: isNaN(engScore) ? Number(row.current_week_clicks) : engScore,
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
    const { makers, p95Engagement, isLowData, makersWithClicks } = useMemo(() => {
        if (!rawMakers.length) return { makers: rawMakers, p95Engagement: 0, isLowData: false, makersWithClicks: 0 }

        // Compute p95 engagement for normalization
        const engagementValues = Object.values(clickStats)
            .map((s) => s.engagement_score)
            .sort((a, b) => a - b)
        const p95Idx = Math.floor((engagementValues.length - 1) * 0.95)
        const p95Engagement = Math.max(MIN_ENGAGEMENT_BASELINE, engagementValues[p95Idx] || 1)

        // Detect low-data mode: fewer than N makers with meaningful clicks
        const makersWithClicks = Object.values(clickStats).filter(
            (s) => s.current_week_clicks >= LOW_DATA_CLICK_THRESHOLD,
        ).length
        const isLowData = makersWithClicks < LOW_DATA_MAKER_THRESHOLD

        const scored = rawMakers.map((maker) => {
            const stats = clickStats[maker.id]
            const engagement = stats?.engagement_score ?? 0
            const currentWeek = stats?.current_week_clicks ?? 0
            const previousWeek = stats?.previous_week_clicks ?? 0
            const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, maker.lat, maker.lng) : null

            const score = compositeScore({
                distanceKm: dist,
                engagementScore: engagement,
                createdAt: maker.created_at,
                p95Engagement,
                isLowData,
            })

            return {
                ...maker,
                distance: dist,
                score,
                engagementScore: engagement,
                currentWeekClicks: currentWeek,
                previousWeekClicks: previousWeek,
            }
        })

        // Debug: log scoring breakdown (dev only)
        if (import.meta.env.DEV) {
            console.log(`\n📊 p95 engagement: ${p95Engagement.toFixed(2)}`)
            console.log(
                `Scoring mode: ${isLowData ? "LOW-DATA (55% prox)" : "NORMAL (40% prox)"} | makers w/ ≥${LOW_DATA_CLICK_THRESHOLD} clicks: ${makersWithClicks}/${rawMakers.length}`,
            )
            console.table(
                scored
                    .slice()
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map((m) => ({
                        nm: m.name,
                        km: m.distance != null ? m.distance.toFixed(1) : "—",
                        eng: m.engagementScore?.toFixed(2),
                        cur: m.currentWeekClicks,
                        prv: m.previousWeekClicks,
                        scr: m.score?.toFixed(4),
                    })),
            )
        }

        // Sort by composite score descending, alphabetical tiebreaker
        scored.sort((a, b) => {
            if (b.score !== a.score) return (b.score ?? 0) - (a.score ?? 0)
            return a.name.localeCompare(b.name)
        })

        // Post-sort: prevent 3+ consecutive same-category makers
        const ranked = scored.map((m, i) => ({ ...m, rank: i + 1 }))

        return { makers: interleavedByCategory(ranked), p95Engagement, isLowData, makersWithClicks }
    }, [rawMakers, userLocation, clickStats])

    return {
        makers,
        loading,
        error,
        refetch,
        p95Engagement,
        isLowData,
        makersWithClicks,
        totalMakers: rawMakers.length,
    }
}
