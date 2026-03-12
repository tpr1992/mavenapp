# Animation System

Motion is a core part of Maven's feel. These conventions apply app-wide.

## When to Animate vs Snap

- **Animate** user-triggered state changes (compact/expanded, show/hide, filter selection). The user should see the consequence of their action.
- **Snap** (no transition) for initial render, clone-zone teleports (carousel loop), and any property change that would cause layout thrash if animated (e.g., `position`, `display`, `overflow`).
- **Smooth reset** for user-triggered resets (logo tap, discover tab tap) — carousels animate to slide 0 via `scrollTo({ behavior: "smooth" })`, not instant snap.
- **Never animate on mount.** Elements should appear in their final state. Exception: `fadeSlideIn` for screen-level entrance.

## Durations

| Duration | Use |
|----------|-----|
| `0.15s` | Touch feedback, quick transforms (hover scale, active press) |
| `0.2s` | Button/pill state changes, opacity toggles, color transitions |
| `0.3s` | Maker header morph, general UI transitions, image fade-in |
| `0.35-0.4s` | Discover header morph (content crossfades, font-size, bar chrome, grid-rows) |

`0.3s` is the default for most transitions. The discover header uses `0.4s` because it morphs multiple content elements simultaneously — the longer duration gives the eye time to track the change.

## Easing Curves

| Curve | Name | Feel | When to use |
|-------|------|------|-------------|
| `ease` | CSS default | Gentle, neutral | Simple property changes (opacity, color, font-size). Safe default. |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | **Settle** | Smooth deceleration, no overshoot | Layout-affecting morphs where overshoot would cause visible bounce — padding, height, grid-template-rows. Used on discover header. |
| `cubic-bezier(0.32, 0.72, 0, 1)` | **iOS ease** | Quick start, slight overshoot then settle | Morphs where overshoot feels natural — transform-based animations, carousel tweens, maker header morph. |
| `cubic-bezier(0.32, 0, 0.67, 0)` | **Exit** | Accelerating out | Elements leaving the viewport (bar hide via translateY, dismiss animations). |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | **Spring** | Strong overshoot + bounce-back | Recovery animations only (rubber band snap-back, map card bounce). Never for normal UI transitions. |

**Why two morph curves?** The discover header morphs layout properties inside a fixed-height container — overshoot would cause visible content bounce. The maker header morphs with `height: 0` and overlays content — nothing below it is affected by overshoot, so the iOS-feel curve adds life. Match the curve to the layout context, not the component.

## Keyframe Animations

Defined in `src/styles/index.css`:

| Animation | Effect | Usage |
|-----------|--------|-------|
| `fadeSlideIn` | Fade in + slide up 8px, 0.3s ease | Screen entrances, list items |
| `locationPulse` | Expanding box-shadow ring, 2.5s loop | GPS location dot |
| `shimmer` | Background position sweep | Skeleton loaders |
| `spin` | 360deg rotation, 0.6s linear | Loading spinners |

## Spring Physics (rAF)

For gestures that carry finger velocity — like the image gallery swipe — CSS transitions don't work because the remaining distance after a drag is too small and the animation feels instant. Instead, use `requestAnimationFrame` spring physics via `useSpringSwipe` (`src/hooks/useSpringSwipe.ts`).

| Constant | Value | Effect |
|----------|-------|--------|
| Stiffness | `300` | How quickly the spring pulls toward target |
| Damping | `30` | How quickly oscillation decays |
| Settle threshold | `< 0.5px` displacement, `< 50px/s` velocity | When to snap to final position |

The spring carries the finger's release velocity into the animation, decelerating naturally. This matches iOS Photos app behavior. See [image-gallery.md](../components/image-gallery.md) for full details.

## Transition Scoping Rule

**Never use `transition: "all ..."`**. Always list specific properties:

```tsx
// Bad — catches layout properties, prevents compositor optimization
transition: "all 0.2s ease"

// Good — only animates visual properties on compositor thread
transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease"
```

`all` transitions are banned because they animate `width`, `height`, `margin`, and other layout properties even when only color/opacity changes are intended, forcing main-thread reflow on every frame.

## Compositor-Thread Animations

Prefer native browser mechanisms over JS-driven alternatives:

- **`scrollTo({ behavior: "smooth" })`** — compositor thread, native refresh rate. Used for all Carousel navigation (autoplay, dot clicks, resets).
- **`transform: translateX()`** — compositor-friendly position changes. Use instead of `left` property for slide/toggle animations.
- **CSS `transition`** on `transform`, `opacity` — these run on compositor thread when properly scoped.
- **`height` animations** are inherently main-thread — acceptable for infrequent transitions (SwipeableMapCard expand/collapse) but avoid in scroll-driven animations.
