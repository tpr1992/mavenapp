# Architecture

## Navigation Model

No router. Navigation is state-driven via `activeTab` + `selectedMaker` in `App.tsx`. A maker profile overlays the current tab.

## Screens vs Components

- **Screens** (`src/screens/`): Full-page views managed by tab navigation.
- **Components** (`src/components/`): Reusable pieces used across screens.
  - `ui/` — Generic primitives (Carousel, CategoryPills, Toast, etc.)
  - `makers/` — Maker-specific display (MakerHero, MakerListItem, etc.)
  - `discover/` — Discover feed components (DiscoverHeader, SearchOverlay, TrendingCarousel, MasonryGrid)
  - `profile/` — Profile screen components (AuthForm, DebugPanel, AboutModal)
  - `layout/` — App chrome (TabBar)

## State Ownership

State is split between App.tsx (navigation/UI) and MakersContext (data):

**MakersContext** (`src/contexts/MakersContext.tsx`) — wraps the app, provides:
- `makers` — fetched via `useMakers` hook, scored and sorted
- `savedIds` / `toggleSave` — via `useSavedMakers` hook
- `loading`, `error`, `refetch` — fetch state
- Debug metadata: `p95Engagement`, `isLowData`, `makersWithClicks`, `totalMakers`
- Convenience hooks: `useMakersContext()`, `useSavedContext()`, `useDebugMeta()`

**App.tsx** (`AppContent`) — navigation and UI state:
- `activeTab`, `selectedMaker`, `selectedConversation`, `profileSubView`
- `userLocation` — via `useUserLocation` hook
- `sponsoredPosts` — via `useSponsoredPosts` hook
- Auth-gated `handleToggleSave` wrapper (shows toast for unauthenticated users)

Data hooks run at the provider level so data is ready before screens mount (prevents flash on tab switch). Screens consume makers data via context, not props.

## Data Layer

- Maker data lives in Supabase. `useMakers` fetches via REST API, computes composite scores, interleaves by category.
- `src/data/makers.ts` is the seed source. GitHub Actions auto-seeds on push to main.
- All types in `src/types/`. The `Maker` interface is the core type.

## Key Patterns

- **Fetch-once**: Hooks use `fetchedRef` to prevent duplicate requests on re-render.
- **Fire-and-forget writes**: Click recording is non-blocking.
- **Silent degradation**: Failed queries return empty arrays, no error UI.
- **Height:0 sticky overlay**: Both headers use `position: sticky; height: 0` so content scrolls behind naturally. See [sticky-headers.md](../components/sticky-headers.md).
- **Unified discover reset**: `resetDiscover()` in App.tsx consolidates all discover feed reset logic — refetches data, increments `discoverKey` (resets carousels), clears category/openNow filters, and scrolls to top. Called by both logo tap and discover tab tap via `handleTabChange("discover")`. DiscoverHeader's logo tap calls `onReset` which routes to the same function.

## Component Skeletons

### Screen component

```tsx
import { useTheme } from "../contexts/ThemeContext"
import { font } from "../styles/tokens"
import type { Maker } from "../types"

interface ExampleScreenProps {
    onMakerTap: (maker: Maker) => void
}

export default function ExampleScreen({ onMakerTap }: ExampleScreenProps) {
    const { theme, isDark } = useTheme()

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ fontFamily: font.heading, fontSize: 16, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.text }}>
                Title
            </h2>
        </div>
    )
}
```

### Reusable component

```tsx
import { useTheme } from "../../contexts/ThemeContext"
import { font } from "../../styles/tokens"

interface ExampleCardProps {
    title: string
    onTap: () => void
}

export default function ExampleCard({ title, onTap }: ExampleCardProps) {
    const { theme } = useTheme()

    return (
        <div
            onClick={onTap}
            style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 0,
                padding: 16,
                cursor: "pointer",
            }}
        >
            <h3 style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: theme.text }}>
                {title}
            </h3>
        </div>
    )
}
```

## Discover Page Structure

The discover feed (`DiscoverScreen.tsx`) flows top-to-bottom:

1. **DiscoverHeader** — sticky header with logo, location picker (expanded) or logo + search (compact). When compact, a `filterSlot` renders CategoryPills inside the header bar, synced via `filtersInHeader` state driven by scroll position.
2. **TrendingCarousel** — top 5 makers by engagement score. Minimum 3 results required.
3. **NearbyCarousel** (`src/components/ui/NearbyCarousel.tsx`, `userLocation` mode) — horizontal carousel of up to 8 makers within 50km of user location. Only renders for location-aware users with 3+ nearby makers. Smart headings: "AROUND THE CORNER" / "MAKERS IN {CITY}" / "MAKERS NEAR YOU" / "MAKERS IN {COUNTY}".
4. **CategoryPills** — filter row (Clothing/Objects/Art + layout toggle). Sits in natural position, also injected into compact header when scrolled past.
5. **"EXPLORE MAKERS" heading** — section label for the main grid.
6. **MasonryGrid** — scored maker cards, interleaved by category. Infinite scroll via IntersectionObserver sentinel.

### Maker Profile Page Structure

Below the hero/tabs content:

1. **NearbyCarousel** (`src/components/ui/NearbyCarousel.tsx`, `anchor` mode) — up to 5 makers within 30km of the current maker (dynamic radius: 2km → 10km → 30km). Smart headings based on geography. Distance shown is maker-to-maker.
2. **RelatedMakersFeed** ("KEEP EXPLORING") — masonry grid of related makers, same category first, sorted by distance from current maker. Excludes nearby carousel makers.

## Sponsored Posts

Geo-targeted ad tiles in the discovery feed masonry grid. Visually similar to maker cards with a "Sponsored" label.

- **Data**: `useSponsoredPosts(userLocation)` fetches active ads (RLS filters by date/status), client-side geo-targeting.
- **Placement**: First ad after maker #7, then every 10 (`MIN_POSITION = 7`, `SPACING = 10`). Deferred until 2+ makers visible.
- **Geo-targeting**: Ads with `target_lat/lng/radius_km` only show to users within radius. Null geo = show everywhere.
- **Rendering**: 300px image, brand name, tagline, "Sponsored" label. Opens `link_url` via `safeOpen()`.
