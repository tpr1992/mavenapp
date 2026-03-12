# MapScreen Architecture

`MapScreenV2.tsx` — GPU-rendered vector tile map with client-side clustering.

Uses MapLibre GL JS for GPU-rendered vector tile maps with CARTO styles, and Supercluster for client-side point clustering. All markers (clusters + pins) are HTML elements managed by Supercluster.

### Map Renderer

- **MapLibre GL JS** — GPU-rendered vector tiles, smooth pinch-to-zoom
- **CARTO styles** (free, no API key): `dark-matter` (dark mode), `voyager` (light mode)
- Map is initialized once, style swapped on theme change via `map.setStyle()`

### Clustering — Supercluster

All clustering logic runs client-side via Supercluster. Both cluster circles and individual pins are HTML markers (DOM elements), not canvas layers.

**Current config:**

| Param | Value | Effect |
|-------|-------|--------|
| `radius` | `30` | Pixel distance on a 512px tile — how close points must be to cluster |
| `maxZoom` | `17` | Above this zoom, all points show individually |
| `minPoints` | `2` | Minimum points to form a cluster |

**How `radius` works:** It's measured in pixels on an internal 512×512 tile grid, not real-world distance. At low zoom (zoomed out), each tile covers a large area so `radius: 30` captures points km apart. At high zoom, tiles cover small areas so the same radius only captures points meters apart. Clustering naturally loosens as you zoom in.

**Tuning guide:**

| Want | Change |
|------|--------|
| Less aggressive clustering (more individual pins) | Lower `radius` (try 20–25) |
| More aggressive clustering (fewer pins) | Raise `radius` (try 40–50) |
| Clusters break apart earlier when zooming | Lower `maxZoom` (try 15–16) |
| Clusters persist deeper into zoom | Raise `maxZoom` (try 18–19) |
| Require more points to form a cluster | Raise `minPoints` (try 3–4) |

### Cluster Click Behavior

Uses `getClusterExpansionZoom(clusterId)` + `map.easeTo()` with smart zoom caps:

| Cluster size | Max zoom on click |
|-------------|-------------------|
| ≤ 3 points | 18 (street level) |
| 4–8 points | 17 |
| 9+ points | 18 |

Minimum zoom increase per click: `currentZoom + 2` (ensures visible progress).

### Marker Lifecycle

`syncMarkers()` runs on every `moveend`:

1. Get viewport bounds + integer zoom
2. Call `supercluster.getClusters(bbox, zoom)` for visible features
3. **Clusters**: Always recreated (ensures click handlers have fresh `cluster_id`)
4. **Pins**: Reused if already visible, created if new
5. Stale markers (scrolled/zoomed out of view) are removed

### Pin Design

Glass pill with category emoji + maker name. Unselected: frosted glass (`backdrop-filter: blur(16px)`). Selected: solid with `scale(1.1)` and higher z-index. Both fade in on appear (200ms pins, 150ms clusters).

### Theme Switching

`map.setStyle()` swaps CARTO vector tile style. On `style.load`, all HTML markers are cleared and rebuilt with new theme colors. Supercluster index is NOT rebuilt (data hasn't changed).

## SwipeableMapCard

Bottom sheet with peek (164px) and expanded (80vh) states. Handles:

- **Pointer-based drag** (handle zone always, content zone in peek only) for expand/collapse/dismiss
- **Native scroll + touch-based drag handoff** in expanded state — browser handles scroll natively; passive touch listeners detect when `scrollTop === 0` and user pulls down, then seamlessly transition to direct DOM height manipulation for collapse
- **Direct DOM manipulation** during collapse drag (`card.style.height` directly, no React state) for 60fps performance, with CSS transition on release and React state sync via `transitionend`
- **Frosted glass card** — `rgba(255,255,255,0.55)` / `rgba(30,30,30,0.55)` with `backdrop-filter: blur(20px) saturate(1.4)`

## Image Prefetching

- **On pin tap**: Preloads hero (600px + 120px) and gallery (200px)
- **On map settle** (400ms debounce): Preloads 120px thumbnails for all visible pins via viewport bounds check

## iOS Touch/Scroll Gotchas

These are hard-won lessons — refer to [mobile.md](../engineering/mobile.md) for the full list. Key ones for MapScreen:

1. **Text elements block scroll**: Apply `pointerEvents: "none"` on non-interactive text (bio/description)
2. **Never use manual scroll in JS** when native scroll is available
3. **Direct DOM for drag**: Use `element.style.height` directly during drag, CSS `transition` on release, sync React state via `transitionend`
4. **Synthetic pointer events after touch**: After touch-based collapse, iOS fires synthetic `pointerdown`/`pointerup`. Block with timestamp cooldown ref (`touchCollapseAtRef`)
5. **Effect cleanup timing**: Never clear `card.style.height = ""` in cleanup — let React overwrite it on next render
