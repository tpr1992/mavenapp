import { useState, useCallback } from "react"
import { storageGet, storageSet } from "../utils/storage"

const KEY = "debug_mode" as const

export default function useDebugMode(): [boolean, () => void] {
    const [isDebug, setIsDebug] = useState(() => storageGet(KEY) === "true")

    const toggleDebug = useCallback(() => {
        setIsDebug((prev) => {
            const next = !prev
            storageSet(KEY, String(next))
            return next
        })
    }, [])

    return [isDebug, toggleDebug]
}
