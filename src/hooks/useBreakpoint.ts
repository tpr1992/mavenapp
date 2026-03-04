import { useState, useEffect } from "react"

export type Breakpoint = "mobile" | "tablet" | "desktop"

function getBreakpoint(width: number): Breakpoint {
    if (width >= 1200) return "desktop"
    if (width >= 768) return "tablet"
    return "mobile"
}

export default function useBreakpoint(): Breakpoint {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => getBreakpoint(window.innerWidth))

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>
        const handleResize = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                setBreakpoint(getBreakpoint(window.innerWidth))
            }, 100)
        }
        window.addEventListener("resize", handleResize)
        return () => {
            clearTimeout(timeout)
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    return breakpoint
}
