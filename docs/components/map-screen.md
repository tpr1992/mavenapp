# MapScreen Architecture

`MapScreen.tsx` contains the map view and an inline `SwipeableMapCard` component — an iOS-style swipeable bottom sheet.

## Key Components

### `createPinIcon(maker, isSelected, isDark)`

Generates Leaflet `L.divIcon` HTML. Unselected pins use frosted glass (`rgba` bg + `backdrop-filter: blur(16px) saturate(1.4)`). Selected pins are solid with `zIndexOffset(1000)` to overlap unselected pins.

### SwipeableMapCard

Bottom sheet with peek (164px) and expanded (80vh) states. Handles:

- **Pointer-based drag** (handle zone always, content zone in peek only) for expand/collapse/dismiss
- **Native scroll + touch-based drag handoff** in expanded state — browser handles scroll natively; passive touch listeners detect when `scrollTop === 0` and user pulls down, then seamlessly transition to direct DOM height manipulation for collapse
- **Direct DOM manipulation** during collapse drag (`card.style.height` directly, no React state) for 60fps performance, with CSS transition on release and React state sync via `transitionend`
- **Frosted glass card** — `rgba(255,255,255,0.55)` / `rgba(30,30,30,0.55)` with `backdrop-filter: blur(20px) saturate(1.4)`

## Image Prefetching

- **On pin tap**: Preloads hero (600px + 120px) and gallery (200px)
- **On map settle** (400ms debounce): Preloads 120px thumbnails for all visible pins via `map.getBounds().contains()`

## iOS Touch/Scroll Gotchas

These are hard-won lessons — refer to [mobile.md](../engineering/mobile.md) for the full list. Key ones for MapScreen:

1. **Text elements block scroll**: Apply `pointerEvents: "none"` on non-interactive text (bio/description)
2. **Never use manual scroll in JS** when native scroll is available
3. **Direct DOM for drag**: Use `element.style.height` directly during drag, CSS `transition` on release, sync React state via `transitionend`
4. **Synthetic pointer events after touch**: After touch-based collapse, iOS fires synthetic `pointerdown`/`pointerup`. Block with timestamp cooldown ref (`touchCollapseAtRef`)
5. **Effect cleanup timing**: Never clear `card.style.height = ""` in cleanup — let React overwrite it on next render
