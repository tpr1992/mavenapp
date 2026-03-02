import { useState, useCallback } from "react"

const STORAGE_KEY = "maven_recent_searches"
const MAX_SEARCHES = 5

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
        return []
    }
}

export default function useRecentSearches() {
    const [searches, setSearches] = useState(load)

    const addSearch = useCallback((term) => {
        const trimmed = term.trim()
        if (!trimmed) return
        setSearches((prev) => {
            const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_SEARCHES)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const removeSearch = useCallback((term) => {
        setSearches((prev) => {
            const next = prev.filter((s) => s !== term)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const clearAll = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setSearches([])
    }, [])

    return { searches, addSearch, removeSearch, clearAll }
}
