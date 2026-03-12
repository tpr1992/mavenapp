import { useState, useCallback } from "react"
import { storageGet, storageSet } from "../utils/storage"

const COMPLETE_KEY = "maven_onboarding_complete" as const

export default function useOnboarding() {
    const [isComplete, setIsComplete] = useState(() => {
        return storageGet(COMPLETE_KEY) === "true"
    })

    const completeOnboarding = useCallback(() => {
        storageSet(COMPLETE_KEY, "true")
        setIsComplete(true)
    }, [])

    return { isComplete, completeOnboarding }
}
