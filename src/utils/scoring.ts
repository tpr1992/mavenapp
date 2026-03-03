/**
 * Discovery feed scoring utilities.
 *
 * Composite score = weighted blend of proximity, click velocity,
 * raw popularity, and freshness boost for new makers.
 */

/**
 * Smooth proximity score: 1.0 at 0 km, ~0.5 at 5 km, ~0.1 at 20 km.
 * Uses inverse-square decay: 1 / (1 + (d/5)²)
 */
export function proximityScore(distanceKm: number | null | undefined): number {
    if (distanceKm == null) return 0
    return 1 / (1 + (distanceKm / 5) ** 2)
}

/**
 * Week-over-week click growth, capped at [0, 3].
 * - 0 previous + >0 current → new momentum, capped at 3.0
 * - 0 previous + 0 current → no signal
 * - Growth % capped at 300% to prevent single-click spikes dominating
 */
export function velocityScore(currentWeek: number, previousWeek: number): number {
    if (currentWeek === 0 && previousWeek === 0) return 0
    if (previousWeek === 0) return Math.min(currentWeek, 3)
    const growth = (currentWeek - previousWeek) / previousWeek
    return Math.max(0, Math.min(growth, 3))
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
    maxCurrentWeekClicks: number
}

/**
 * Weighted composite score. Each component is normalized to [0, 1].
 *
 *   0.35 proximity  — location is king for local discovery
 *   0.30 velocity   — rewards momentum, not incumbency
 *   0.15 raw popularity — stabilizing baseline (normalized to max)
 *   0.20 freshness  — meaningful but temporary boost for new makers
 */
export function compositeScore(input: ScoringInput): number {
    const prox = proximityScore(input.distanceKm)
    const vel = velocityScore(input.currentWeekClicks, input.previousWeekClicks) / 3
    const raw = input.maxCurrentWeekClicks > 0 ? input.currentWeekClicks / input.maxCurrentWeekClicks : 0
    const fresh = freshnessBoost(input.createdAt)

    return 0.35 * prox + 0.3 * vel + 0.15 * raw + 0.2 * fresh
}
