interface HighlightMatchProps {
    text: string
    query?: string
}

export default function HighlightMatch({ text, query }: HighlightMatchProps) {
    if (!query || !query.trim()) return text

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = text.split(new RegExp(`(${escaped})`, "gi"))

    return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} style={{ background: "#fef3c7", color: "#1a1a1a", borderRadius: 2, padding: "0 1px" }}>
                {part}
            </mark>
        ) : (
            <span key={i}>{part}</span>
        ),
    )
}
