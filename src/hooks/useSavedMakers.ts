import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

export default function useSavedMakers() {
    const { user } = useAuth()
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

    // Fetch saves when user changes
    useEffect(() => {
        if (!user) {
            setSavedIds(new Set())
            return
        }

        let cancelled = false

        async function fetchSaves() {
            const { data, error } = await supabase.from("user_saves").select("maker_id").eq("user_id", user!.id)

            if (cancelled || error) return
            setSavedIds(new Set((data as Array<{ maker_id: string }>).map((r) => r.maker_id)))
        }

        fetchSaves()
        return () => {
            cancelled = true
        }
    }, [user])

    const toggleSave = useCallback(
        async (makerId: string) => {
            if (!user) return

            // Read current state via updater to avoid stale closure
            let wasSaved = false
            setSavedIds((prev) => {
                wasSaved = prev.has(makerId)
                const next = new Set(prev)
                if (wasSaved) {
                    next.delete(makerId)
                } else {
                    next.add(makerId)
                }
                return next
            })

            if (wasSaved) {
                const { error } = await supabase
                    .from("user_saves")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("maker_id", makerId)

                if (error) {
                    setSavedIds((prev) => new Set([...prev, makerId]))
                }
            } else {
                const { error } = await supabase.from("user_saves").insert({ user_id: user.id, maker_id: makerId })

                if (error) {
                    setSavedIds((prev) => {
                        const next = new Set(prev)
                        next.delete(makerId)
                        return next
                    })
                }
            }
        },
        [user],
    )

    return { savedIds, toggleSave }
}
