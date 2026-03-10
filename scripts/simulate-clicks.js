/**
 * Click simulation script — generates realistic click patterns for testing
 * the discovery feed scoring algorithm and trending carousel.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/simulate-clicks.js
 *   node scripts/simulate-clicks.js --scenario=trending
 *   node scripts/simulate-clicks.js --reset --scenario=launch
 */

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

// Scoring constants (from src/utils/scoring.ts)
const SMOOTHING_K = 10
const VOLUME_THRESHOLD = 25

// Fetch makers from Supabase instead of importing TS files
async function fetchMakers(sb) {
  const { data, error } = await sb.from("makers").select("id, name, category")
  if (error) {
    console.error("Failed to fetch makers:", error.message)
    process.exit(1)
  }
  return data
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
  process.exit(1)
}

const supabase = createClient(url, key)

// Parse CLI args
const args = process.argv.slice(2)
const scenario = (args.find((a) => a.startsWith("--scenario="))?.split("=")[1]) || "launch"
const doReset = args.includes("--reset")

const VALID_SCENARIOS = ["launch", "trending", "low-data", "even"]
if (!VALID_SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario: ${scenario}. Valid: ${VALID_SCENARIOS.join(", ")}`)
  process.exit(1)
}

// Helpers

const NOW = Date.now()
const DAY_MS = 24 * 60 * 60 * 1000
const BUCKET_MS = 15 * 60 * 1000

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomTimestamp(daysAgoMin, daysAgoMax) {
  const ms = NOW - randomInt(daysAgoMin * DAY_MS, daysAgoMax * DAY_MS)
  return new Date(ms)
}

function toBucket(date) {
  return new Date(Math.floor(date.getTime() / BUCKET_MS) * BUCKET_MS)
}

function generateClicks(makerId, count, daysAgoMin, daysAgoMax) {
  const clicks = []
  for (let i = 0; i < count; i++) {
    const clickedAt = randomTimestamp(daysAgoMin, daysAgoMax)
    clicks.push({
      maker_id: makerId,
      visitor_id: randomUUID(),
      clicked_at: clickedAt.toISOString(),
      click_bucket: toBucket(clickedAt).toISOString(),
    })
  }
  return clicks
}

// Makers that should always get high traffic in simulations
const BOOSTED_MAKERS = ["Doolin Leather", "Fia & Thread"]

// Deterministic maker ordering — same makers land in each tier every run
// Boosted makers are moved to the front so they always land in the top tier
function stableMakers(MAKERS) {
  const sorted = [...MAKERS].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const boosted = sorted.filter((m) => BOOSTED_MAKERS.includes(m.name))
  const rest = sorted.filter((m) => !BOOSTED_MAKERS.includes(m.name))
  return [...boosted, ...rest]
}

// Scenario definitions

function scenarioLaunch(MAKERS) {
  const makers = stableMakers(MAKERS)
  const clicks = []

  // 5 high traffic (trending candidates) — includes boosted makers
  for (const m of makers.slice(0, 5)) {
    clicks.push(...generateClicks(m.id, randomInt(50, 90), 0, 7)) // current week
    clicks.push(...generateClicks(m.id, randomInt(15, 30), 7, 14)) // previous week
  }

  // 12 moderate traffic — enough to push past low-data threshold (≥15 makers with ≥10 clicks)
  for (const m of makers.slice(5, 17)) {
    clicks.push(...generateClicks(m.id, randomInt(15, 40), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(10, 25), 7, 14))
  }

  // 10 light traffic — casual browsers
  for (const m of makers.slice(17, 27)) {
    clicks.push(...generateClicks(m.id, randomInt(5, 14), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(3, 10), 7, 14))
  }

  // 13 minimal (1-4 clicks) — long tail
  for (const m of makers.slice(27)) {
    clicks.push(...generateClicks(m.id, randomInt(1, 4), 0, 14))
  }

  return clicks
}

function scenarioTrending(MAKERS) {
  const makers = stableMakers(MAKERS)
  const clicks = []

  // 5 explosive growth
  for (const m of makers.slice(0, 5)) {
    clicks.push(...generateClicks(m.id, randomInt(40, 80), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(5, 10), 7, 14))
  }

  // 5 flat popular
  for (const m of makers.slice(5, 10)) {
    clicks.push(...generateClicks(m.id, randomInt(30, 40), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(30, 40), 7, 14))
  }

  // 5 declining
  for (const m of makers.slice(10, 15)) {
    clicks.push(...generateClicks(m.id, randomInt(8, 12), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(35, 45), 7, 14))
  }

  // Rest: noise
  for (const m of makers.slice(15)) {
    const total = randomInt(0, 3)
    if (total > 0) clicks.push(...generateClicks(m.id, total, 0, 14))
  }

  return clicks
}

function scenarioLowData(MAKERS) {
  const makers = stableMakers(MAKERS)
  const clicks = []

  // Only 8 makers get clicks
  for (const m of makers.slice(0, 8)) {
    clicks.push(...generateClicks(m.id, randomInt(5, 18), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(3, 10), 7, 14))
  }

  return clicks
}

function scenarioEven(MAKERS) {
  const makers = stableMakers(MAKERS)
  const clicks = []

  // 1 outlier
  clicks.push(...generateClicks(makers[0].id, randomInt(150, 200), 0, 7))
  clicks.push(...generateClicks(makers[0].id, randomInt(50, 80), 7, 14))

  // Rest: even spread
  for (const m of makers.slice(1)) {
    clicks.push(...generateClicks(m.id, randomInt(10, 30), 0, 7))
    clicks.push(...generateClicks(m.id, randomInt(8, 20), 7, 14))
  }

  return clicks
}

const SCENARIOS = {
  launch: scenarioLaunch,
  trending: scenarioTrending,
  "low-data": scenarioLowData,
  even: scenarioEven,
}

// Insert clicks in batches

async function insertClicks(clicks) {
  const BATCH_SIZE = 500
  let inserted = 0

  for (let i = 0; i < clicks.length; i += BATCH_SIZE) {
    const batch = clicks.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from("maker_clicks").insert(batch)
    if (error) {
      console.error(`Batch insert failed at offset ${i}:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
  }

  return inserted
}

// Compute and print summary

function printSummary(clicks, MAKERS) {
  const currStart = NOW - 7 * DAY_MS
  const prevStart = NOW - 14 * DAY_MS

  // Aggregate per maker (same week windows as prod)
  const stats = new Map()
  for (const c of clicks) {
    const ts = new Date(c.clicked_at).getTime()
    let week = null
    if (ts >= currStart) week = "curr"
    else if (ts >= prevStart) week = "prev"
    if (!week) continue
    if (!stats.has(c.maker_id)) stats.set(c.maker_id, { curr: 0, prev: 0 })
    stats.get(c.maker_id)[week]++
  }

  // Build rows with velocity
  const rows = []
  for (const [makerId, { curr, prev }] of stats) {
    const maker = MAKERS.find((m) => m.id === makerId)
    if (!maker) continue
    const logRatio = Math.log((curr + SMOOTHING_K) / (prev + SMOOTHING_K))
    const volumeFactor = Math.min(1, curr / VOLUME_THRESHOLD)
    const velocity = Math.max(0, Math.min(logRatio * volumeFactor, 1))
    const trendingEligible = curr >= 10 || curr + prev >= 25
    const trending = trendingEligible && velocity > 0
    rows.push({ name: maker.name, category: maker.category, prev, curr, velocity, trending })
  }

  rows.sort((a, b) => b.velocity - a.velocity)

  // Count unique makers
  const makerCount = stats.size

  console.log(`\nScenario: ${scenario} (reset: ${doReset ? "yes" : "no"})`)
  console.log(`Inserted ${clicks.length} clicks for ${makerCount} makers\n`)

  // Table header
  const pad = (s, n) => String(s).padEnd(n)
  const padL = (s, n) => String(s).padStart(n)
  console.log(
    `${pad("Name", 28)} ${pad("Category", 12)} ${padL("Prev", 6)} ${padL("Curr", 6)} ${padL("Velocity", 10)} ${"Trending?"}`,
  )
  console.log("-".repeat(75))

  for (const r of rows) {
    console.log(
      `${pad(r.name, 28)} ${pad(r.category, 12)} ${padL(r.prev, 6)} ${padL(r.curr, 6)} ${padL(r.velocity.toFixed(2), 10)} ${r.trending ? "yes" : ""}`,
    )
  }
}

// Main

async function main() {
  if (doReset) {
    console.log("Resetting maker_clicks...")
    const { error } = await supabase.from("maker_clicks").delete().gte("clicked_at", "1970-01-01")
    if (error) {
      console.error("Reset failed:", error.message)
      process.exit(1)
    }
    console.log("Cleared all click data.")
  }

  const MAKERS = await fetchMakers(supabase)
  console.log(`Fetched ${MAKERS.length} makers from Supabase.`)

  console.log(`Generating clicks for scenario: ${scenario}...`)
  const clicks = SCENARIOS[scenario](MAKERS)

  await insertClicks(clicks)
  printSummary(clicks, MAKERS)
}

main()
