import { useState, useCallback } from "react"
import { storageGet, storageSet } from "../utils/storage"

const KEY = "maven_recently_viewed"
const MAX_ITEMS = 8

interface ViewedEntry {
    id: string
    at: number
}

function load(): ViewedEntry[] {
    try {
        return JSON.parse(storageGet(KEY) || "[]")
    } catch {
        return []
    }
}

function save(entries: ViewedEntry[]) {
    storageSet(KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)))
}

export default function useRecentlyViewed() {
    const [entries, setEntries] = useState<ViewedEntry[]>(load)

    const recordView = useCallback((makerId: string) => {
        setEntries((prev) => {
            const filtered = prev.filter((e) => e.id !== makerId)
            const updated = [{ id: makerId, at: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
            save(updated)
            return updated
        })
    }, [])

    return { recentIds: entries.map((e) => e.id), recordView }
}
