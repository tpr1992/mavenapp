export interface OpeningHours {
    [day: string]: string // e.g. "10-17" or "Closed"
}

export interface MakerEvent {
    name: string
    date: string
    time: string
    location?: string
    details?: string
    tag?: string
    cta?: string
    url?: string
}

export interface Maker {
    id: string
    name: string
    slug: string
    bio: string
    category: string
    city: string
    county: string
    address: string
    lat: number
    lng: number
    country: string
    years_active: number
    avatar_url: string | null
    gallery_urls: string[]
    hero_color: string
    is_verified: boolean
    is_featured: boolean
    is_spotlight?: boolean
    spotlight_quote?: string
    quote_attribution?: string | null
    website_url: string | null
    instagram_handle: string | null
    opening_hours: OpeningHours | null
    made_in_ireland: boolean
    is_messageable?: boolean
    user_id?: string | null
    events?: MakerEvent[] | null
    created_at?: string
    /** Distance from user's current location in km. Computed at runtime by useMakers — never stored in DB. */
    distance?: number | null
    score?: number
    velocity?: number
    currentWeekClicks?: number
    previousWeekClicks?: number
    engagementScore?: number
    rank?: number
}

export interface MakerClickStats {
    maker_id: string
    current_week_clicks: number
    previous_week_clicks: number
    engagement_score: number
}
