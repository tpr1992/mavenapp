import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"

interface SearchHit {
    id: string
    search_rank: number
    search_method: "fulltext" | "fuzzy"
}

export default function useSearch(query: string) {
    const [hits, setHits] = useState<SearchHit[]>([])
    const [searching, setSearching] = useState(false)
    const lastQuery = useRef("")

    const search = useCallback(async (q: string) => {
        const trimmed = q.trim()
        if (!trimmed || trimmed.length < 2) {
            setHits([])
            return
        }

        // Skip if same query
        if (trimmed === lastQuery.current) return
        lastQuery.current = trimmed

        setSearching(true)
        const { data, error } = await supabase.rpc("search_makers", {
            search_query: trimmed,
            match_limit: 20,
        })

        if (error) {
            console.error("search_makers:", error.message)
            setHits([])
        } else {
            setHits((data as SearchHit[]) ?? [])
        }
        setSearching(false)
    }, [])

    useEffect(() => {
        const trimmed = query.trim()
        if (!trimmed) {
            setHits([])
            lastQuery.current = ""
            return
        }
        search(trimmed)
    }, [query, search])

    return { hits, searching }
}
