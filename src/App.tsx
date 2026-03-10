import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react"
import useSavedMakers from "./hooks/useSavedMakers"
import useMakers from "./hooks/useMakers"
import { supabase } from "./lib/supabase"
import useSponsoredPosts from "./hooks/useSponsoredPosts"
import useDebugMode from "./hooks/useDebugMode"
import useFeedLayout from "./hooks/useFeedLayout"
import useProfileName from "./hooks/useProfileName"
import useUserLocation from "./hooks/useUserLocation"
import useOnboarding from "./hooks/useOnboarding"
import { useAuth } from "./contexts/AuthContext"
import { useTheme } from "./contexts/ThemeContext"
import useBreakpoint from "./hooks/useBreakpoint"
import { optimizeImageUrl, IMG_QUALITY } from "./utils/image"
import { getVisitorId } from "./utils/visitor"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import TabBar from "./components/layout/TabBar"
import DiscoverScreen from "./screens/DiscoverScreen"
import MakerProfile from "./screens/MakerProfile"
import type { Maker } from "./types"
import type { Theme } from "./types"

import SavedScreen from "./screens/SavedScreen"
import ProfileScreen from "./screens/ProfileScreen"

const mapImport = () => import("./screens/MapScreen")
const MapScreen = lazy(mapImport)
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
    const {
        makers,
        loading: makersLoading,
        error: makersError,
        refetch,
        p95Engagement,
        isLowData,
        makersWithClicks,
        totalMakers,
    } = useMakers(userLocation)
    const debugMeta = useMemo(
        () => ({ p95Engagement, isLowData, makersWithClicks, totalMakers }),
        [p95Engagement, isLowData, makersWithClicks, totalMakers],
    )
    const [isDebug, toggleDebug] = useDebugMode()
    const [feedLayout, setFeedLayout] = useFeedLayout()
    const { sponsoredPosts } = useSponsoredPosts(userLocation)
    const { user } = useAuth()
    const profileName = useProfileName(user)
    const { savedIds, toggleSave } = useSavedMakers()
    const { isComplete: onboardingComplete, completeOnboarding } = useOnboarding()
    const { theme } = useTheme()
    const breakpoint = useBreakpoint()
    const [discoverCategory, setDiscoverCategory] = useState("All")
    const [discoverOpenNow, setDiscoverOpenNow] = useState(false)
    const [discoverKey, setDiscoverKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollPosRef = useRef(0)
    const tabScrollRef = useRef<Record<string, number>>({})

    const handleMakerTap = useCallback(
        (maker: Maker) => {
            // Preload hero image so it's cached before MakerProfile renders
            const heroUrl = maker.gallery_urls?.[0]
            if (heroUrl) {
                const img = new window.Image()
                img.src = optimizeImageUrl(heroUrl, 800, { quality: IMG_QUALITY.hero }) ?? ""
            }
            if (containerRef.current) scrollPosRef.current = containerRef.current.scrollTop
            history.pushState({ maker: maker.slug, tab: activeTab }, "", buildURL(activeTab, maker.slug))
            setSelectedMaker(maker)
            if (containerRef.current) containerRef.current.scrollTop = 0
            // Fire-and-forget click tracking
            supabase.rpc("record_maker_click", { p_maker_id: maker.id, p_visitor_id: getVisitorId() }).then()
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
            if (tab === "discover") {
                refetch()
                setDiscoverKey((k) => k + 1)
                setDiscoverCategory("All")
                setDiscoverOpenNow(false)
                tabScrollRef.current["discover"] = 0
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" })
                })
            } else {
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.scrollTop = tabScrollRef.current[tab] || 0
                })
            }
        },
        [activeTab, refetch],
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

    // Preload map chunk so first tab switch is instant
    useEffect(() => {
        const id = setTimeout(mapImport, 1000)
        return () => clearTimeout(id)
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
                <MakerProfile
                    maker={selectedMaker}
                    makers={makers}
                    onBack={handleBack}
                    isSaved={savedIds.has(selectedMaker.id)}
                    onToggleSave={handleToggleSave}
                    onMakerTap={handleMakerTap}
                    scrollContainerRef={containerRef}
                    onLogoTap={handleLogoTap}
                    breakpoint={breakpoint}
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
                            isDebug={isDebug}
                        />
                    </Suspense>
                )
            case "saved":
                return (
                    <SavedScreen
                        makers={makers}
                        makersLoading={makersLoading}
                        onMakerTap={handleMakerTap}
                        savedIds={savedIds}
                        onToggleSave={handleToggleSave}
                        onTabChange={handleTabChange}
                        onLogoTap={handleLogoTap}
                        breakpoint={breakpoint}
                    />
                )
            case "profile":
                return (
                    <ProfileScreen
                        isDebug={isDebug}
                        toggleDebug={toggleDebug}
                        makers={makers}
                        refetch={refetch}
                        feedLayout={feedLayout}
                        setFeedLayout={setFeedLayout}
                        onLogoTap={handleLogoTap}
                        profileName={profileName}
                    />
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
                maxWidth: "var(--app-max-width)",
                margin: "0 auto",
                height: "100vh",
                background: theme.bg,
                position: "relative",
                overflow: "hidden",
                fontFamily: "'DM Sans', sans-serif",
                borderLeft: "var(--app-border)",
                borderRight: "var(--app-border)",
            }}
        >
            <div
                ref={containerRef}
                style={{
                    height: "100vh",
                    overflowY: "auto",
                    overflowX: "hidden",
                    paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
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
                            refreshKey={discoverKey}
                            onOpenNowChange={setDiscoverOpenNow}
                            isDebug={isDebug}
                            debugMeta={debugMeta}
                            feedLayout={feedLayout}
                            setFeedLayout={setFeedLayout}
                            breakpoint={breakpoint}
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
