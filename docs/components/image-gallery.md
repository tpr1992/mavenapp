# Image Gallery Lightbox

Full-screen image viewer with spring-physics swiping, pinch-to-zoom, and double-tap zoom.

**File:** `src/components/modals/ImageGalleryModal.tsx`
**Hook:** `src/hooks/useSpringSwipe.ts`

## Architecture

The lightbox uses **manual transforms** (not native scroll) because pinch-to-zoom and pan conflict with browser scroll behavior. All gesture handling runs via refs for 60fps — no React state during touch interactions.

Two layers of transforms:
- **Container strip** (`containerRef`): `translateX` positions the slide strip horizontally. Managed by `useSpringSwipe`.
- **Active slide** (`slideRef`): `translate + scale` for zoom/pan on the current image. Managed locally in the component.

## useSpringSwipe Hook

Reusable spring-physics swipe engine. Decoupled from the lightbox so it can power any transform-based carousel.

### How It Works

1. **Drag phase**: Touch moves update `swipeX` and call `onTransform` with the current offset. Axis locks after 8px of movement (horizontal = swipe, vertical = ignored).

2. **Velocity tracking**: Records touch positions over the last 100ms. Seeds with the start position on first move so even single-frame fast swipes have ≥2 data points.

3. **Swipe decision**: On touch end, computes finger velocity (px/s). Advances if drag exceeds 20% of viewport OR velocity exceeds 500 px/s.

4. **Spring animation**: `requestAnimationFrame` loop with spring physics (stiffness: 300, damping: 30). Starts at current position with finger's release velocity, decelerates naturally toward target slide. Settles when displacement < 0.5px and velocity < 50px/s.

5. **Fast flick detection**: When zero `touchmove` events fire (ultra-fast swipe), computes velocity from `touchstart → touchend` position and elapsed time via `changedTouches[0].clientX`.

### Internal Index Ref

The hook tracks a `visualIndex` ref (`idx`) that updates immediately when a swipe target is decided — before React state catches up via `onIndexChange`. This solves rapid-fire swiping: when you interrupt a mid-flight spring with a new touch, the next gesture calculates positions from where the carousel is heading, not from stale React state.

**Critical ordering in `end()`:**
```
springTo(...)    // reads idx.current for starting position
idx.current = targetIndex  // AFTER springTo captured the start
```

Reversing this order causes the spring to start at the target (no animation).

### Config

| Prop | Default | Description |
|------|---------|-------------|
| `count` | — | Number of slides |
| `index` | — | React state index (synced to internal ref) |
| `viewportWidth` | `window.innerWidth` | Slide width in px |
| `threshold` | `0.2` | Min drag ratio to advance |
| `velocityThreshold` | `500` | Min finger velocity (px/s) for fast swipe |
| `stiffness` | `300` | Spring constant — higher = snappier |
| `damping` | `30` | Friction — higher = less oscillation |
| `rubberBand` | `0.3` | Edge resistance factor |
| `onIndexChange` | — | Called when spring settles |
| `onTransform` | — | Called every frame with translateX offset |

### Usage

```tsx
const swipe = useSpringSwipe({
    count: items.length,
    index,
    onIndexChange: setIndex,
    onTransform: (offset) => {
        el.style.transition = "none"
        el.style.transform = `translateX(${offset}px)`
    },
})

// Wire to touch events:
onTouchStart → swipe.start(e.touches[0].clientX)
onTouchMove  → swipe.move(clientX, clientY, startY, () => e.preventDefault())
onTouchEnd   → swipe.end(e.changedTouches[0]?.clientX)

// Programmatic navigation (arrow buttons, keyboard):
swipe.goTo(index + 1)  // spring-animates to target, bounds-checked internally
```

### `goTo(targetIndex)`

Animates to a specific slide with zero initial velocity — the spring pulls from rest, giving a clean ease-out feel (~300ms). Used for arrow buttons and keyboard navigation so they match the swipe animation instead of jumping instantly. Bounds-checked internally (ignores out-of-range or same-index calls).

## Image Loading Strategy

All gallery images get their `src` set at mount — no sliding window. Maker galleries are small (3-8 images), so loading all at lightbox quality (~200-400KB each after `optimizeImageUrl`) is 1-3MB total.

- **`loading="eager"`** for ±1 slides (browser prioritizes these)
- **`loading="lazy"`** for the rest (browser loads in background)
- **Images freed on close** — lightbox unmounts, removing all `<img>` elements

### Scaling to Large Galleries

If galleries grow to 20+ images or include video:

- **Sliding window**: Gate `src` using the hook's `visualIndex` ref, not React state:
  ```tsx
  const nearby = Math.abs(i - index) <= 2 || Math.abs(i - swipe.visualIndex.current) <= 2
  ```
- **Video**: Render thumbnail placeholder in the slide. Mount `<video>` only for active slide (`i === index`). Destroy on swipe away.

## Gesture Routing

The component manages three gesture types:

| Gesture | Trigger | Handler |
|---------|---------|---------|
| **Swipe** | Single finger at scale 1 | `useSpringSwipe` hook |
| **Pan** | Single finger while zoomed | Local `tx`/`ty` refs + `clampTranslate()` |
| **Pinch** | Two fingers | Local `scale` ref with focal-point zoom |

Gesture type is decided in `onTouchStart` and doesn't change mid-gesture.

## Zoom

- **Pinch**: Zooms toward pinch midpoint (focal-point). Min 1x, max 4x. Snaps back to 1x if released below 1.1x.
- **Double-tap**: Toggles between 1x and 2.5x centered on tap point.
- **Pan bounds**: When zoomed, `clampTranslate()` prevents dragging the image off-screen.

## vs Carousel Component

| | `ImageGalleryModal` | `Carousel` (`ui/Carousel.tsx`) |
|---|---|---|
| **Scroll method** | Manual transforms via `useSpringSwipe` | Native `overflow-x: auto` + `scroll-snap-type` |
| **Momentum** | Spring physics (rAF loop) | iOS native scroll momentum |
| **Zoom** | Pinch + double-tap | None |
| **Loop** | No | Optional (clone-based) |
| **Used by** | Maker profile image lightbox | Card galleries, trending carousel |

The existing `Carousel` doesn't need `useSpringSwipe` — native scroll already provides iOS-like momentum. The hook is for cases where manual transforms are required (zoom, custom gesture routing).
