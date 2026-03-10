/**
 * Discovery feed scoring utilities.
 *
 * Composite score = weighted blend of proximity, engagement (exponential decay),
 * and freshness boost for new makers.
 *
 * Engagement uses exponential decay (half-life = 7 days) computed server-side
 * from raw click timestamps. No cron job — decay is fresh on every read.
 * This replaces the old velocity + popularity signals with a single unified metric.
 */

// Tuning constants
export const LOW_DATA_MAKER_THRESHOLD = 15
export const LOW_DATA_CLICK_THRESHOLD = 10
export const MIN_ENGAGEMENT_BASELINE = 3.0

// Weight profiles — engagement replaces both momentum + popularity
export const WEIGHTS = { proximity: 0.4, engagement: 0.4, freshness: 0.2 }
export const WEIGHTS_LOW_DATA = { proximity: 0.55, engagement: 0.2, freshness: 0.25 }

/**
 * Smooth proximity score: 1.0 at 0 km, ~0.5 at 5 km, ~0.1 at 20 km.
 * Uses inverse-square decay: 1 / (1 + (d/5)²)
 */
export function proximityScore(distanceKm: number | null | undefined): number {
    if (distanceKm == null) return 0
    return 1 / (1 + (distanceKm / 5) ** 2)
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
    engagementScore: number
    createdAt: string | undefined
    p95Engagement: number
    isLowData: boolean
}

/**
 * Weighted composite score. Each component is normalized to [0, 1].
 *
 * Standard weights:
 *   0.40 proximity   — location is king for local discovery
 *   0.40 engagement  — exponential decay of clicks (half-life 7 days)
 *   0.20 freshness   — temporary boost for new makers (30-day linear decay)
 *
 * Low-data weights shift towards proximity and freshness when
 * the platform has insufficient click data to rely on.
 */
export function compositeScore(input: ScoringInput): number {
    const w = input.isLowData ? WEIGHTS_LOW_DATA : WEIGHTS
    const prox = proximityScore(input.distanceKm)
    const eng = input.p95Engagement > 0 ? Math.min(1, input.engagementScore / input.p95Engagement) : 0
    const fresh = freshnessBoost(input.createdAt)

    return w.proximity * prox + w.engagement * eng + w.freshness * fresh
}
