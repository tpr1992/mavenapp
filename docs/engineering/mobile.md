# Safe Area & Mobile Handling

## Safe Areas

- **TabBar and scroll containers** use `paddingBottom: "env(safe-area-inset-bottom, 0px)"` for iPhone home indicator.

## Scrollbar Hiding

Horizontal scroll containers (pills, carousels): `scrollbarWidth: "none"`, `msOverflowStyle: "none"`.

## iOS Touch Gotchas

### Text elements block scroll on iOS Safari/Chrome

`<p>` and other text elements trigger text-selection heuristics that intercept touch gestures before scroll can start.

**Fix**: Apply `pointerEvents: "none"` on non-interactive text elements (like bio/description) to remove them from hit testing entirely.

**Do NOT** rely on `userSelect`/`WebkitUserSelect` — these are hints the browser can ignore intermittently. `pointerEvents: "none"` is a hard rule.

### Never use manual scroll in JS

When native scroll is available, don't replace it with JS-driven scroll — you lose momentum, elastic bounce, and smooth feel.

### Direct DOM for drag animations

React state updates on every `touchmove` cause frame drops. Use `element.style.height` directly during drag, CSS `transition` on release, sync React state after via `transitionend` listener.

### Synthetic pointer events after touch on iOS

After a touch-based collapse, iOS fires synthetic `pointerdown`/`pointerup` events that can re-trigger handlers. Block with a timestamp cooldown ref (`touchCollapseAtRef`).

### Effect cleanup timing

React 18 effect cleanup runs after DOM update but before paint. Clearing `card.style.height = ""` in cleanup wipes React's just-applied value. Solution: never clear `card.style.height` — let React overwrite it on next render.
