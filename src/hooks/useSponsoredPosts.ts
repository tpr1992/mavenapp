import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"
import type { SponsoredPost } from "../types"

interface UserLocation {
    lat: number
    lng: number
}

interface SponsoredPostRow {
    id: string
    brand: string
    tagline: string
    image_url: string
    link_url: string
    tile_height?: number
    priority?: number
    target_lat?: number | null
    target_lng?: number | null
    radius_km?: number | null
}

const MIN_POSITION = 7 // earliest grid slot an ad can appear (1-indexed)
const SPACING = 10 // minimum makers between ads

export default function useSponsoredPosts(userLocation: UserLocation | null) {
    const [ads, setAds] = useState<SponsoredPostRow[]>([])
    const [loading, setLoading] = useState(true)
    const fetchedRef = useRef(false)

    useEffect(() => {
        if (fetchedRef.current) return
        fetchedRef.current = true

        async function fetchAds() {
            // RLS policy already filters: is_active=true AND within date range
            const { data, error } = await supabase
                .from("sponsored_posts")
                .select(
                    "id, brand, tagline, image_url, link_url, tile_height, priority, target_lat, target_lng, radius_km",
                )
                .order("priority", { ascending: false })

            if (!error && data) setAds(data as SponsoredPostRow[])
            setLoading(false)
        }

        fetchAds()
    }, [])

    // Filter by geo-targeting if user has location
    const activeAds = useMemo(() => {
        return ads.filter((ad) => {
            // No geo-target set = show everywhere
            if (ad.target_lat == null || ad.target_lng == null || ad.radius_km == null) return true
            // No user location = skip geo-targeted ads
            if (!userLocation) return false
            // Check if user is within radius
            const dist = getDistance(userLocation.lat, userLocation.lng, ad.target_lat, ad.target_lng)
            return dist <= ad.radius_km
        })
    }, [ads, userLocation])

    // Compute placement positions: which maker index each ad follows
    const placements: SponsoredPost[] = useMemo(() => {
        if (!activeAds.length) return []
        return activeAds.map((ad, i) => ({
            ...ad,
            afterItem: MIN_POSITION + i * SPACING,
        }))
    }, [activeAds])

    return { sponsoredPosts: placements, loading }
}
