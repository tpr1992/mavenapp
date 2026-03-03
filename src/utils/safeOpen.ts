export function safeOpen(url: string | null | undefined): void {
    if (!url) return
    try {
        const parsed = new URL(url)
        if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
            window.open(url, "_blank", "noopener,noreferrer")
        }
    } catch {
        // invalid URL — do nothing
    }
}
