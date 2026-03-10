# Supabase Query Patterns

## Client

The app uses the Supabase JS client (`src/lib/supabase.ts`) with the anon key.

## Two Query Styles

### Direct table queries (`.from().select()`) for simple CRUD

```tsx
// Read
const { data, error } = await supabase.from("makers").select("id, name, ...").order("name")
// Insert
await supabase.from("user_saves").insert({ user_id, maker_id })
// Delete
await supabase.from("user_saves").delete().eq("user_id", id).eq("maker_id", id)
```

### RPCs for server-side logic (deduplication, aggregation)

```tsx
await supabase.rpc("record_maker_click", { p_maker_id: maker.id, p_visitor_id: getVisitorId() })
const { data } = await supabase.rpc("get_maker_click_stats")
```

## Tables Queried

`makers`, `sponsored_posts`, `user_saves`, `profiles`

## RPCs

| RPC | Purpose |
|-----|---------|
| `record_maker_click(p_maker_id, p_visitor_id)` | Records a click with dedup. `SECURITY DEFINER`, `SET search_path = public`. |
| `get_maker_click_stats()` | Returns weekly click counts + exponential decay engagement score per maker. `SECURITY DEFINER`. |
| `search_makers(search_query, user_lat?, user_lng?, match_limit?)` | Full-text + fuzzy search with synonym expansion. See [search.md](search.md). `SECURITY DEFINER`. |
| `debug_reset_clicks()` | Deletes all click data. For in-app debug panel only. `SECURITY DEFINER`. |
| `debug_bulk_insert_clicks(p_clicks jsonb)` | Bulk inserts click data from JSON array. For in-app debug panel only. `SECURITY DEFINER`. |

## Conventions

- **Fetch-once pattern**: Hooks use a `fetchedRef` to prevent duplicate requests on re-render. Data is fetched once on mount, stored in React state, no persistent cache.
- **RLS policies handle filtering**: e.g., `sponsored_posts` table has RLS for `is_active` and date range. Don't duplicate server-side filters in client code.
- **No retry logic**: Simple `if (error)` checks. The app is read-heavy with low failure rates.
- **Fire-and-forget for writes**: Click recording is non-blocking (`supabase.rpc(...).then()` without await).

## Error Handling

Silent degradation with sensible defaults. If a query fails, the hook returns an empty array and logs to console. No error toasts, no error boundaries, no retry logic.

```tsx
// Standard pattern for new hooks
const { data, error } = await supabase.from("table").select("...")
if (error) { console.error("fetchX:", error); return }
setSomeState(data ?? [])
```

## Seeding

`src/data/makers.ts` is the seed source. `scripts/seed.js` seeds Supabase from it. GitHub Actions (`.github/workflows/seed.yml`) auto-seeds when `makers.ts` changes on main.
