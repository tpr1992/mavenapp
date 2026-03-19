/**
 * Discovery feed scoring utilities.
 *
 * Composite score = weighted blend of proximity, engagement (exponential decay),
 * and freshness boost for new makers.
 *
 * Engagement uses exponential decay (half-life = 7 days) computed server-side
 * from raw click timestamps. No cron job — decay is fresh on every read.
 *
 * The nearby makers carousel owns proximity-first discovery, so the main grid
 * prioritizes engagement and freshness to surface what's resonating.
 */

// Tuning constants
export const LOW_DATA_MAKER_THRESHOLD = 15
export const LOW_DATA_CLICK_THRESHOLD = 10
export const MIN_ENGAGEMENT_BASELINE = 3.0

// Weight profiles — engagement dominates, proximity is a gentle tiebreaker
export const WEIGHTS = { proximity: 0.15, engagement: 0.55, freshness: 0.3 }
export const WEIGHTS_LOW_DATA = { proximity: 0.25, engagement: 0.3, freshness: 0.45 }

/**
 * Smooth proximity score: 1.0 at 0 km, ~0.5 at 15 km, ~0.1 at 50 km.
 * Flatter curve since proximity is now a tiebreaker, not a primary signal.
 */
export function proximityScore(distanceKm: number | null | undefined): number {
    if (distanceKm == null) return 0
    return 1 / (1 + (distanceKm / 15) ** 2)
}

/**
 * Tiered freshness boost — rewards new makers with diminishing impact over time.
 *
 * Days 0–7:    1.0  (brand new — maximum visibility)
 * Days 8–14:   0.8  (still fresh — strong boost)
 * Days 15–30:  0.55 (settling in — moderate boost)
 * Days 31–60:  0.3  (established but still relatively new)
 * Days 61–90:  0.15 (gentle nudge, almost baseline)
 * Days 91+:    0.0  (no boost — lives or dies on engagement)
 */
export function freshnessBoost(createdAt: string | undefined): number {
    if (!createdAt) return 0
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays <= 7) return 1.0
    if (ageDays <= 14) return 0.8
    if (ageDays <= 30) return 0.55
    if (ageDays <= 60) return 0.3
    if (ageDays <= 90) return 0.15
    return 0
}

export interface ScoringInput {
    distanceKm: number | null | undefined
    engagementScore: number
    createdAt: string | undefined
    p95Engagement: number
    isLowData: boolean
}

/**
 * Weighted composite score. Each component is normalized to [0, 1].
 *
 * Standard weights:
 *   0.15 proximity   — gentle local bias (nearby carousel handles proximity-first discovery)
 *   0.55 engagement  — exponential decay of clicks (half-life 7 days) — what's resonating
 *   0.30 freshness   — 90-day tiered decay boost for new makers
 *
 * Low-data weights shift towards freshness when the platform
 * has insufficient click data to rely on engagement signals.
 */
export function compositeScore(input: ScoringInput): number {
    const w = input.isLowData ? WEIGHTS_LOW_DATA : WEIGHTS
    const prox = proximityScore(input.distanceKm)
    const eng = input.p95Engagement > 0 ? Math.min(1, input.engagementScore / input.p95Engagement) : 0
    const fresh = freshnessBoost(input.createdAt)

    // When location is unavailable, redistribute proximity weight to engagement + freshness
    // so the initial render sorts by meaningful signals instead of wasting 15% on zeros
    if (input.distanceKm == null) {
        const engShare = w.engagement / (w.engagement + w.freshness)
        const freshShare = w.freshness / (w.engagement + w.freshness)
        return engShare * eng + freshShare * fresh
    }

    return w.proximity * prox + w.engagement * eng + w.freshness * fresh
}
