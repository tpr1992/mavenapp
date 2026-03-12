# Image Conventions

All images go through `optimizeImageUrl(url, width, { quality })` from `src/utils/image.ts`. Never use raw URLs. Use `imageSrcSet(url, baseWidth)` for Retina `1x, 2x` srcset. Supabase Storage images are locked to 1.25:1 aspect ratio.

## Quality Presets (`IMG_QUALITY`)

| Preset | Quality | Usage |
|--------|---------|-------|
| `thumbnail` | 60 | Avatars, map pin thumbnails, small gallery previews |
| `default` | 80 | Feed cards, related makers, standard gallery images |
| `hero` | 85 | Hero images, trending carousel |
| `lightbox` | 90 | Full-screen image viewer |

## Standard Widths

| Context | Width | Quality | Notes |
|---------|-------|---------|-------|
| Avatar | `size * 2` | thumbnail | Doubles for Retina crispness |
| Map thumbnail | 120 | default | Pin prefetch on map settle |
| Instagram grid | 150 | default | Small square thumbnails |
| Gallery preview (map card) | 100-200 | thumbnail | Bottom row in SwipeableMapCard |
| Sponsored ad tile | 300 | default | Fixed width in masonry grid |
| Related makers | 300 | default | Horizontal carousel |
| Feed card / masonry | 400-600 | default | With srcset for 2x |
| Hero image | 400 (1x) / 800 (2x) | hero | srcset via `imageSrcSet` |
| Trending carousel | 600 (1x) / 1200 (2x) | hero | Larger since it's prominent |
| Lightbox | 600 (1x) / 1200 (2x) | lightbox | Maximum quality |

## Loading Strategy

- **Hero images**: `loading="eager"`, `fetchPriority="high"`, prefetched on maker tap in App.tsx
- **Above-fold card galleries**: `loading="eager"`, first slide gets `fetchPriority="high"`. Reduces black flash when swiping between slides on slow connections.
- **Everything else**: `loading="lazy"`, `decoding="async"`
- **Always** use `objectFit: "cover"` for aspect-ratio preservation

## Dark Mode Image Filters

- Hero: `filter: "brightness(0.75) saturate(0.9)"` (dark) / `"brightness(0.9) saturate(1)"` (light)
- Trending cards: `filter: "brightness(0.78) saturate(0.85)"` (dark) / `"none"` (light)

## Scrim Gradients (text over images)

- Bottom scrim: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 100%)`
