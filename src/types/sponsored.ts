export interface SponsoredPost {
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
    afterItem: number
}
