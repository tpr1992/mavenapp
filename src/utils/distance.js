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
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Format a distance (in km) for display.
 * Under 0.1 km → shows meters (e.g. "80 m"), otherwise km with 1 decimal.
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km * 10) / 10} km`
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
