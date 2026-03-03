# Scoring Hardening & Click Fraud Prevention — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the discovery feed scoring with click fraud prevention, Bayesian velocity smoothing, and 95th percentile popularity normalization.

**Architecture:** Three independent improvements to the existing scoring pipeline. Click fraud adds a new RPC + visitor util. Velocity and popularity changes are isolated to `scoring.ts` and `useMakers.ts`. No new dependencies.

**Tech Stack:** React 19, TypeScript, Supabase (PostgreSQL RPC), Vite

---

### Task 1: Create visitor ID utility

**Files:**
- Create: `src/utils/visitor.ts`

**Step 1: Create `getVisitorId()`**

```ts
let cachedId: string | null = null

export function getVisitorId(): string {
    if (cachedId) return cachedId

    if (typeof window === "undefined" || !window.localStorage) {
        cachedId = crypto.randomUUID()
        return cachedId
    }

    const stored = localStorage.getItem("maven_visitor_id")
    if (stored) {
        cachedId = stored
        return stored
    }

    const id = crypto.randomUUID()
    localStorage.setItem("maven_visitor_id", id)
    cachedId = id
    return id
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/utils/visitor.ts
git commit -m "feat: add visitor ID utility for click deduplication"
```

---

### Task 2: Update click tracking in App.tsx

**Files:**
- Modify: `src/App.tsx:1-4` (imports) and `src/App.tsx:85-86` (click tracking)

**Step 1: Add import**

At the top of `App.tsx`, add:
```ts
import { getVisitorId } from "./utils/visitor"
```

**Step 2: Replace bare insert with RPC call**

Change line 86 from:
```ts
supabase.from("maker_clicks").insert({ maker_id: maker.id }).then()
```
To:
```ts
supabase.rpc("record_maker_click", { p_maker_id: maker.id, p_visitor_id: getVisitorId() }).then()
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: use record_maker_click RPC with visitor ID"
```

---

### Task 3: Provide SQL for user to run

**This task is informational — the user must run these in the Supabase SQL Editor.**

Present the following SQL statements to the user, one at a time:

**Statement 1: Schema migration**
```sql
ALTER TABLE maker_clicks
  ADD COLUMN IF NOT EXISTS visitor_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  ADD COLUMN IF NOT EXISTS click_bucket timestamptz NOT NULL DEFAULT to_timestamp(floor(extract(epoch from now()) / 900) * 900);

CREATE UNIQUE INDEX IF NOT EXISTS maker_clicks_dedup ON maker_clicks (maker_id, visitor_id, click_bucket);
```

**Statement 2: New RPC**
```sql
CREATE OR REPLACE FUNCTION record_maker_click(p_maker_id text, p_visitor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_count int;
  bucket timestamptz;
BEGIN
  bucket := to_timestamp(floor(extract(epoch from now()) / 900) * 900);

  INSERT INTO maker_clicks (maker_id, visitor_id, click_bucket, clicked_at)
  VALUES (p_maker_id, p_visitor_id, bucket, now())
  ON CONFLICT (maker_id, visitor_id, click_bucket) DO NOTHING;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION record_maker_click(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_maker_click(text, uuid) TO anon, authenticated;
```

**Statement 3: Harden existing RPC**
```sql
CREATE OR REPLACE FUNCTION get_maker_click_stats()
RETURNS TABLE (maker_id text, current_week_clicks bigint, previous_week_clicks bigint)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mc.maker_id,
    COUNT(*) FILTER (WHERE mc.clicked_at >= now() - interval '7 days') AS current_week_clicks,
    COUNT(*) FILTER (WHERE mc.clicked_at >= now() - interval '14 days'
      AND mc.clicked_at < now() - interval '7 days') AS previous_week_clicks
  FROM maker_clicks mc GROUP BY mc.maker_id;
$$;

REVOKE ALL ON FUNCTION get_maker_click_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_maker_click_stats() TO anon, authenticated;
```

Wait for user confirmation that all three ran successfully before proceeding.

---

### Task 4: Update scoring constants and velocity formula

**Files:**
- Modify: `src/utils/scoring.ts`

**Step 1: Add constants at the top of the file (after the module comment)**

```ts
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
```

**Step 2: Replace `velocityScore` function**

Replace the entire `velocityScore` function with:
```ts
export function velocityScore(currentWeek: number, previousWeek: number): number {
    if (currentWeek === 0 && previousWeek === 0) return 0
    const logRatio = Math.log((currentWeek + SMOOTHING_K) / (previousWeek + SMOOTHING_K))
    const volumeFactor = Math.min(1, currentWeek / VOLUME_THRESHOLD)
    return Math.max(0, Math.min(logRatio * volumeFactor, 1))
}
```

**Step 3: Update `ScoringInput` interface**

Replace `maxCurrentWeekClicks` with `p95Clicks` and add `isLowData`:
```ts
export interface ScoringInput {
    distanceKm: number | null | undefined
    currentWeekClicks: number
    previousWeekClicks: number
    createdAt: string | undefined
    p95Clicks: number
    isLowData: boolean
}
```

**Step 4: Replace `compositeScore` function**

```ts
export function compositeScore(input: ScoringInput): number {
    const w = input.isLowData ? WEIGHTS_LOW_DATA : WEIGHTS
    const prox = proximityScore(input.distanceKm)
    const vel = velocityScore(input.currentWeekClicks, input.previousWeekClicks)
    const raw = input.p95Clicks > 0 ? Math.min(1, input.currentWeekClicks / input.p95Clicks) : 0
    const fresh = freshnessBoost(input.createdAt)

    return w.proximity * prox + w.momentum * vel + w.popularity * raw + w.freshness * fresh
}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `useMakers.ts` (because `ScoringInput` changed) — that's expected, fixed in Task 5.

**Step 6: Commit**

```bash
git add src/utils/scoring.ts
git commit -m "feat: log-ratio velocity smoothing, weight profiles, scoring constants"
```

---

### Task 5: Update useMakers hook

**Files:**
- Modify: `src/hooks/useMakers.ts`

**Step 1: Update imports**

Change line 4 from:
```ts
import { compositeScore, velocityScore } from "../utils/scoring"
```
To:
```ts
import {
    compositeScore,
    velocityScore,
    LOW_DATA_MAKER_THRESHOLD,
    LOW_DATA_CLICK_THRESHOLD,
    MIN_POPULARITY_BASELINE,
} from "../utils/scoring"
```

**Step 2: Replace the scoring useMemo block (lines 73-106)**

Replace the entire `const makers = useMemo(...)` block with:

```ts
    const makers = useMemo(() => {
        if (!rawMakers.length) return rawMakers

        // Compute p95 clicks for popularity normalization
        const clickValues = Object.values(clickStats)
            .map((s) => s.current_week_clicks)
            .sort((a, b) => a - b)
        const p95Idx = Math.floor((clickValues.length - 1) * 0.95)
        const p95 = Math.max(MIN_POPULARITY_BASELINE, clickValues[p95Idx] || 1)

        // Detect low-data mode: fewer than N makers with meaningful clicks
        const makersWithClicks = Object.values(clickStats).filter(
            (s) => s.current_week_clicks >= LOW_DATA_CLICK_THRESHOLD,
        ).length
        const isLowData = makersWithClicks < LOW_DATA_MAKER_THRESHOLD

        const scored = rawMakers.map((maker) => {
            const stats = clickStats[maker.id]
            const currentWeek = stats?.current_week_clicks ?? 0
            const previousWeek = stats?.previous_week_clicks ?? 0
            const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, maker.lat, maker.lng) : null

            const score = compositeScore({
                distanceKm: dist,
                currentWeekClicks: currentWeek,
                previousWeekClicks: previousWeek,
                createdAt: maker.created_at,
                p95Clicks: p95,
                isLowData,
            })

            const vel = velocityScore(currentWeek, previousWeek)

            return { ...maker, distance: dist, score, velocity: vel }
        })

        // Sort by composite score descending, alphabetical tiebreaker
        scored.sort((a, b) => {
            if (b.score !== a.score) return (b.score ?? 0) - (a.score ?? 0)
            return a.name.localeCompare(b.name)
        })

        // Post-sort: prevent 3+ consecutive same-category makers
        return interleavedByCategory(scored)
    }, [rawMakers, userLocation, clickStats])
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 4: Commit**

```bash
git add src/hooks/useMakers.ts
git commit -m "feat: p95 normalization, low-data mode detection in useMakers"
```

---

### Task 6: Update trending carousel eligibility

**Files:**
- Modify: `src/screens/DiscoverScreen.tsx:198-205`

**Step 1: Add import**

Add to the existing imports at the top of DiscoverScreen.tsx:
```ts
import { TRENDING_MIN_CURRENT, TRENDING_MIN_COMBINED } from "../utils/scoring"
```

**Step 2: Update trending filter**

Replace lines 198-205:
```ts
    const trendingMakers = useMemo(
        () =>
            makers
                .filter((m) => (m.velocity ?? 0) > 0)
                .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
                .slice(0, 5),
        [makers],
    )
```

With:
```ts
    const trendingMakers = useMemo(
        () =>
            makers
                .filter((m) => {
                    const vel = m.velocity ?? 0
                    if (vel <= 0) return false
                    const cur = m.score !== undefined ? 1 : 0 // proxy — real check below
                    return true
                })
                .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
                .slice(0, 5),
        [makers],
    )
```

Wait — we need the actual click counts for eligibility. The `makers` array doesn't carry raw click counts. Two options:

**Option A (simple):** Since velocity already incorporates volume factor via `velocityScore()`, makers with <25 clicks will have velocity dampened near zero. The `vel > 0` filter combined with the volume factor is effectively the eligibility check. No code change needed beyond what `velocityScore` already does.

**Option B (explicit):** Pass click stats through to DiscoverScreen. This adds prop drilling.

**Recommendation: Option A.** The smoothed velocity formula already handles this. A maker with 3 clicks this week gets velocity dampened by `3/25 = 0.12` volume factor — it will never rank in the top 5 trending unless it has genuinely outsized growth relative to volume. No code change needed for this task.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 4: Commit (only if DiscoverScreen was modified)**

```bash
git add src/screens/DiscoverScreen.tsx
git commit -m "feat: import trending constants for future eligibility checks"
```

---

### Task 7: Full verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 2: Build**

Run: `npm run build`
Expected: Clean build, no warnings

**Step 3: Lint**

Run: `npm run lint`
Expected: Zero errors

**Step 4: Dev server smoke test**

Run: `npm run dev`
Expected: App loads, discovery feed displays makers, trending carousel works

---

### Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Update the "Discovery Feed Scoring Algorithm" section to document:
- New velocity formula (log-ratio with volume factor)
- Smoothing constant k=10
- Low-data mode with weight switching
- 95th percentile normalization with MIN_POPULARITY_BASELINE floor
- Click fraud prevention (visitor ID, 15-min bucket dedup, record_maker_click RPC)
- Add `src/utils/visitor.ts` to project structure

**Commit:**
```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with scoring hardening details"
```
