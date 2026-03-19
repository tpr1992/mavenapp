# Carousel Component

`src/components/ui/Carousel.tsx`

Native scroll-snap carousel used for maker card galleries and the trending carousel. No framer-motion — all animations run via native `scrollTo({ behavior: "smooth" })` on the compositor thread at native refresh rate (120Hz ProMotion on supported devices).

## Modes

| Mode | Config | Behavior |
|------|--------|----------|
| **Simple** | `loop=false` (default) | Finite slides, rubber-bands at edges |
| **Looped** | `loop=true` | Infinite loop via clone-based teleport |

Maker card galleries use simple mode. Trending carousel uses looped mode with autoplay.

## Clone-Based Loop Architecture

When `loop=true` and `count > 1`, the component creates `CLONES` (3) copies on each side:

```
[clone₋₃, clone₋₂, clone₋₁, real₀, real₁, ..., realₙ, clone₊₀, clone₊₁, clone₊₂]
```

- Initial scroll position: `CLONES * slideWidth` (first real slide)
- `loopIdxToReal(i)` maps any loop-array index back to the real item index
- `snapFromClone()` teleports when scroll position drifts into the clone zone (< CLONES or >= CLONES + count), shifting by exactly `count * slideWidth`

### Pre-Teleport Pattern (Autoplay Loop)

When autoplay would advance into the after-clone zone, the carousel **pre-teleports backward before the smooth scroll** rather than scrolling into the clone zone and teleporting after:

1. Disable `scroll-snap-type`
2. Instantly shift `scrollLeft -= count * slideWidth` (invisible — same content at both positions)
3. Re-enable snap in next animation frame
4. Smooth-scroll forward one slide into the real zone

This prevents the black flash and wrong-direction animation that occurs when teleporting after a smooth scroll completes.

### Post-Scroll Teleport (Manual Swipe)

For manual touch swipes that land in the clone zone, `snapFromClone()` fires on `scrollend` (primary) and a 150ms settle timer (fallback). The teleport sequence:

1. Set `isJumping = true`, disable `scroll-snap-type`
2. Shift `scrollLeft` by `±count * slideWidth`
3. Round to nearest slide boundary
4. Re-enable snap after double-`requestAnimationFrame` (ensures paint completed)

## Data Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-carousel-scroll` | `"loop"` / `"simple"` | Allows external code to query and reset carousels by type |

Used by DiscoverScreen to find all simple carousels and scroll them to position 0 on discover reset.

## resetKey Prop

When `resetKey` changes (compared to initial mount value), the carousel smooth-scrolls to the first slide:

- Simple mode: scrolls to `left: 0`
- Looped mode: scrolls to `left: CLONES * slideWidth` (first real slide)
- Restarts autoplay timer after 600ms delay

## Dot Styles

| Style | Prop | Visual |
|-------|------|--------|
| `"mini"` | `dots="mini"` | Small white circles with opacity toggle, updated via direct DOM (no React state) |
| `"pill"` | `dots="pill"` | Wider active pill with width animation, click-navigable, uses React state |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `unknown[]` | — | Array of items to render |
| `renderItem` | `(item, index) => ReactNode` | — | Render function per slide |
| `loop` | `boolean` | `false` | Enable clone-based infinite loop |
| `autoPlay` | `number \| false` | `false` | Auto-advance interval in ms |
| `dots` | `boolean \| "pill" \| "mini"` | `false` | Dot indicator style |
| `dotPosition` | `"below" \| "overlay"` | `"below"` | Dot placement |
| `slideWidth` | `string` | `"100%"` | CSS width per slide |
| `gap` | `number` | `0` | Gap between slides in px |
| `padding` | `string` | `"0"` | Container padding |
| `resetKey` | `number` | — | Increment to animate reset to first slide |
| `style` | `CSSProperties` | `{}` | Container style overrides |

## Per-Slide Styling (Card Galleries)

Maker card galleries apply padding and border radius **per-slide** rather than on the parent:

```tsx
<div style={{ paddingLeft: i === 0 ? 0 : 3, paddingRight: i === urls.length - 1 ? 0 : 3 }}>
    <div style={{ borderRadius: 0, overflow: "hidden" }}>
        <img ... />
    </div>
</div>
```

This prevents border-radius clipping during swipe (parent `overflow: hidden` clips mid-swipe content) and creates visual gaps only between slides, not at edges.
