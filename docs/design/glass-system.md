# Liquid Glass System

Apple-inspired "Liquid Glass" material system (`src/utils/glass.ts`) for translucent, frosted elements. Core part of Maven's visual identity.

## Variants

| Variant | Helper | Usage | Where used |
|---------|--------|-------|------------|
| **Standard** | `glassStyle(isDark)` | Floating elements — pills, cards, modals, elevated search | CategoryPills, SearchBar (elevated), SwipeableMapCard |
| **Bar** | `glassBarStyle(isDark)` | Navigation bars — denser/more opaque for text readability | DiscoverHeader (compact), MakerProfileHeader (compact), TabBar |
| **Overlay** | `GLASS.overlay` | Buttons/badges on top of images — always dark-tinted regardless of theme | MakerProfileHeader hero buttons, MadeInIrelandBadge |

## Token Values

All variants share `backdrop-filter: blur(20px) saturate(1.4)`. The difference is opacity and tint:

| Variant | Dark bg | Light bg |
|---------|---------|----------|
| Standard | `rgba(0,0,0,0.20)` | `rgba(255,255,255,0.55)` |
| Bar | `rgba(18,18,18,0.85)` | `rgba(250,248,244,0.85)` |
| Overlay | `rgba(20,20,20,0.35)` | (same — always dark) |

## How to Apply

Always use object spread. The helpers return objects with `background`, `border`, `backdropFilter`, `WebkitBackdropFilter`, and `boxShadow`.

```tsx
import { glassStyle, glassBarStyle, GLASS } from "../../utils/glass"

// Standard glass (floating element)
<div style={{ ...glassStyle(isDark), borderRadius: 14 }}>

// Bar glass (navigation)
<div style={{ ...glassBarStyle(isDark) }}>

// Overlay glass (on images — always dark)
<button style={{ ...GLASS.overlay }}>
```

Override individual properties after the spread when needed (e.g., `borderBottom` instead of `border` for navigation bars).

## When NOT to Use Glass

Don't apply glass to: card backgrounds (use `theme.card`), list items, form inputs, text-heavy content areas, or any element inside a scroll container that moves on every frame.

Glass is for **floating chrome** — headers, tab bars, overlays, badges.

## Performance Cost

Glass is expensive — every glass element forces the browser to composite and blur the layers behind it. **Limit to 2-3 glass elements visible simultaneously.** Never apply glass to masonry grid cards, list items, or anything that repaints during scroll.

## Killing Glass During Animations

`glassBarOpaque(isDark)` returns a solid RGB fallback that visually matches the glass bar without the blur cost. `killFrost()` and `restoreFrost()` are **inline helper functions defined inside scroll handler effects** (not exported from glass.ts):

```tsx
// Defined inside the scroll handler useEffect, not exported
const killFrost = (bar: HTMLDivElement) => {
    bar.style.backdropFilter = "none"
    bar.style.webkitBackdropFilter = "none"
    bar.style.background = glassBarOpaque(isDark)
}
const restoreFrost = (bar: HTMLDivElement) => {
    bar.style.backdropFilter = g.backdropFilter
    bar.style.webkitBackdropFilter = g.WebkitBackdropFilter
    bar.style.background = g.background
}
```

Call `killFrost()` when entering rubber band drag, `restoreFrost()` when the animation resolves.
