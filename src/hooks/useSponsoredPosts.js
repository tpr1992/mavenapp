import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "../lib/supabase"
import { getDistance } from "../utils/distance"

/**
 * Fetches active sponsored posts and filters by user location if geo-targeted.
 *
 * Placement rules:
 * - Ads never appear in the first 2 grid positions
 * - Ads are spaced evenly throughout the feed (every N makers)
 * - Ordered by priority (highest first)
 * - Geo-targeted ads only show if user is within radius_km
 */

const MIN_POSITION = 7          // earliest grid slot an ad can appear (1-indexed)
const SPACING = 10              // minimum makers between ads

export default function useSponsoredPosts(userLocation) {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetch() {
      // RLS policy already filters: is_active=true AND within date range
      const { data, error } = await supabase
        .from("sponsored_posts")
        .select("id, brand, tagline, image_url, link_url, tile_height, priority, target_lat, target_lng, radius_km")
        .order("priority", { ascending: false })

      if (!error && data) setAds(data)
      setLoading(false)
    }

    fetch()
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
  const placements = useMemo(() => {
    if (!activeAds.length) return []
    return activeAds.map((ad, i) => ({
      ...ad,
      afterItem: MIN_POSITION + i * SPACING,
    }))
  }, [activeAds])

  return { sponsoredPosts: placements, loading }
}
