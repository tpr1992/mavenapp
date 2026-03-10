# Discovery Feed Scoring Algorithm

## Scoring Contract (do not change casually)

### Inputs (must exist)

| Input | Type | Source |
|-------|------|--------|
| `distanceKm` | `number \| null` | User geolocation vs maker coords |
| `engagementScore` | `number` | `get_maker_click_stats` RPC (exponential decay) |
| `createdAt` | `string` (optional) | `makers.created_at` |
| `p95Engagement` | `number` | 95th percentile of all engagement scores |
| `isLowData` | `boolean` | Derived from maker count with sufficient clicks |

### Outputs (must hold)

| Function | Returns |
|----------|---------|
| `proximityScore(distanceKm)` | `[0, 1]` |
| `freshnessBoost(createdAt)` | `[0, 1]` |
| `engagement = min(1, engagementScore / p95Engagement)` | `[0, 1]` |
| `compositeScore(...)` | `[0, 1]` (weighted sum of normalized signals) |

### Invariants (must always be true)

1. If distance increases, proximity must not increase
2. New makers get a temporary boost that reaches ~0 by day 30
3. Engagement must not be flattened by a single outlier (p95, not max)
4. Clicks naturally decay over time — no cliff edges between weeks

### Mode switch invariant

Low-data mode triggers only when:
`< LOW_DATA_MAKER_THRESHOLD` makers have `current_week_clicks >= LOW_DATA_CLICK_THRESHOLD`

---

## Signal Weights

| Signal | Normal | Low-data |
|--------|--------|----------|
| Proximity | 40% | 55% |
| Engagement | 40% | 20% |
| Freshness | 20% | 25% |

Low-data mode shifts weight toward proximity and freshness, reducing reliance on noisy engagement signals.

## Exponential Decay

Engagement is computed server-side using exponential decay on raw click timestamps:

```
engagement_score = SUM(exp(-λ × age_in_days))
```

- **Half-life:** 7 days (`λ = ln(2)/7 ≈ 0.0990`)
- A click from today contributes `1.0`
- 7 days ago: `0.5`
- 14 days ago: `0.25`
- 21 days ago: `0.125`
- 30 days ago: `~0.05`

This replaces the old rolling weekly window (velocity + popularity) with a single unified metric. No cron job needed — decay is computed fresh from raw timestamps on every read.

### Why exponential decay?

- **No cliffs:** Old weekly windows caused trending to disappear when a week rolled over with no new clicks
- **Naturally evolving:** Recent activity always weighs more without manual resets
- **Fair to newcomers:** A burst of clicks on a new maker shows up immediately
- **Graceful fade:** Popular makers stay visible but gradually fade without fresh engagement

## Proximity

Inverse-square decay: 1.0 at 0km, ~0.5 at 5km, ~0.1 at 20km.

## Freshness

Linear decay from 1.0 to 0.0 over 30 days since `created_at`.

## Post-sort

`interleavedByCategory()` (`src/utils/interleave.ts`) prevents 3+ consecutive same-category makers.

## Trending Carousel

Top 5 makers by `engagementScore`. Exponential decay means trending never goes stale — it always reflects the most recent weighted activity. Fallback to top-scored makers if no engagement data exists.

---

## Constants & Rationale

| Constant | Value | Purpose |
|----------|-------|---------|
| `LOW_DATA_MAKER_THRESHOLD` | 15 | Number of makers needed to trust engagement signals |
| `LOW_DATA_CLICK_THRESHOLD` | 10 | Minimum clicks/week to count a maker as "has data" |
| `MIN_ENGAGEMENT_BASELINE` | 3.0 | Floor for p95 engagement (prevents collapse at low traffic) |

---

## Golden Scenarios (expected behavior)

| Scenario | engagement | distKm | ageDays | Expected |
|----------|-----------|--------|---------|----------|
| Zero signal | 0 | 1 | 100 | engagement=0 |
| Active maker | 15.3 | 1 | 100 | engagement normalized, good score |
| Fading maker | 2.1 | 1 | 100 | low engagement, dropping in feed |
| New maker | 0 | 1 | 2 | freshness high, rising despite no clicks |
| Far maker | 15.3 | 30 | 100 | proximity low, overall lower despite good engagement |

---

## Debug Scoring

When `?debugScoring=1` is in the URL, the browser console prints a table with columns:

`name`, `distance_km`, `engagement`, `current_clicks`, `previous_clicks`, `composite_score`

---

## Tuning Guide

| Symptom | Adjustment |
|---------|------------|
| Feed feels stale | Increase engagement weight or shorten half-life |
| Big makers dominate too much | Lower engagement weight or raise `MIN_ENGAGEMENT_BASELINE` |
| Local relevance feels weak | Increase proximity weight or steepen distance curve |
| Low-data mode triggers too often | Lower `LOW_DATA_MAKER_THRESHOLD` or `LOW_DATA_CLICK_THRESHOLD` |
| Trending changes too fast | Increase half-life (reduce lambda) |
| Old clicks linger too long | Decrease half-life (increase lambda) |

## Migration

Run `scripts/migrate-exponential-decay.sql` in Supabase SQL Editor to update the `get_maker_click_stats` RPC.
