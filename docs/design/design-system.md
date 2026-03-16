# Design System

## Brand Principles

- High-contrast, editorial, fashion-forward aesthetic
- Dark mode is the default (`isDark: true` on first visit) — near-black `#0e0e0e` background
- Sharp corners (0px border radius) on all image cards and grids
- Typography-driven hierarchy: Syne 800 uppercase for headings, DM Sans for body
- Mobile-first always — every decision targets iPhone 375-430px

## Typography

| Font | Weight | Usage |
|------|--------|-------|
| Space Grotesk | 700 | "maven" wordmark only |
| Syne | 800 | Headings, maker names, section titles — always uppercase with letter-spacing |
| DM Sans | 400-700 | Body text, labels, metadata, UI elements |
| Instrument Serif | 400 italic | Pull quotes on maker profiles |

## Layout & Spacing

- **Image grid gaps**: 3px between cards, 3px outer padding
- **Text content padding**: 20px horizontal
- **Border radius**: 0px for image cards, grids, buttons. Round only for avatars and specific UI.
- **No decorative borders or shadows** on content cards
- **Category pills**: plain uppercase text, no borders/backgrounds — active vs muted color only

## Styling Rules

- All styling is inline JS objects — no CSS classes, CSS modules, or styled-components
- The only CSS file is `src/styles/index.css` for resets and keyframe animations
- Always use `theme.*` tokens from `useTheme()` — never hardcode hex values for themed properties
- `pointerEvents: "none"` on non-interactive text overlaying touch targets (critical for iOS Safari)

## Glass Usage

Glass is for **floating chrome** — headers, tab bars, overlays. If the element is part of the content flow rather than floating above it, use solid theme colors. See [glass-system.md](glass-system.md) for full details.

## Component Tone

- Clean, high-contrast — black and white palette, no warm accent colors
- Typography hierarchy through weight (800 vs 400) and case (uppercase vs sentence)
- Tab active indicator: warm white `#f5f5f0`
- Pagination dots: thin rectangular bars (not circles)
- Image overlays: subtle gradients fading to page background `#0e0e0e`

## Maker Profile — Editorial Layout

The WorkTab uses an editorial showcase layout when a maker has 8+ gallery images:
1. Full-width hero (320px)
2. Tight 2-up pair (240px each)
3. Pull quote in Instrument Serif italic (if spotlight_quote exists)
4. Full-width detail (220px)
5. 3-up strip (140px each)
6. Remaining images as 2-column masonry

Falls back to flat masonry grid for < 8 images. The page hero (MakerHero) uses `images[0]`, the WorkTab starts from `images[1]` — no duplicates.

## Messaging

- Real-time via Supabase Realtime WebSockets
- Visitor-to-maker messaging with lazy conversation creation
- Accessed through Profile → Messages sub-view
- Notification bell on profile with recent activity dropdown
- Message likes (double-tap heart), long-press context menu, report system
- Phone/email filtering in messages, content filter for profiles
