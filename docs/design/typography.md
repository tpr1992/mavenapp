# Typography

## Font Families

- **Headings**: `'Playfair Display', serif`
- **Body/everything else**: `'DM Sans', sans-serif`

Both loaded via Google Fonts in `index.html`.

## Size Scale

| Size | Weight | Usage |
|------|--------|-------|
| 9-10px | 500-600 | Uppercase labels, debug badges, map clusters. Always pair with `letterSpacing: "0.08em"` or wider. |
| 11-11.5px | 500 | Status pills, compact filter buttons, small metadata |
| 13-13.5px | 500-600 | Standard body text, list item details, location labels |
| 14-15px | 600 | List item names, card titles, map card headings |
| 19-22px | 700 | Section headings, compact header logo (Playfair) |
| 28-30px | 700 | Page titles, expanded header logo (Playfair) |

## Letter Spacing Conventions

| Context | Value | Rule |
|---------|-------|------|
| Large headings | `-0.02em` to `-0.03em` | Tightens display type |
| Body text | `0` to `0.01em` | Neutral to slight positive |
| Uppercase labels | `0.06em` to `0.14em` | Always pair uppercase with wide tracking |
