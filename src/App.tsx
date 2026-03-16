import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react"
import useInbox from "./hooks/useInbox"
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
import useRecentlyViewed from "./hooks/useRecentlyViewed"
import { optimizeImageUrl, IMG_QUALITY } from "./utils/image"
import { getVisitorId } from "./utils/visitor"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import ErrorBoundary from "./components/ui/ErrorBoundary"
import TabBar from "./components/layout/TabBar"
import DiscoverScreen from "./screens/DiscoverScreen"
import MakerProfile from "./screens/MakerProfile"
import MessagesScreen from "./screens/MessagesScreen"
import ChatView from "./components/messages/ChatView"
import type { Maker, Theme } from "./types"
import type { MapState } from "./screens/MapScreenV2"

import SavedScreen from "./screens/SavedScreen"
import ProfileScreen from "./screens/ProfileScreen"

const mapImport = () => import("./screens/MapScreenV2")
const MapScreen = lazy(mapImport)
const OnboardingScreen = lazy(() => import("./screens/OnboardingScreen"))

function getStateFromURL() {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab") || "discover"
    const makerSlug = params.get("maker")
    const conversation = params.get("conversation")
    const view = params.get("view") as "saved" | "messages" | null
    return { tab, makerSlug, conversation, view }
}

function buildURL(tab: string, makerSlug?: string | null, conversation?: string | null, view?: string | null) {
    const params = new URLSearchParams()
    if (tab && tab !== "discover") params.set("tab", tab)
    if (makerSlug) params.set("maker", makerSlug)
    if (view) params.set("view", view)
    if (conversation) params.set("conversation", conversation)
    const qs = params.toString()
    return qs ? "/?" + qs : "/"
}

function ScreenPlaceholder({ theme }: { theme: Theme }) {
    return (
        <div style={{ padding: "20px 16px", animation: "fadeIn 0.2s ease" }}>
            <div style={{ width: 100, height: 28, borderRadius: 0, background: theme.surface, marginBottom: 8 }} />
            <div style={{ width: 180, height: 14, borderRadius: 0, background: theme.surface }} />
        </div>
    )
}

export default function App() {
    const initialURL = useRef(getStateFromURL())
    const [activeTab, setActiveTab] = useState(initialURL.current.tab)
    const [selectedMaker, setSelectedMaker] = useState<Maker | null>(null)
    const deepLinkResolved = useRef(false)
    const [selectedConversation, setSelectedConversation] = useState<{ id: string | null; makerId: string } | null>(
        null,
    )
    const [authToast, setAuthToast] = useState(false)
    const authToastTimer = useRef<ReturnType<typeof setTimeout>>(null)
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
    const {
        items: inboxItems,
        loading: inboxLoading,
        totalUnread,
        clearUnread,
        deleteConversation,
        refetch: refetchInbox,
    } = useInbox(user?.id)
    const { isComplete: onboardingComplete, completeOnboarding } = useOnboarding()
    const { theme } = useTheme()
    const breakpoint = useBreakpoint()
    const { recentIds, discoveredIds, recordView } = useRecentlyViewed(user?.id)
    const [profileSubView, setProfileSubView] = useState<"saved" | "messages" | null>(initialURL.current.view)
    const [discoverCategory, setDiscoverCategory] = useState("All")
    const [discoverOpenNow, setDiscoverOpenNow] = useState(false)
    const [discoverKey, setDiscoverKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollPosRef = useRef(0)
    const tabScrollRef = useRef<Record<string, number>>({})
    const mapStateRef = useRef<MapState | null>(null)
    const handleMapStateChange = useCallback((s: MapState) => {
        mapStateRef.current = s
    }, [])

    const handleMakerTap = useCallback(
        (maker: Maker) => {
            recordView(maker.id)
            // Preload hero, avatar, and first gallery images so they're cached before MakerProfile renders
            const heroUrl = maker.gallery_urls?.[0]
            if (heroUrl) {
                const img = new window.Image()
                img.src = optimizeImageUrl(heroUrl, 800, { quality: IMG_QUALITY.hero }) ?? ""
            }
            if (maker.avatar_url) {
                const av = new window.Image()
                av.src = optimizeImageUrl(maker.avatar_url, 120) ?? ""
            }
            // Preload first 6 gallery images at Work tab size (300px)
            maker.gallery_urls?.slice(0, 6).forEach((url) => {
                const g = new window.Image()
                g.src = optimizeImageUrl(url, 300) ?? ""
            })
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

    const handleScrollToTop = useCallback(() => {
        if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    const resetDiscover = useCallback(() => {
        refetch()
        setDiscoverKey((k) => k + 1)
        setDiscoverCategory("All")
        setDiscoverOpenNow(false)
        tabScrollRef.current["discover"] = 0
        handleScrollToTop()
    }, [refetch, handleScrollToTop])

    const handleTabChange = useCallback(
        (tab: string) => {
            if (containerRef.current) tabScrollRef.current[activeTab] = containerRef.current.scrollTop
            history.pushState({ tab }, "", buildURL(tab))
            setSelectedMaker(null)
            setSelectedConversation(null)
            setProfileSubView(null)
            setActiveTab(tab)
            if (tab === "discover") {
                resetDiscover()
            } else {
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.scrollTop = tabScrollRef.current[tab] || 0
                })
            }
        },
        [activeTab, resetDiscover],
    )

    const handleToggleSave = useCallback(
        (makerId: string) => {
            if (!user) {
                setAuthToast(true)
                if (authToastTimer.current) clearTimeout(authToastTimer.current)
                authToastTimer.current = setTimeout(() => setAuthToast(false), 2500)
                return
            }
            toggleSave(makerId)
        },
        [user, toggleSave],
    )

    const handleLogoTap = useCallback(() => {
        handleTabChange("discover")
    }, [handleTabChange])

    const handleConversationOpen = useCallback((conversationId: string, makerId: string) => {
        history.pushState(
            { tab: "messages", conversation: conversationId, makerId },
            "",
            buildURL("messages", null, conversationId),
        )
        setSelectedConversation({ id: conversationId, makerId })
    }, [])

    const handleConversationBack = useCallback(() => {
        // Refetch inbox to get self-healed counters after viewing a conversation
        refetchInbox()
        history.back()
    }, [refetchInbox])

    const handleMessageMaker = useCallback(
        (makerId: string) => {
            if (!user) {
                setAuthToast(true)
                if (authToastTimer.current) clearTimeout(authToastTimer.current)
                authToastTimer.current = setTimeout(() => setAuthToast(false), 2500)
                return
            }
            // Check if conversation already exists in inbox
            const existing = inboxItems.find((it) => it.maker_id === makerId)
            if (existing) {
                handleConversationOpen(existing.conversation_id, makerId)
            } else {
                // Open in draft mode — conversation created on first message send
                history.pushState({ tab: "messages", makerId }, "", buildURL("messages"))
                setSelectedConversation({ id: null, makerId })
            }
        },
        [user, inboxItems, handleConversationOpen],
    )

    // Replace initial history entry with proper state
    useEffect(() => {
        const { tab, makerSlug } = initialURL.current
        history.replaceState({ tab, maker: makerSlug || null }, "", buildURL(tab, makerSlug))
    }, [])

    // Preload map chunk so first tab switch is instant
    useEffect(() => {
        if ("requestIdleCallback" in window) {
            const id = requestIdleCallback(mapImport)
            return () => cancelIdleCallback(id)
        } else {
            const id = setTimeout(mapImport, 2000)
            return () => clearTimeout(id)
        }
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

            const conversation = urlState.conversation || e.state?.conversation || null
            const makerId = e.state?.makerId || null
            setSelectedConversation(conversation && makerId ? { id: conversation, makerId } : null)

            const subView = urlState.view || e.state?.subView || null
            setProfileSubView(subView)

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
                    key={selectedMaker.id}
                    maker={selectedMaker}
                    makers={makers}
                    onBack={handleBack}
                    isSaved={savedIds.has(selectedMaker.id)}
                    onToggleSave={handleToggleSave}
                    onMakerTap={handleMakerTap}
                    scrollContainerRef={containerRef}
                    onLogoTap={handleLogoTap}
                    breakpoint={breakpoint}
                    userId={user?.id}
                    onMessage={handleMessageMaker}
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
                            initialMapState={mapStateRef.current}
                            onMapStateChange={handleMapStateChange}
                        />
                    </Suspense>
                )
            case "shop":
                return (
                    <div style={{ padding: "60px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 15,
                                color: theme.textSecondary,
                            }}
                        >
                            Marketplace coming soon
                        </p>
                    </div>
                )
            case "profile":
                if (profileSubView === "saved") {
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
                }
                if (profileSubView === "messages") {
                    return (
                        <MessagesScreen
                            items={inboxItems}
                            loading={inboxLoading}
                            isMaker={inboxItems.some((it) => it.visitor_id !== user?.id)}
                            userId={user?.id ?? ""}
                            onConversationTap={(conversationId, makerId) =>
                                handleConversationOpen(conversationId, makerId)
                            }
                            onDelete={deleteConversation}
                            onLogoTap={handleLogoTap}
                        />
                    )
                }
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
                        unreadMessages={totalUnread}
                        inboxItems={inboxItems}
                        userId={user?.id ?? ""}
                        savedCount={savedIds.size}
                        recentlyViewedIds={recentIds}
                        discoveredCount={discoveredIds.length}
                        onMakerTap={handleMakerTap}
                        onSavedTap={() => {
                            history.pushState(
                                { tab: "profile", subView: "saved" },
                                "",
                                buildURL("profile", null, null, "saved"),
                            )
                            setProfileSubView("saved")
                        }}
                        onMessagesTap={() => {
                            history.pushState(
                                { tab: "profile", subView: "messages" },
                                "",
                                buildURL("profile", null, null, "messages"),
                            )
                            setProfileSubView("messages")
                        }}
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
            <ErrorBoundary>
                <div
                    ref={containerRef}
                    style={{
                        height: "100vh",
                        overflowY: "auto",
                        overflowX: "hidden",
                        willChange: "transform",
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
                                onReset={resetDiscover}
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
            </ErrorBoundary>

            {selectedConversation &&
                user &&
                (() => {
                    const maker = makers.find((m) => m.id === selectedConversation.makerId)
                    if (!maker) return null
                    return (
                        <ChatView
                            conversationId={selectedConversation.id}
                            makerId={selectedConversation.makerId}
                            maker={maker}
                            userId={user.id}
                            onBack={handleConversationBack}
                            onMakerTap={(m) => {
                                setSelectedConversation(null)
                                handleMakerTap(m)
                            }}
                            onRead={clearUnread}
                            onConversationCreated={(cid) => {
                                setSelectedConversation({ id: cid, makerId: selectedConversation.makerId })
                                refetchInbox()
                            }}
                        />
                    )
                })()}

            {/* Auth toast */}
            <div
                style={{
                    position: "fixed",
                    bottom: 80,
                    left: "50%",
                    transform: `translateX(-50%) translateY(${authToast ? "0" : "20px"})`,
                    opacity: authToast ? 1 : 0,
                    pointerEvents: authToast ? "auto" : "none",
                    transition: "opacity 0.3s ease, transform 0.3s ease",
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
                        borderRadius: 0,
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

            <TabBar activeTab={activeTab} selectedMaker={selectedMaker} onTabChange={handleTabChange} />
            <SpeedInsights />
            <Analytics />
        </div>
    )
}
