# Performance

## Data Fetching

- **Prefetch data in App.tsx, not in screen components.** Screens mount after tab navigation, so hooks inside them fire late — causing a visible flash of stale or missing content. By fetching in App.tsx and passing as props, the data is ready before the screen renders.
- **Never fetch inside a lazy-loaded screen** if the data can be fetched earlier. The screen should receive ready-to-render data as props.
- Hooks that run in App.tsx: `useProfileName`, `useMakers`, `useSavedMakers`, `useSponsoredPosts`.

## Lazy Loading

- **Only lazy-load screens with heavy dependencies.** `React.lazy()` + `Suspense` introduces a flash on first visit. Acceptable for MapScreen (~150KB Leaflet) but not for lightweight screens like SavedScreen (2KB) or ProfileScreen (5KB).
- **Rule**: If the screen's unique chunk is under ~20KB gzipped, import it directly.
- **Preload lazy chunks on app mount**: For lazy screens (MapScreen), preload the chunk after a short delay (`setTimeout(mapImport, 1000)`) in a `useEffect`. Use an extracted import function shared between `lazy()` and the preload call.

## Image Prefetching

- **Hero images**: Preloaded on maker tap (before profile renders) so the hero image is already cached when MakerProfile mounts.
- **Map pins**: Prefetch thumbnails on map settle via `map.getBounds().contains()`.

## Avatar Placeholder Strategy

`MakerAvatar` always renders the initials fallback as the base layer, with the `<img>` absolutely positioned on top. If the image loads, it covers the initials. If it fails, initials are already visible — no flash.

## GPU & Paint Optimization

- **`willChange: "transform"`** on elements that animate via `translateY` (sticky headers, map cards)
- **`backfaceVisibility: "hidden"`** on carousel slides and masonry items to reduce paint cost
- **`transform: "translateZ(0)"`** for GPU layer promotion on animated elements
- **Text truncation**: Single-line uses `whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"`. Multi-line uses `-webkit-line-clamp` with `-webkit-box-orient: "vertical"`.

## Scroll Handler Performance

- **Direct DOM in scroll handlers**: React state updates on every scroll event cause frame drops. Use `element.style.*` directly during animations (transforms, opacity), then sync React state after via `transitionend` or timeout.
- **Refs over state**: `isCompactRef`, `barShown`, `wasCompactRef` prevent stale closures and redundant `setState` calls during rapid scroll events.

## Glass Performance

Glass (`backdrop-filter: blur`) is expensive. **Limit to 2–3 glass elements visible simultaneously.** Never apply glass to masonry grid cards, list items, or anything that repaints during scroll.

Use `killFrost()` during drag animations to swap blur for a solid `glassBarOpaque()` fallback, then `restoreFrost()` when the animation resolves. See [glass-system.md](../design/glass-system.md).
