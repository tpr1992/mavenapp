import { useState, useCallback } from "react"

const KEY = "debug_mode"

export default function useDebugMode(): [boolean, () => void] {
    const [isDebug, setIsDebug] = useState(() => localStorage.getItem(KEY) === "true")

    const toggleDebug = useCallback(() => {
        setIsDebug((prev) => {
            const next = !prev
            localStorage.setItem(KEY, String(next))
            return next
        })
    }, [])

    return [isDebug, toggleDebug]
}
