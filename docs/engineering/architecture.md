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

All shared state lives in `App.tsx` and flows down as props:

- `activeTab` — current tab
- `selectedMaker` — maker profile overlay
- `makers` — fetched via `useMakers` hook
- `savedIds` — via `useSavedMakers` hook
- `sponsoredPosts` — via `useSponsoredPosts` hook
- `userLocation` — via `useUserLocation` hook

Hooks run in App.tsx so data is ready before screens mount (prevents flash on tab switch).

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
import type { Maker } from "../types"

interface ExampleScreenProps {
    makers: Maker[]
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    isHidden: boolean
    onMakerTap: (maker: Maker) => void
}

export default function ExampleScreen({ makers, scrollContainerRef, isHidden, onMakerTap }: ExampleScreenProps) {
    const { theme, isDark } = useTheme()

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: theme.text }}>
                Title
            </h2>
        </div>
    )
}
```

### Reusable component

```tsx
import { useTheme } from "../../contexts/ThemeContext"

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
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
            }}
        >
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: theme.text }}>
                {title}
            </h3>
        </div>
    )
}
```

## Sponsored Posts

Geo-targeted ad tiles in the discovery feed masonry grid. Visually similar to maker cards with a "Sponsored" label.

- **Data**: `useSponsoredPosts(userLocation)` fetches active ads (RLS filters by date/status), client-side geo-targeting.
- **Placement**: First ad after maker #7, then every 10 (`MIN_POSITION = 7`, `SPACING = 10`). Deferred until 2+ makers visible.
- **Geo-targeting**: Ads with `target_lat/lng/radius_km` only show to users within radius. Null geo = show everywhere.
- **Rendering**: 300px image, brand name, tagline, "Sponsored" label. Opens `link_url` via `safeOpen()`.
