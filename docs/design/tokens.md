# Design Tokens

## Theme Tokens

Always use `theme.*` from `useTheme()`. Never hardcode hex values for themed properties.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg` | `#faf8f4` | `#121212` | Page background |
| `card` | `#fff` | `#1e1e1e` | Card backgrounds |
| `surface` | `#f9f7f3` | `#252525` | Muted surface (stats, hours) |
| `pill` | `#f0ece6` | `#2d2d2d` | Filter pill background |
| `text` | `#1a1a1a` | `#e8e6e3` | Headings, primary text |
| `textSecondary` | `#666` | `#a0a0a0` | Body text |
| `textMuted` | `#999` | `#707070` | Metadata, captions |
| `border` | `#e8e4de` | `#333` | Card borders |
| `btnBg` | `#1a1a1a` | `#e8e6e3` | Button background (inverts) |
| `btnText` | `#fff` | `#121212` | Button text (inverts) |
| `tabBg` | `rgba(250,248,244,0.92)` | `rgba(18,18,18,0.92)` | Tab bar background |
| `inputBg` | `#fff` | `#1e1e1e` | Input field background |

## Non-Themed Constants

Same in both modes:

| Token | Value | Usage |
|-------|-------|-------|
| status-open | `#22543d` | Open status green |
| status-closed | `#9b2c2c` | Closed status red |
| saved-active | `#c53030` | Filled heart |
| user-location | `#3B82F6` | Blue dot on map |

## Z-Index Scale

| Z-Index | Usage |
|---------|-------|
| 1-5 | Content stacking (carousel slides, hero scrims, decorative overlays) |
| 20 | TabBar |
| 50 | Sticky headers (DiscoverHeader, MakerProfileHeader) |
| 100 | Toast notifications, auth prompts |
| 1000 | Selected map markers |
