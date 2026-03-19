import { describe, it, expect } from "vitest"
import { proximityScore, freshnessBoost, compositeScore, WEIGHTS, WEIGHTS_LOW_DATA } from "../scoring"

describe("proximityScore", () => {
    it("returns 1.0 at 0 km", () => {
        expect(proximityScore(0)).toBe(1)
    })

    it("returns ~0.5 at 15 km", () => {
        const score = proximityScore(15)
        expect(score).toBeGreaterThan(0.45)
        expect(score).toBeLessThan(0.55)
    })

    it("returns ~0.1 at 50 km", () => {
        const score = proximityScore(50)
        expect(score).toBeGreaterThan(0.05)
        expect(score).toBeLessThan(0.15)
    })

    it("approaches 0 at very large distances", () => {
        expect(proximityScore(500)).toBeLessThan(0.01)
    })

    it("returns 0 for null", () => {
        expect(proximityScore(null)).toBe(0)
    })

    it("returns 0 for undefined", () => {
        expect(proximityScore(undefined)).toBe(0)
    })

    it("is monotonically decreasing", () => {
        const distances = [0, 0.5, 1, 2, 5, 10, 15, 20, 30, 50, 100]
        for (let i = 1; i < distances.length; i++) {
            expect(proximityScore(distances[i])).toBeLessThan(proximityScore(distances[i - 1]))
        }
    })

    it("always returns a value between 0 and 1", () => {
        const testValues = [0, 0.001, 0.1, 1, 5, 10, 50, 100, 1000]
        for (const d of testValues) {
            const s = proximityScore(d)
            expect(s).toBeGreaterThanOrEqual(0)
            expect(s).toBeLessThanOrEqual(1)
        }
    })
})

describe("freshnessBoost", () => {
    function daysAgo(n: number): string {
        return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
    }

    it("returns 1.0 for a maker created today", () => {
        expect(freshnessBoost(new Date().toISOString())).toBe(1.0)
    })

    it("returns 1.0 at day 3", () => {
        expect(freshnessBoost(daysAgo(3))).toBe(1.0)
    })

    it("returns 0.8 at day 10", () => {
        expect(freshnessBoost(daysAgo(10))).toBe(0.8)
    })

    it("returns 0.55 at day 20", () => {
        expect(freshnessBoost(daysAgo(20))).toBe(0.55)
    })

    it("returns 0.3 at day 45", () => {
        expect(freshnessBoost(daysAgo(45))).toBe(0.3)
    })

    it("returns 0.15 at day 75", () => {
        expect(freshnessBoost(daysAgo(75))).toBe(0.15)
    })

    it("returns 0 at day 91+", () => {
        expect(freshnessBoost(daysAgo(91))).toBe(0)
        expect(freshnessBoost(daysAgo(365))).toBe(0)
    })

    it("returns 0 for undefined", () => {
        expect(freshnessBoost(undefined)).toBe(0)
    })

    it("is monotonically non-increasing over time", () => {
        const days = [0, 3, 7, 8, 14, 15, 30, 31, 60, 61, 90, 91, 180]
        for (let i = 1; i < days.length; i++) {
            expect(freshnessBoost(daysAgo(days[i]))).toBeLessThanOrEqual(freshnessBoost(daysAgo(days[i - 1])))
        }
    })

    it("steps down at each tier boundary", () => {
        expect(freshnessBoost(daysAgo(7))).toBeGreaterThan(freshnessBoost(daysAgo(8)))
        expect(freshnessBoost(daysAgo(14))).toBeGreaterThan(freshnessBoost(daysAgo(15)))
        expect(freshnessBoost(daysAgo(30))).toBeGreaterThan(freshnessBoost(daysAgo(31)))
        expect(freshnessBoost(daysAgo(60))).toBeGreaterThan(freshnessBoost(daysAgo(61)))
        expect(freshnessBoost(daysAgo(90))).toBeGreaterThan(freshnessBoost(daysAgo(91)))
    })
})

describe("compositeScore", () => {
    const base = {
        distanceKm: 1 as number | null,
        engagementScore: 10,
        createdAt: undefined as string | undefined,
        p95Engagement: 20,
        isLowData: false,
    }

    it("returns a value between 0 and 1", () => {
        const score = compositeScore(base)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
    })

    it("returns 0 for zero-signal maker (no engagement, old, no location)", () => {
        const score = compositeScore({
            distanceKm: null,
            engagementScore: 0,
            createdAt: new Date(2020, 0, 1).toISOString(),
            p95Engagement: 20,
            isLowData: false,
        })
        expect(score).toBe(0)
    })

    it("normal weights sum to 1.0", () => {
        const sum = WEIGHTS.proximity + WEIGHTS.engagement + WEIGHTS.freshness
        expect(sum).toBeCloseTo(1.0)
    })

    it("low-data weights sum to 1.0", () => {
        const sum = WEIGHTS_LOW_DATA.proximity + WEIGHTS_LOW_DATA.engagement + WEIGHTS_LOW_DATA.freshness
        expect(sum).toBeCloseTo(1.0)
    })

    it("new maker with no clicks still scores well (freshness carries)", () => {
        const score = compositeScore({
            distanceKm: 1,
            engagementScore: 0,
            createdAt: new Date().toISOString(),
            p95Engagement: 20,
            isLowData: false,
        })
        expect(score).toBeGreaterThan(0.25)
    })

    it("active maker far away scores lower than active maker nearby", () => {
        const near = compositeScore({ ...base, distanceKm: 1, engagementScore: 15 })
        const far = compositeScore({ ...base, distanceKm: 50, engagementScore: 15 })
        expect(near).toBeGreaterThan(far)
    })

    it("high engagement far away beats low engagement nearby", () => {
        const highFar = compositeScore({ ...base, distanceKm: 30, engagementScore: 19 })
        const lowNear = compositeScore({ ...base, distanceKm: 1, engagementScore: 2 })
        expect(highFar).toBeGreaterThan(lowNear)
    })

    it("redistributes proximity weight when location is null", () => {
        const noLoc = compositeScore({ ...base, distanceKm: null })
        expect(noLoc).toBeGreaterThan(0)
        expect(Number.isFinite(noLoc)).toBe(true)
    })

    it("low-data mode produces different scores than normal mode", () => {
        const fresh = new Date().toISOString()
        const normal = compositeScore({ ...base, createdAt: fresh, isLowData: false })
        const lowData = compositeScore({ ...base, createdAt: fresh, isLowData: true })
        expect(lowData).not.toBe(normal)
    })

    it("caps engagement contribution at 1.0 even with very high scores", () => {
        const normal = compositeScore({ ...base, engagementScore: 20, p95Engagement: 20 })
        const extreme = compositeScore({ ...base, engagementScore: 200, p95Engagement: 20 })
        expect(extreme).toBeLessThanOrEqual(1)
        expect(Math.abs(extreme - normal)).toBeLessThan(0.01)
    })
})
