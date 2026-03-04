import { useState, useCallback } from "react"

export type FeedLayout = "grid" | "single"

const KEY = "maven_feed_layout"

export default function useFeedLayout(): [FeedLayout, (layout: FeedLayout) => void] {
    const [layout, setLayoutState] = useState<FeedLayout>(() => (localStorage.getItem(KEY) as FeedLayout) || "grid")

    const setLayout = useCallback((next: FeedLayout) => {
        localStorage.setItem(KEY, next)
        setLayoutState(next)
    }, [])

    return [layout, setLayout]
}
