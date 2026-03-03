import type { Maker } from "../types"

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`
    if (km < 10) return `${Math.round(km * 10) / 10} km`
    return `${Math.round(km)} km`
}

export function formatLocation(maker: Pick<Maker, "distance" | "city" | "county">): string {
    if (maker.distance == null) return maker.city
    const dist = formatDistance(maker.distance)
    if (maker.distance >= 50 && maker.county) return `${dist} \u00B7 Co. ${maker.county}`
    return `${dist} \u00B7 ${maker.city}`
}

export function formatLocationName(maker: Pick<Maker, "distance" | "city" | "county">, { full = false } = {}): string {
    if (maker.distance != null && maker.distance >= 50 && maker.county)
        return full ? `County ${maker.county}` : `Co. ${maker.county}`
    return maker.city
}

export interface Town {
    name: string
    county: string
    lat: number
    lng: number
}

export function getNearestTown(lat: number, lng: number, towns: Town[]): Town | null {
    let nearest: Town | null = null
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
