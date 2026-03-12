import { useState, useCallback } from "react"
import { storageGet, storageSet } from "../utils/storage"

export type FeedLayout = "grid" | "single"

const KEY = "maven_feed_layout" as const

export default function useFeedLayout(): [FeedLayout, (layout: FeedLayout) => void] {
    const [layout, setLayoutState] = useState<FeedLayout>(() => (storageGet(KEY) as FeedLayout) || "grid")

    const setLayout = useCallback((next: FeedLayout) => {
        storageSet(KEY, next)
        setLayoutState(next)
    }, [])

    return [layout, setLayout]
}
