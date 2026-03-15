# Search

## Overview

Search uses a three-layer strategy executed server-side via the `search_makers` Supabase RPC. The client calls a single function and gets ranked results — no client-side search logic beyond a basic substring fallback while the RPC loads.

## Architecture

```
User types query
    → useDebounce (default delay)
    → useSearch hook calls search_makers RPC
    → DiscoverScreen merges hits with local maker data
    → Results sorted by search_rank from RPC
```

**Files:**
- `src/hooks/useSearch.ts` — RPC caller, returns `{ hits, searching }`
- `src/screens/DiscoverScreen.tsx` — merges RPC hits into filtered makers list
- `scripts/migrate-search.sql` — full migration (extensions, columns, indexes, synonyms, RPC)

## Three Search Layers

The `search_makers` RPC tries each layer in order, returning as soon as one produces results:

### Layer 1: Full-Text Search with Synonym Expansion

**How it works:** PostgreSQL `tsvector` with weighted fields. The query is first expanded using the `search_synonyms` table, then matched against the pre-computed `search_text` column.

**Weighted fields:**
| Weight | Fields |
|--------|--------|
| A (highest) | `name`, `category` |
| B | `city`, `county`, `tags` |
| C (lowest) | `bio` |

**Synonym expansion:** Before full-text search runs, the query is checked against the `search_synonyms` table. The lookup itself is fuzzy — it uses trigram similarity (`> 0.3`) so typos like "jewlry" still match "jewelry"/"jewellery" and expand to all related terms (rings, necklaces, bracelets, earrings, silver, gold, etc.).

**Stemming:** PostgreSQL's English dictionary handles word stems natively. "ceramics" matches "ceramic", "rings" matches "ring", etc.

**Ranking:** `ts_rank_cd` (cover density ranking) — rewards terms appearing close together and in higher-weighted fields.

### Layer 2: Trigram Fuzzy Matching

**When:** Only fires if Layer 1 returns zero results.

**How it works:** Uses `pg_trgm` extension to compute string similarity between the query and maker fields. Handles typos, partial matches, and terms that aren't in the synonym table.

**Thresholds:**
| Field | Minimum similarity |
|-------|--------------------|
| `name` | 0.15 |
| `category` | 0.25 |
| `city` | 0.30 |
| `bio` | 0.10 |

**Ranking:** `GREATEST` of all field similarities, with city weighted at 0.8x and bio at 0.5x.

### Layer 3: Client-Side Substring Fallback

**When:** While the RPC is loading, or if it returns nothing.

**How it works:** Simple `string.includes()` on name, category, city, county. Also handles county geo-matching via `getCountyCenter()` to find makers near a searched county.

**Not a replacement** for the RPC layers — this is a loading-state fallback only.

## Synonym Table

`search_synonyms` maps craft terms to related words. ~15 entries covering jewelry, pottery, ceramics, clothes, fashion, gifts, prints, woodwork, homeware, weaving, knitting, glass, leather, candles, art, soap.

The synonym lookup is fuzzy: trigram similarity `> 0.3` on the `term` column means typos in the search query still trigger expansion.

## Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `idx_makers_search_text` | GIN | Full-text search on `search_text` tsvector |
| `idx_makers_name_trgm` | GIN (trigram) | Fuzzy matching on `name` |
| `idx_makers_bio_trgm` | GIN (trigram) | Fuzzy matching on `bio` |
| `idx_makers_category_trgm` | GIN (trigram) | Fuzzy matching on `category` |

## Tags

Makers have a `tags` text array column that feeds into the `search_text` tsvector at weight B. Tags are seeded by category (e.g., all "objects" makers get `['handmade', 'craft', 'irish', 'artisan', 'gifts']`). Maker-specific tags can be added for better search precision.

## Client Integration

```tsx
// useSearch.ts — RPC wrapper with stale-response guard
const seq = ++requestSeq.current
const { data } = await supabase.rpc("search_makers", {
    search_query: trimmed,
    match_limit: 20,
})
if (seq !== requestSeq.current) return // ignore superseded queries

// DiscoverScreen.tsx — merge hits with local data
if (searchHits.length > 0) {
    const hitMap = new Map(searchHits.map((h) => [h.id, h.search_rank]))
    return base
        .filter((m) => hitMap.has(m.id))
        .sort((a, b) => (hitMap.get(b.id) ?? 0) - (hitMap.get(a.id) ?? 0))
}
```

Suggestions dropdown also falls back to RPC hits when client-side substring matching finds nothing (handles typo matches like "jewlry").

## Migration

Run `scripts/migrate-search.sql` blocks in order in the Supabase SQL Editor:
1. Enable `pg_trgm` and `vector` extensions
2. Add `tags` column, `search_text` generated tsvector column
3. Create GIN indexes
4. Create `search_synonyms` table and seed entries
5. Create `search_makers` RPC
6. Seed category-level tags

## Future: Semantic Search (Level 3)

Infrastructure is in place (`embedding vector(384)` column, `vector` extension enabled) but embeddings are not yet populated. When added, this would enable meaning-based search ("something for my kitchen" → homeware, ceramics, candles).
