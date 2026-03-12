import { storageGet, storageSet } from "./storage"

let cachedId: string | null = null

export function getVisitorId(): string {
    if (cachedId) return cachedId

    if (typeof window === "undefined" || !window.localStorage) {
        cachedId = crypto.randomUUID()
        return cachedId
    }

    const stored = storageGet("maven_visitor_id")
    if (stored) {
        cachedId = stored
        return stored
    }

    const id = crypto.randomUUID()
    storageSet("maven_visitor_id", id)
    cachedId = id
    return id
}
