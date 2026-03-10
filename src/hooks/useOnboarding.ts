import { useState, useCallback } from "react"

const COMPLETE_KEY = "maven_onboarding_complete"

export default function useOnboarding() {
    const [isComplete, setIsComplete] = useState(() => {
        return localStorage.getItem(COMPLETE_KEY) === "true"
    })

    const completeOnboarding = useCallback(() => {
        localStorage.setItem(COMPLETE_KEY, "true")
        setIsComplete(true)
    }, [])

    return { isComplete, completeOnboarding }
}
