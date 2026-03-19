import { createContext, useContext, useMemo, type ReactNode } from "react"
import useMakers from "../hooks/useMakers"
import useSavedMakers from "../hooks/useSavedMakers"
import type { Maker } from "../types"

interface MakersContextValue {
    makers: Maker[]
    loading: boolean
    error: string | null
    refetch: () => void
    p95Engagement: number
    isLowData: boolean
    makersWithClicks: number
    totalMakers: number
    savedIds: Set<string>
    toggleSave: (makerId: string) => void
}

const MakersContext = createContext<MakersContextValue | null>(null)

interface MakersProviderProps {
    userLocation: { lat: number; lng: number } | null
    children: ReactNode
}

export function MakersProvider({ userLocation, children }: MakersProviderProps) {
    const { makers, loading, error, refetch, p95Engagement, isLowData, makersWithClicks, totalMakers } =
        useMakers(userLocation)

    const { savedIds, toggleSave } = useSavedMakers()

    const value = useMemo<MakersContextValue>(
        () => ({
            makers,
            loading,
            error,
            refetch,
            p95Engagement,
            isLowData,
            makersWithClicks,
            totalMakers,
            savedIds,
            toggleSave,
        }),
        [
            makers,
            loading,
            error,
            refetch,
            p95Engagement,
            isLowData,
            makersWithClicks,
            totalMakers,
            savedIds,
            toggleSave,
        ],
    )

    return <MakersContext.Provider value={value}>{children}</MakersContext.Provider>
}

export function useMakersContext() {
    const ctx = useContext(MakersContext)
    if (!ctx) throw new Error("useMakersContext must be used within MakersProvider")
    return ctx
}

/** Convenience hook — just the saved state */
export function useSavedContext() {
    const { savedIds, toggleSave } = useMakersContext()
    return { savedIds, toggleSave }
}

/** Convenience hook — just the debug metadata */
export function useDebugMeta() {
    const { p95Engagement, isLowData, makersWithClicks, totalMakers } = useMakersContext()
    return { p95Engagement, isLowData, makersWithClicks, totalMakers }
}
