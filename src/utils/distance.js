/**
 * Calculate distance between two coordinates using the Haversine formula.
 * @returns distance in km, rounded to 1 decimal place
 */
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Format a distance (in km) for display.
 * Follows Google/Apple Maps conventions:
 *   < 1 km  → meters, rounded to nearest 10 (e.g. "350 m")
 *   < 10 km → 1 decimal place (e.g. "1.3 km", "8.7 km")
 *   ≥ 10 km → whole number (e.g. "34 km", "72 km")
 */
export function formatDistance(km) {
    if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`
    if (km < 10) return `${Math.round(km * 10) / 10} km`
    return `${Math.round(km)} km`
}

/**
 * Format location label for a maker on Discover.
 *   < 50 km  → "1.3 km · Spiddal"  (city name, nearby)
 *   ≥ 50 km  → "72 km · Co. Donegal"  (county, far away)
 *   no distance → city name
 */
export function formatLocation(maker) {
    if (maker.distance == null) return maker.city
    const dist = formatDistance(maker.distance)
    if (maker.distance >= 50 && maker.county) return `${dist} \u00B7 Co. ${maker.county}`
    return `${dist} \u00B7 ${maker.city}`
}

/**
 * Format location name only (no distance) for carousels.
 *   < 50 km  → "Spiddal"
 *   ≥ 50 km  → "Co. Donegal"
 *   no distance → city name
 */
export function formatLocationName(maker, { full = false } = {}) {
    if (maker.distance != null && maker.distance >= 50 && maker.county)
        return full ? `County ${maker.county}` : `Co. ${maker.county}`
    return maker.city
}

/**
 * Find the nearest town from a list given GPS coordinates.
 * @returns the closest town object, or null
 */
export function getNearestTown(lat, lng, towns) {
    let nearest = null
    let minDist = Infinity
    for (const town of towns) {
        const d = getDistance(lat, lng, town.lat, town.lng)
        if (d < minDist) {
            minDist = d
            nearest = town
        }
    }
    return nearest
}
