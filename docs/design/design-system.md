# Design System

## Brand Principles

- Monochrome, minimal, editorial aesthetic
- Dark mode is the default (`isDark: true` on first visit)
- Apple-inspired Liquid Glass material for floating chrome
- Motion is a core part of the feel — not decorative

## Layout & Spacing

- **Page horizontal padding**: 16px standard, 20px for headers and hero sections
- **Card internal padding**: 16px
- **Gaps between flex items**: 6px (tight/pills), 10px (standard), 12px (medium), 16px (large/sections)
- **No base-8 grid** — spacing is visual, not systematic. Use what looks right, but stay within the values above.
- **Border radius**: 12px (small), 14px (cards/inputs), 18-20px (large cards), 100px (pills/buttons)

## Styling Rules

- All styling is inline JS objects — no CSS classes, CSS modules, or styled-components
- The only CSS file is `src/styles/index.css` for resets and keyframe animations
- Always use `theme.*` tokens from `useTheme()` — never hardcode hex values for themed properties
- `pointerEvents: "none"` on non-interactive text overlaying touch targets (critical for iOS Safari)

## Glass Usage

Glass is for **floating chrome** — headers, tab bars, overlays, badges. If the element is part of the content flow rather than floating above it, use solid theme colors. See [glass-system.md](glass-system.md) for full details.

## Component Tone

- Clean, minimal — no decorative borders or shadows on content cards
- Subtle hierarchy through font weight and color, not size
- Cards use `theme.card` background with `theme.border` — no drop shadows
- Status indicators (open/closed) use semantic green/red, not theme colors
