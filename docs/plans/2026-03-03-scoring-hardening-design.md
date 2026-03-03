# Scoring Hardening & Click Fraud Prevention

**Date:** 2026-03-03
**Status:** Approved

## Problem

The discovery feed scoring algorithm has three weaknesses:

1. **Click fraud** — No deduplication. A maker can boost their profile by clicking repeatedly.
2. **Velocity noise** — Small-number spikes dominate. `2→8` (300%) outranks `50→80` (60%).
3. **Popularity outliers** — Normalizing against max clicks lets one runaway maker flatten everyone else.

## Design

### 1. Click Fraud Prevention

**Visitor ID:** `src/utils/visitor.ts` — `getVisitorId()` generates a UUID v4 once, stores in `localStorage`, returns on subsequent calls. Guarded against non-browser contexts.

**Schema changes (Supabase SQL Editor):**

```sql
-- Add columns to maker_clicks
ALTER TABLE maker_clicks
  ADD COLUMN visitor_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  ADD COLUMN click_bucket timestamptz NOT NULL DEFAULT to_timestamp(floor(extract(epoch from now()) / 900) * 900);

-- Unique constraint: one click per visitor per maker per 15-minute bucket
CREATE UNIQUE INDEX maker_clicks_dedup ON maker_clicks (maker_id, visitor_id, click_bucket);
```

**RPC `record_maker_click(p_maker_id text, p_visitor_id uuid)`:**

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

**Also update `get_maker_click_stats()`** — add `SET search_path = public` and matching `REVOKE/GRANT`.

**Client (`App.tsx`):** Replace bare insert with `supabase.rpc('record_maker_click', { p_maker_id: maker.id, p_visitor_id: getVisitorId() })`.

**Limitations (MVP):** Visitor ID is resettable via clearing storage. Prevents casual self-boosting, not adversarial actors.

### 2. Velocity Smoothing

**Formula — log-ratio with volume factor:**

```
velocity = log((cur + k) / (prev + k)) * min(1, cur / VOLUME_THRESHOLD)
clamped to [0, 1]
```

- `k = 10` (SMOOTHING_K) — high for early stage, lower to 5→3 as data grows
- Volume factor dampens low-volume noise while letting real traction shine
- Log-ratio is stable at extremes, harder to game than linear

**Behavior:**

| Scenario | Smoothed velocity |
|---|---|
| 0→0 | 0 |
| 2→8 | 0.13 (noise, suppressed) |
| 50→80 | 0.41 (real traction) |
| 10→40 | 0.92 (strong growth + volume) |
| 100→100 | 0 (flat) |

**Momentum gating:** When <15 makers have >=10 unique clicks/week, switch to low-data weights.

**Weights:**

| Signal | Normal | Low-data |
|---|---|---|
| Proximity | 35% | 55% |
| Momentum | 30% | 10% |
| Freshness | 20% | 25% |
| Popularity | 15% | 10% |

**Trending eligibility:** `current >= TRENDING_MIN_CURRENT OR (current + previous) >= TRENDING_MIN_COMBINED`

### 3. 95th Percentile Popularity Normalization

**Current:** `raw = clicks / maxClicks` — one outlier flattens everyone.

**New:**

```ts
const idx = Math.floor((clickValues.length - 1) * 0.95)
const p95 = Math.max(MIN_POPULARITY_BASELINE, clickValues[idx] || 1)
const raw = Math.min(1, currentWeekClicks / p95)
```

- `MIN_POPULARITY_BASELINE = 10` prevents volatile scaling at microscopic traffic
- Makers above p95 clamp to 1.0
- Once multi-city, compute p95 per geographic feed

### Constants (all in `scoring.ts`)

```ts
export const SMOOTHING_K = 10
export const VOLUME_THRESHOLD = 25
export const LOW_DATA_MAKER_THRESHOLD = 15
export const LOW_DATA_CLICK_THRESHOLD = 10
export const TRENDING_MIN_CURRENT = 10
export const TRENDING_MIN_COMBINED = 25
export const MIN_POPULARITY_BASELINE = 10
```

## Files Changed

| File | Change |
|---|---|
| `src/utils/visitor.ts` | **New** — `getVisitorId()` |
| `src/utils/scoring.ts` | Updated velocity formula, exported constants, weight profiles |
| `src/hooks/useMakers.ts` | P95 normalization, momentum gating, use updated scoring |
| `src/App.tsx` | Use `record_maker_click` RPC with visitor ID |
| Supabase SQL | Schema migration, new RPC, updated existing RPC |

## Future Considerations

- Lower smoothing constant as real data builds (10 → 5 → 3)
- Per-city p95 normalization when expanding beyond Ireland
- Dev-only debug overlay showing score breakdown per maker
- IP-based throttling via edge functions for adversarial fraud prevention
- Server-side momentum gating for multi-client consistency
