import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react"
import useSavedMakers from "./hooks/useSavedMakers"
import useMakers from "./hooks/useMakers"
import { supabase } from "./lib/supabase"
import useSponsoredPosts from "./hooks/useSponsoredPosts"
import useUserLocation from "./hooks/useUserLocation"
import useOnboarding from "./hooks/useOnboarding"
import { useAuth } from "./contexts/AuthContext"
import { useTheme } from "./contexts/ThemeContext"
import { optimizeImageUrl } from "./utils/image"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import TabBar from "./components/layout/TabBar"
import DiscoverScreen from "./screens/DiscoverScreen"
import MakerProfileV2 from "./screens/MakerProfileV2"
import type { Maker } from "./types"
import type { Theme } from "./types"

const MapScreen = lazy(() => import("./screens/MapScreen"))
const SavedScreen = lazy(() => import("./screens/SavedScreen"))
const ProfileScreen = lazy(() => import("./screens/ProfileScreen"))
const OnboardingScreen = lazy(() => import("./screens/OnboardingScreen"))

function getStateFromURL() {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab") || "discover"
    const makerSlug = params.get("maker")
    return { tab, makerSlug }
}

function buildURL(tab: string, makerSlug?: string | null) {
    const params = new URLSearchParams()
    if (tab && tab !== "discover") params.set("tab", tab)
    if (makerSlug) params.set("maker", makerSlug)
    const qs = params.toString()
    return qs ? "/?" + qs : "/"
}

function ScreenPlaceholder({ theme }: { theme: Theme }) {
    return (
        <div style={{ padding: "20px 16px", animation: "fadeIn 0.2s ease" }}>
            <div style={{ width: 100, height: 28, borderRadius: 8, background: theme.surface, marginBottom: 8 }} />
            <div style={{ width: 180, height: 14, borderRadius: 6, background: theme.surface }} />
        </div>
    )
}

export default function App() {
    const initialURL = useRef(getStateFromURL())
    const [activeTab, setActiveTab] = useState(initialURL.current.tab)
    const [selectedMaker, setSelectedMaker] = useState<Maker | null>(null)
    const deepLinkResolved = useRef(false)
    const [authToast, setAuthToast] = useState(false)
    const { userLocation, locationLabel, locationSource, setLocation } = useUserLocation()
    const { makers, loading: makersLoading, error: makersError, refetch } = useMakers(userLocation)
    const { sponsoredPosts } = useSponsoredPosts(userLocation)
    const { user } = useAuth()
    const { savedIds, toggleSave } = useSavedMakers()
    const { isComplete: onboardingComplete, completeOnboarding } = useOnboarding()
    const { theme } = useTheme()
    const [discoverCategory, setDiscoverCategory] = useState(() => {
        try {
            const prefs = JSON.parse(localStorage.getItem("maven_preferred_categories") || "[]")
            if (prefs.length === 1) return prefs[0]
        } catch {}
        return "All"
    })
    const [discoverOpenNow, setDiscoverOpenNow] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollPosRef = useRef(0)
    const tabScrollRef = useRef<Record<string, number>>({})

    const handleMakerTap = useCallback(
        (maker: Maker) => {
            // Preload hero image so it's cached before MakerProfileV2 renders
            const heroUrl = maker.gallery_urls?.[0]
            if (heroUrl) {
                const img = new window.Image()
                img.src = optimizeImageUrl(heroUrl, 400) ?? ""
            }
            if (containerRef.current) scrollPosRef.current = containerRef.current.scrollTop
            history.pushState({ maker: maker.slug, tab: activeTab }, "", buildURL(activeTab, maker.slug))
            setSelectedMaker(maker)
            if (containerRef.current) containerRef.current.scrollTop = 0
            // Fire-and-forget click tracking
            supabase.from("maker_clicks").insert({ maker_id: maker.id }).then()
        },
        [activeTab],
    )

    const handleBack = useCallback(() => {
        history.back()
    }, [])

    const handleTabChange = useCallback(
        (tab: string) => {
            if (containerRef.current) tabScrollRef.current[activeTab] = containerRef.current.scrollTop
            history.pushState({ tab }, "", buildURL(tab))
            setSelectedMaker(null)
            setActiveTab(tab)
            requestAnimationFrame(() => {
                if (containerRef.current) containerRef.current.scrollTop = tabScrollRef.current[tab] || 0
            })
        },
        [activeTab],
    )

    const handleScrollToTop = useCallback(() => {
        if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    const handleToggleSave = useCallback(
        (makerId: string) => {
            if (!user) {
                setAuthToast(true)
                setTimeout(() => setAuthToast(false), 2500)
                return
            }
            toggleSave(makerId)
        },
        [user, toggleSave],
    )

    const handleLogoTap = useCallback(() => {
        handleTabChange("discover")
        handleScrollToTop()
        setDiscoverCategory("All")
        setDiscoverOpenNow(false)
    }, [handleTabChange, handleScrollToTop])

    // Replace initial history entry with proper state
    useEffect(() => {
        const { tab, makerSlug } = initialURL.current
        history.replaceState({ tab, maker: makerSlug || null }, "", buildURL(tab, makerSlug))
    }, [])

    // Listen to popstate (browser back/forward)
    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            // URL is always current when popstate fires — use as primary source
            // to handle iOS Chrome/Safari which can lose history.state
            const urlState = getStateFromURL()
            const tab = urlState.tab || e.state?.tab || "discover"
            const makerSlug = urlState.makerSlug || e.state?.maker || null

            setActiveTab(tab)

            if (makerSlug) {
                const maker = makers.find((m) => m.slug === makerSlug)
                setSelectedMaker(maker || null)
            } else {
                setSelectedMaker(null)
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.scrollTop = scrollPosRef.current
                })
            }
        }

        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [makers])

    // Resolve deep-link on initial load
    useEffect(() => {
        if (deepLinkResolved.current || !makers.length) return
        const { makerSlug } = initialURL.current
        if (makerSlug) {
            const maker = makers.find((m) => m.slug === makerSlug)
            if (maker) setSelectedMaker(maker)
        }
        deepLinkResolved.current = true
    }, [makers])

    const renderScreen = () => {
        if (selectedMaker) {
            return (
                <MakerProfileV2
                    maker={selectedMaker}
                    makers={makers}
                    onBack={handleBack}
                    isSaved={savedIds.has(selectedMaker.id)}
                    onToggleSave={handleToggleSave}
                    onMakerTap={handleMakerTap}
                    scrollContainerRef={containerRef}
                    onLogoTap={handleLogoTap}
                />
            )
        }

        switch (activeTab) {
            case "discover":
                return null
            case "map":
                return (
                    <Suspense fallback={<ScreenPlaceholder theme={theme} />}>
                        <MapScreen
                            makers={makers}
                            onMakerTap={handleMakerTap}
                            savedIds={savedIds}
                            onToggleSave={handleToggleSave}
                            userLocation={userLocation}
                        />
                    </Suspense>
                )
            case "saved":
                return (
                    <Suspense fallback={<ScreenPlaceholder theme={theme} />}>
                        <SavedScreen
                            makers={makers}
                            makersLoading={makersLoading}
                            onMakerTap={handleMakerTap}
                            savedIds={savedIds}
                            onToggleSave={handleToggleSave}
                            onTabChange={handleTabChange}
                        />
                    </Suspense>
                )
            case "profile":
                return (
                    <Suspense fallback={<ScreenPlaceholder theme={theme} />}>
                        <ProfileScreen />
                    </Suspense>
                )
            default:
                return null
        }
    }

    if (!onboardingComplete) {
        return (
            <Suspense fallback={<ScreenPlaceholder theme={theme} />}>
                <OnboardingScreen onComplete={completeOnboarding} setLocation={setLocation} />
            </Suspense>
        )
    }

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 430,
                margin: "0 auto",
                height: "100vh",
                background: theme.bg,
                position: "relative",
                overflow: "hidden",
                fontFamily: "'DM Sans', sans-serif",
                borderLeft: `1px solid ${theme.border}`,
                borderRight: `1px solid ${theme.border}`,
            }}
        >
            <div
                ref={containerRef}
                style={{
                    height: "calc(100vh - 64px - env(safe-area-inset-bottom, 0px))",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {activeTab === "discover" && (
                    <div style={{ display: selectedMaker ? "none" : undefined }}>
                        <DiscoverScreen
                            makers={makers}
                            makersLoading={makersLoading}
                            makersError={makersError}
                            onRetry={refetch}
                            onRefresh={refetch}
                            onMakerTap={handleMakerTap}
                            savedIds={savedIds}
                            onToggleSave={handleToggleSave}
                            onScrollToTop={handleScrollToTop}
                            scrollContainerRef={containerRef}
                            locationLabel={locationLabel}
                            locationSource={locationSource}
                            userLocation={userLocation}
                            setLocation={setLocation}
                            sponsoredPosts={sponsoredPosts}
                            isHidden={!!selectedMaker}
                            category={discoverCategory}
                            onCategoryChange={setDiscoverCategory}
                            openNow={discoverOpenNow}
                            onOpenNowChange={setDiscoverOpenNow}
                        />
                    </div>
                )}
                {renderScreen()}
            </div>

            {/* Auth toast */}
            <div
                style={{
                    position: "fixed",
                    bottom: 80,
                    left: "50%",
                    transform: `translateX(-50%) translateY(${authToast ? "0" : "20px"})`,
                    opacity: authToast ? 1 : 0,
                    pointerEvents: authToast ? "auto" : "none",
                    transition: "all 0.3s ease",
                    zIndex: 100,
                }}
            >
                <div
                    onClick={() => {
                        setAuthToast(false)
                        handleTabChange("profile")
                    }}
                    style={{
                        background: theme.btnBg,
                        color: theme.btnText,
                        padding: "12px 20px",
                        borderRadius: 14,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        whiteSpace: "nowrap",
                    }}
                >
                    Sign in to save makers
                </div>
            </div>

            <TabBar
                activeTab={activeTab}
                savedCount={savedIds.size}
                selectedMaker={selectedMaker}
                onTabChange={handleTabChange}
            />
            <SpeedInsights />
            <Analytics />
        </div>
    )
}
