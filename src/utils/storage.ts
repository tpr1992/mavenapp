// Batch localStorage reader — reads all app keys once on module load,
// then serves reads from an in-memory cache. Writes go through to both
// the cache and localStorage (write-through).

const APP_KEYS = [
    "maven_dark_mode",
    "debug_mode",
    "maven_onboarding_complete",
    "maven_feed_layout",
    "maven_user_location",
    "maven_user_location_label",
    "maven_location_source",
    "maven_location_ts",
    "maven_visitor_id",
    "maven-recent-searches",
    "maven_recently_viewed",
] as const

type AppKey = (typeof APP_KEYS)[number]

const cache: Map<string, string | null> = new Map()

// Single batch read on module load
try {
    for (const key of APP_KEYS) {
        cache.set(key, localStorage.getItem(key))
    }
} catch {
    // SSR or localStorage unavailable — cache stays empty (all nulls)
}

export function storageGet(key: AppKey): string | null {
    if (cache.has(key)) return cache.get(key) ?? null
    return null
}

export function storageSet(key: AppKey, value: string): void {
    cache.set(key, value)
    try {
        localStorage.setItem(key, value)
    } catch {
        // quota exceeded or unavailable — cache is still updated
    }
}

export function storageRemove(key: AppKey): void {
    cache.set(key, null)
    try {
        localStorage.removeItem(key)
    } catch {
        // unavailable — cache is still updated
    }
}
