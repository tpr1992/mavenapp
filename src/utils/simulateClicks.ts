import { supabase } from "../lib/supabase"
import type { Maker } from "../types"

// Constants (from scripts/simulate-clicks.js)
const DAY_MS = 24 * 60 * 60 * 1000
const BUCKET_MS = 15 * 60 * 1000

// Makers that always get high traffic in simulations
const BOOSTED_MAKERS = ["Doolin Leather", "Fia & Thread"]

export type Scenario = "launch" | "trending" | "low-data" | "even"

// Helpers

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomTimestamp(now: number, daysAgoMin: number, daysAgoMax: number): Date {
    const ms = now - randomInt(daysAgoMin * DAY_MS, daysAgoMax * DAY_MS)
    return new Date(ms)
}

function toBucket(date: Date): Date {
    return new Date(Math.floor(date.getTime() / BUCKET_MS) * BUCKET_MS)
}

interface Click {
    maker_id: string
    visitor_id: string
    clicked_at: string
    click_bucket: string
}

function generateClicks(now: number, makerId: string, count: number, daysAgoMin: number, daysAgoMax: number): Click[] {
    const clicks: Click[] = []
    for (let i = 0; i < count; i++) {
        const clickedAt = randomTimestamp(now, daysAgoMin, daysAgoMax)
        clicks.push({
            maker_id: makerId,
            visitor_id: crypto.randomUUID(),
            clicked_at: clickedAt.toISOString(),
            click_bucket: toBucket(clickedAt).toISOString(),
        })
    }
    return clicks
}

// Deterministic maker ordering — boosted makers first, then sorted by ID
function stableMakers(makers: Maker[]): Maker[] {
    const sorted = [...makers].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    const boosted = sorted.filter((m) => BOOSTED_MAKERS.includes(m.name))
    const rest = sorted.filter((m) => !BOOSTED_MAKERS.includes(m.name))
    return [...boosted, ...rest]
}

// Scenario definitions (identical logic to scripts/simulate-clicks.js)

function scenarioLaunch(makers: Maker[]): Click[] {
    const now = Date.now()
    const stable = stableMakers(makers)
    const clicks: Click[] = []

    // 5 high traffic (trending candidates) — includes boosted makers
    for (const m of stable.slice(0, 5)) {
        clicks.push(...generateClicks(now, m.id, randomInt(50, 90), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(15, 30), 7, 14))
    }

    // 12 moderate traffic
    for (const m of stable.slice(5, 17)) {
        clicks.push(...generateClicks(now, m.id, randomInt(15, 40), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(10, 25), 7, 14))
    }

    // 10 light traffic
    for (const m of stable.slice(17, 27)) {
        clicks.push(...generateClicks(now, m.id, randomInt(5, 14), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(3, 10), 7, 14))
    }

    // Rest: minimal (1-4 clicks)
    for (const m of stable.slice(27)) {
        clicks.push(...generateClicks(now, m.id, randomInt(1, 4), 0, 14))
    }

    return clicks
}

function scenarioTrending(makers: Maker[]): Click[] {
    const now = Date.now()
    const stable = stableMakers(makers)
    const clicks: Click[] = []

    // 5 explosive growth
    for (const m of stable.slice(0, 5)) {
        clicks.push(...generateClicks(now, m.id, randomInt(40, 80), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(5, 10), 7, 14))
    }

    // 5 flat popular
    for (const m of stable.slice(5, 10)) {
        clicks.push(...generateClicks(now, m.id, randomInt(30, 40), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(30, 40), 7, 14))
    }

    // 5 declining
    for (const m of stable.slice(10, 15)) {
        clicks.push(...generateClicks(now, m.id, randomInt(8, 12), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(35, 45), 7, 14))
    }

    // Rest: noise
    for (const m of stable.slice(15)) {
        const total = randomInt(0, 3)
        if (total > 0) clicks.push(...generateClicks(now, m.id, total, 0, 14))
    }

    return clicks
}

function scenarioLowData(makers: Maker[]): Click[] {
    const now = Date.now()
    const stable = stableMakers(makers)
    const clicks: Click[] = []

    // Only 8 makers get clicks
    for (const m of stable.slice(0, 8)) {
        clicks.push(...generateClicks(now, m.id, randomInt(5, 18), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(3, 10), 7, 14))
    }

    return clicks
}

function scenarioEven(makers: Maker[]): Click[] {
    const now = Date.now()
    const stable = stableMakers(makers)
    const clicks: Click[] = []

    // 1 outlier
    clicks.push(...generateClicks(now, stable[0].id, randomInt(150, 200), 0, 7))
    clicks.push(...generateClicks(now, stable[0].id, randomInt(50, 80), 7, 14))

    // Rest: even spread
    for (const m of stable.slice(1)) {
        clicks.push(...generateClicks(now, m.id, randomInt(10, 30), 0, 7))
        clicks.push(...generateClicks(now, m.id, randomInt(8, 20), 7, 14))
    }

    return clicks
}

const SCENARIOS: Record<Scenario, (makers: Maker[]) => Click[]> = {
    launch: scenarioLaunch,
    trending: scenarioTrending,
    "low-data": scenarioLowData,
    even: scenarioEven,
}

// Public API

export async function resetClicks(): Promise<void> {
    const { error } = await supabase.rpc("debug_reset_clicks")
    if (error) throw new Error(`Reset failed: ${error.message}`)
}

export async function simulateScenario(scenario: Scenario, makers: Maker[]): Promise<number> {
    // Reset first
    await resetClicks()

    // Generate clicks
    const clicks = SCENARIOS[scenario](makers)

    // Insert in batches of 500
    const BATCH_SIZE = 500
    for (let i = 0; i < clicks.length; i += BATCH_SIZE) {
        const batch = clicks.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.rpc("debug_bulk_insert_clicks", { p_clicks: batch })
        if (error) throw new Error(`Bulk insert failed at offset ${i}: ${error.message}`)
    }

    return clicks.length
}
