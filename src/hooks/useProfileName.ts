import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

export default function useProfileName(user: User | null) {
    const [profileName, setProfileName] = useState("")

    useEffect(() => {
        if (!user) {
            setProfileName("")
            return
        }
        supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
                if (data?.first_name) setProfileName(data.first_name)
            })
    }, [user])

    return profileName
}
