# Typography

## Font Families

- **Headings/maker names**: `'Syne', sans-serif` — 700-800 weight, uppercase, wide tracking
- **Wordmark**: `'Space Grotesk', sans-serif` — 700 weight, tight tracking (-0.03em)
- **Pull quotes**: `'Instrument Serif', serif` — italic
- **Body/everything else**: `'DM Sans', sans-serif`

All loaded via Google Fonts in `index.html`.

## Size Scale

| Size | Weight | Usage |
|------|--------|-------|
| 9-10px | 500-600 | Uppercase labels, debug badges, map clusters. Always pair with `letterSpacing: "0.08em"` or wider. |
| 11-11.5px | 500 | Status pills, compact filter buttons, small metadata |
| 13-13.5px | 500-600 | Standard body text, list item details, location labels |
| 14-16px | 700 | Section headings (Syne uppercase), card titles |
| 17px | italic | Pull quotes (Instrument Serif) |
| 20-22px | 700 | Compact header wordmark (Space Grotesk) |
| 28-30px | 700 | Expanded header wordmark (Space Grotesk) |

## Letter Spacing Conventions

| Context | Value | Rule |
|---------|-------|------|
| Syne headings | `0.05em` | Standard section heading tracking |
| Wordmark | `-0.03em` | Tightens display type |
| Body text | `0` to `0.01em` | Neutral to slight positive |
| Uppercase labels | `0.06em` to `0.14em` | Always pair uppercase with wide tracking |
