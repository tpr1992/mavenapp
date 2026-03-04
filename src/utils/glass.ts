/**
 * Apple-style Liquid Glass tokens.
 *
 * Dark mode uses a black base + white edge highlights.
 * Light mode uses a white base + subtle warm border.
 *
 * Reference: Apple iOS 26 "Liquid Glass" material system.
 *
 * Variants:
 * - default:  standard glass for floating elements (pills, cards, modals)
 * - bar:      denser glass for navigation bars (more opaque for readability)
 * - overlay:  glass for buttons/badges on top of images (always dark-style)
 */

const BLUR = "blur(20px) saturate(1.4)"

export const GLASS = {
    dark: {
        background: "rgba(0,0,0,0.20)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    light: {
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(0,0,0,0.06)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
    },
    /** Denser glass for navigation bars — more opaque for text readability */
    barDark: {
        background: "rgba(18,18,18,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        boxShadow: "none",
    },
    barLight: {
        background: "rgba(250,248,244,0.85)",
        border: "1px solid rgba(0,0,0,0.06)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        boxShadow: "none",
    },
    /** Glass for buttons/badges overlaying images — always dark-tinted */
    overlay: {
        background: "rgba(20,20,20,0.35)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    },
} as const

/** Pick standard glass tokens for current theme */
export function glassStyle(isDark: boolean) {
    return isDark ? GLASS.dark : GLASS.light
}

/** Pick bar (navigation) glass tokens for current theme */
export function glassBarStyle(isDark: boolean) {
    return isDark ? GLASS.barDark : GLASS.barLight
}

/**
 * Opaque fallback background for killing backdrop-filter during animations.
 * Removes the blur cost while keeping the same visual tone.
 */
export function glassBarOpaque(isDark: boolean) {
    return isDark ? "rgb(18,18,18)" : "rgb(250,248,244)"
}
