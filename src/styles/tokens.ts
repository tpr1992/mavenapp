/**
 * Design tokens — single source of truth for typography.
 * Colors live in ThemeContext.tsx (light/dark aware). Font stacks live here.
 */

export const font = {
    /** Body text, labels, metadata */
    body: "'DM Sans', sans-serif",
    /** Page headings, section titles, maker names — Syne 700/800 uppercase */
    heading: "'Syne', sans-serif",
    /** Wordmark only — "maven" in Space Grotesk */
    wordmark: "'Space Grotesk', sans-serif",
    /** Pull quotes, editorial lead-in sentences — Instrument Serif italic */
    serif: "'Instrument Serif', serif",
} as const
