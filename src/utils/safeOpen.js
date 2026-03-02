/**
 * Safely open an external URL — blocks javascript: and data: URIs,
 * and adds noopener/noreferrer to prevent reverse tabnapping.
 */
export function safeOpen(url) {
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
