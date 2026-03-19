import { useTheme } from "../../contexts/ThemeContext"
import { GLASS } from "../../utils/glass"
import { font } from "../../styles/tokens"

interface IrishFlagProps {
    width?: number
    height?: number
}

const IrishFlag = ({ width = 14, height = 10 }: IrishFlagProps) => (
    <svg width={width} height={height} viewBox="0 0 20 14" style={{ borderRadius: 0, flexShrink: 0 }}>
        <rect x="0" y="0" width="7" height="14" fill="#169B62" />
        <rect x="7" y="0" width="6" height="14" fill="#fff" />
        <rect x="13" y="0" width="7" height="14" fill="#FF883E" />
    </svg>
)

/**
 * "Made in Ireland" badge with rectangular flag.
 * variant="hero" — glass pill for use on colored hero backgrounds (white text)
 * variant="card" — subtle pill for use on card surfaces (themed text)
 */
interface MadeInIrelandBadgeProps {
    variant?: "card" | "hero"
}

export default function MadeInIrelandBadge({ variant = "card" }: MadeInIrelandBadgeProps) {
    const { theme } = useTheme()

    if (variant === "hero") {
        return (
            <span
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 0,
                    background: GLASS.overlay.background,
                    backdropFilter: GLASS.overlay.backdropFilter,
                    WebkitBackdropFilter: GLASS.overlay.WebkitBackdropFilter,
                    border: GLASS.overlay.border,
                    fontFamily: font.body,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                }}
            >
                Made in Ireland <IrishFlag />
            </span>
        )
    }

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 0,
                background: theme.pill,
                fontFamily: font.body,
                fontSize: 11,
                fontWeight: 500,
                color: theme.textSecondary,
                whiteSpace: "nowrap",
                flexShrink: 0,
            }}
        >
            Made in Ireland <IrishFlag />
        </span>
    )
}
