/**
 * Discovery feed scoring utilities.
 *
 * Composite score = weighted blend of proximity, click velocity,
 * raw popularity, and freshness boost for new makers.
 */

// Tuning constants — adjust as real data builds
export const SMOOTHING_K = 10
export const VOLUME_THRESHOLD = 25
export const LOW_DATA_MAKER_THRESHOLD = 15
export const LOW_DATA_CLICK_THRESHOLD = 10
export const TRENDING_MIN_CURRENT = 10
export const TRENDING_MIN_COMBINED = 25
export const MIN_POPULARITY_BASELINE = 10

// Weight profiles
export const WEIGHTS = { proximity: 0.35, momentum: 0.3, freshness: 0.2, popularity: 0.15 }
export const WEIGHTS_LOW_DATA = { proximity: 0.55, momentum: 0.1, freshness: 0.25, popularity: 0.1 }

/**
 * Smooth proximity score: 1.0 at 0 km, ~0.5 at 5 km, ~0.1 at 20 km.
 * Uses inverse-square decay: 1 / (1 + (d/5)²)
 */
export function proximityScore(distanceKm: number | null | undefined): number {
    if (distanceKm == null) return 0
    return 1 / (1 + (distanceKm / 5) ** 2)
}

/**
 * Log-ratio momentum with volume gating.
 * Uses smoothed log ratio to dampen noise at low volumes,
 * multiplied by a volume factor that ramps from 0→1 as
 * currentWeek approaches VOLUME_THRESHOLD.
 */
export function velocityScore(currentWeek: number, previousWeek: number): number {
    if (currentWeek === 0 && previousWeek === 0) return 0
    const logRatio = Math.log((currentWeek + SMOOTHING_K) / (previousWeek + SMOOTHING_K))
    const volumeFactor = Math.min(1, currentWeek / VOLUME_THRESHOLD)
    return Math.max(0, Math.min(logRatio * volumeFactor, 1))
}

/**
 * Linear decay from 1.0 → 0.0 over 30 days. Makers older than 30 days get 0.
 */
export function freshnessBoost(createdAt: string | undefined): number {
    if (!createdAt) return 0
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > 30) return 0
    return 1 - ageDays / 30
}

export interface ScoringInput {
    distanceKm: number | null | undefined
    currentWeekClicks: number
    previousWeekClicks: number
    createdAt: string | undefined
    p95Clicks: number
    isLowData: boolean
}

/**
 * Weighted composite score. Each component is normalized to [0, 1].
 *
 * Standard weights:
 *   0.35 proximity  — location is king for local discovery
 *   0.30 momentum   — rewards momentum via log-ratio + volume gating
 *   0.15 popularity — stabilizing baseline (normalized to p95)
 *   0.20 freshness  — meaningful but temporary boost for new makers
 *
 * Low-data weights shift towards proximity and freshness when
 * the platform has insufficient click data to rely on.
 */
export function compositeScore(input: ScoringInput): number {
    const w = input.isLowData ? WEIGHTS_LOW_DATA : WEIGHTS
    const prox = proximityScore(input.distanceKm)
    const vel = velocityScore(input.currentWeekClicks, input.previousWeekClicks)
    const raw = input.p95Clicks > 0 ? Math.min(1, input.currentWeekClicks / input.p95Clicks) : 0
    const fresh = freshnessBoost(input.createdAt)

    return w.proximity * prox + w.momentum * vel + w.popularity * raw + w.freshness * fresh
}
