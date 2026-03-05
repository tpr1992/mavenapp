import { useTheme } from "../../contexts/ThemeContext"

interface HighlightMatchProps {
    text: string
    query?: string
}

export default function HighlightMatch({ text, query }: HighlightMatchProps) {
    const { theme, isDark } = useTheme()
    if (!query || !query.trim()) return text

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = text.split(new RegExp(`(${escaped})`, "gi"))

    return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <mark
                key={i}
                style={{
                    background: isDark ? "rgba(251,191,36,0.25)" : "#fef3c7",
                    color: theme.text,
                    borderRadius: 2,
                    padding: "0 1px",
                }}
            >
                {part}
            </mark>
        ) : (
            <span key={i}>{part}</span>
        ),
    )
}
