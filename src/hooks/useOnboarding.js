import { useState, useCallback } from "react"

const COMPLETE_KEY = "maven_onboarding_complete"
const CATEGORIES_KEY = "maven_preferred_categories"

export default function useOnboarding() {
  const [isComplete, setIsComplete] = useState(() => {
    return localStorage.getItem(COMPLETE_KEY) === "true"
  })

  const completeOnboarding = useCallback((categories = []) => {
    localStorage.setItem(COMPLETE_KEY, "true")
    if (categories.length > 0) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
    }
    setIsComplete(true)
  }, [])

  const getPreferredCategories = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || []
    } catch {
      return []
    }
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(COMPLETE_KEY)
    localStorage.removeItem(CATEGORIES_KEY)
    setIsComplete(false)
  }, [])

  return { isComplete, completeOnboarding, getPreferredCategories, resetOnboarding }
}
