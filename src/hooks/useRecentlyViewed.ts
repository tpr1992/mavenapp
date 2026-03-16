import { useState, useCallback, useEffect, useRef } from "react"
import { storageGet, storageSet } from "../utils/storage"
import { supabase } from "../lib/supabase"

const KEY = "maven_recently_viewed"
const DISCOVERED_KEY = "maven_discovered_ids"
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

function loadDiscovered(): string[] {
    try {
        return JSON.parse(storageGet(DISCOVERED_KEY) || "[]")
    } catch {
        return []
    }
}

function save(entries: ViewedEntry[]) {
    storageSet(KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)))
}

function saveDiscovered(ids: string[]) {
    storageSet(DISCOVERED_KEY, JSON.stringify(ids))
}

export default function useRecentlyViewed(userId?: string) {
    const [entries, setEntries] = useState<ViewedEntry[]>(load)
    const [discoveredIds, setDiscoveredIds] = useState<string[]>(loadDiscovered)
    const fetchedRef = useRef(false)

    // On login: fetch from Supabase and merge with localStorage
    useEffect(() => {
        if (!userId || fetchedRef.current) return
        fetchedRef.current = true

        supabase
            .from("profiles")
            .select("discovered_ids")
            .eq("id", userId)
            .single()
            .then(({ data, error }: { data: { discovered_ids: string[] } | null; error: unknown }) => {
                if (error || !data) return
                const remote: string[] = data.discovered_ids ?? []
                if (remote.length === 0) return

                setDiscoveredIds((local) => {
                    const merged = Array.from(new Set([...remote, ...local]))
                    saveDiscovered(merged)
                    // Push merged set back to Supabase if local had extras
                    if (merged.length > remote.length) {
                        supabase.from("profiles").update({ discovered_ids: merged }).eq("id", userId).then()
                    }
                    return merged
                })
            })
    }, [userId])

    // Reset fetch flag on logout
    useEffect(() => {
        if (!userId) fetchedRef.current = false
    }, [userId])

    const recordView = useCallback(
        (makerId: string) => {
            setEntries((prev) => {
                const filtered = prev.filter((e) => e.id !== makerId)
                const updated = [{ id: makerId, at: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
                save(updated)
                return updated
            })
            setDiscoveredIds((prev) => {
                if (prev.includes(makerId)) return prev
                const updated = [...prev, makerId]
                saveDiscovered(updated)
                // Fire-and-forget sync to Supabase
                if (userId) {
                    supabase.from("profiles").update({ discovered_ids: updated }).eq("id", userId).then()
                }
                return updated
            })
        },
        [userId],
    )

    return { recentIds: entries.map((e) => e.id), discoveredIds, recordView }
}
