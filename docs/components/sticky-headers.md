# Sticky Header Architecture

Both the discover feed and maker profile use the same `height: 0` sticky overlay pattern. A single DOM tree is always mounted — elements morph between states via CSS transitions, never mount/unmount.

## Core Pattern

```
+-- position: sticky; top: 0; height: 0 ---------+
|  +-- bar (glass bg, translateY for show/hide) -+ |
|  |  content morphs via CSS transitions         | |
|  +---------------------------------------------+ |
+---------------------------------------------------+
+-- spacer div (reserves visual space) -------------+
+---------------------------------------------------+
```

- **`height: 0`** means the header never participates in layout — content scrolls behind it naturally
- **Spacer div** follows the sticky wrapper and pushes page content down by the expanded header height
- **No `wrapper.style.top` manipulation** — the header never moves itself
- **Velocity-based show/hide** in compact zone: `translateY(-100%)` to hide, `translateY(0)` to show, triggered by scroll velocity threshold (`< -0.08` = scrolling up with intent)
- **Rubber band dismiss**: scrolling down with bar visible enters rubber band mode — direct DOM `translateY` tracking, resolves on touchEnd (commit hide at >35% progress or >0.5 velocity, snap back otherwise). Frost is killed during rubber band for perf.

---

## MakerProfileHeader

`src/components/makers/MakerProfileHeader.tsx`

Morphs between hero-overlay mode (transparent bg, glass buttons over hero image) and compact-bar mode (frosted glass bg, maker name, action buttons).

| State | Trigger | Visual |
|-------|---------|--------|
| Hero overlay | `isCompact=false` (hero visible via IntersectionObserver) | Transparent bg, white text, glass icon buttons |
| Compact bar | `isCompact=true` (hero scrolled off) | Frosted glass bar, maker name, save/share/menu |
| Hidden | Velocity scroll down in compact zone | `translateY(-100%)` slide out |
| Shown | Velocity scroll up in compact zone | `translateY(0)` slide in |

- `isCompact` is driven externally by `MakerProfile` via IntersectionObserver on the hero element
- Includes a 3-dot menu with iOS-style scale animation, auto-closes on scroll or tap-outside
- Transition curve: `all 0.3s cubic-bezier(0.32, 0.72, 0, 1)` (iOS ease — overshoot is safe here because `height: 0` means nothing below bounces)

---

## DiscoverHeader

`src/components/discover/DiscoverHeader.tsx`

Morphs between expanded mode (large logo, location picker) and compact mode (small logo, filter pills). Both modes are fixed at **50px height** (`box-sizing: border-box`) to eliminate height bounce during morphs.

| State | Trigger | Visual |
|-------|---------|--------|
| Expanded | `scrollTop < 5` | Large "maven" (30px), location picker, search button |
| Compact hidden | First time past spacer threshold | `translateY(-100%)`, waiting for velocity |
| Compact shown | Velocity scroll up (`< -0.08`) | Small "maven" (22px), filter pills (overlay crossfade), search button |
| Compact dismissed | Rubber band or velocity down | `translateY(-100%)` slide out |
| Search open | Search button tap | Search bar row expands below top row (grid-template-rows animation) |
| Top row collapsed | Active search + scroll down in compact | Logo+pills row collapses, search bar gets top padding |

### Content Morph Strategy — Overlay Crossfade

- Location picker is always in document flow (determines middle area height)
- Filter pills are `position: absolute` overlaid on the location area
- Both crossfade via `opacity 0.25s ease` — no layout transitions needed
- Logo font-size transitions (30 -> 22) with `ease` easing
- `alignItems` snaps from `baseline` (expanded) to `center` (compact)

### Spacer Height

Measured via `useLayoutEffect` (sync before paint), updates when `searchOpen` or `isCompact` changes. Only measures when in expanded mode to avoid capturing compact dimensions.

### Search Row

Matches the header at 50px total (40px SearchBar container + 10px wrapper padding).

---

## Design Principles (hard-won lessons)

1. **Never manipulate `wrapper.style.top`** to simulate natural scrolling — causes jank and requires snap logic
2. **Fixed height eliminates bounce** — both compact and expanded must be the same height. If content differs, use `box-sizing: border-box` with explicit `height`
3. **Overlay crossfade > flex/maxWidth transitions** — transitioning flex, maxWidth, or grid columns for content swaps causes layout thrash. Keep one element in flow and absolutely position the other, crossfading with opacity only
4. **Match easing to layout context** — use "Settle" curve for layout morphs in fixed-height containers, "iOS ease" for transform-based overlays
5. **Refs over state in scroll handlers** — `isCompactRef`, `barShown`, `wasCompactRef` prevent stale closures and redundant `setState` calls
