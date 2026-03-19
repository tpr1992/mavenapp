import React, { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { getDistance } from "../utils/distance"
import { useTheme } from "../contexts/ThemeContext"
import RelatedMakersFeed from "../components/makers/RelatedMakersFeed"
import NearbyCarousel from "../components/ui/NearbyCarousel"
import ShareModal from "../components/modals/ShareModal"
import ImageGalleryModal from "../components/modals/ImageGalleryModal"
import MakerHero from "../components/makers/MakerHero"
import MakerProfileHeader from "../components/makers/MakerProfileHeader"
import WorkTab from "../components/makers/WorkTab"
import AboutTab from "../components/makers/AboutTab"
import SocialsTab from "../components/makers/SocialsTab"
import EventsTab from "../components/makers/EventsTab"
import InfoSection from "../components/makers/InfoSection"
import ProfileTabs, { getVisibleTabs } from "../components/makers/ProfileTabs"
import type { Maker } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface MakerProfileProps {
    maker: Maker
    makers?: Maker[]
    onBack: () => void
    isSaved: boolean
    onToggleSave: (id: string) => void
    onMakerTap: (maker: Maker) => void
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>
    onLogoTap: () => void
    breakpoint?: Breakpoint
    userId?: string | null
    onMessage?: (makerId: string) => void
}

export default function MakerProfile({
    maker,
    makers = [],
    onBack,
    isSaved,
    onToggleSave,
    onMakerTap,
    scrollContainerRef,
    onLogoTap,
    breakpoint = "mobile",
    userId,
    onMessage,
}: MakerProfileProps) {
    const [showShare, setShowShare] = useState(false)
    const [showCompact, setShowCompact] = useState(false)
    const [activeTab, setActiveTab] = useState("work")
    const [viewerIndex, setViewerIndex] = useState<number | null>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const { theme, isDark } = useTheme()

    const shareUrl = window.location.origin + "/?maker=" + maker.slug
    const visibleTabs = getVisibleTabs(maker)

    // IDs shown in the nearby carousel — exclude from Keep Exploring to avoid duplication
    const nearbyExcludeIds = useMemo(() => {
        const nearby = (makers || [])
            .filter((m) => m.id !== maker.id)
            .filter((m) => {
                const d = getDistance(maker.lat, maker.lng, m.lat, m.lng)
                return d <= 30
            })
            .sort(
                (a, b) =>
                    getDistance(maker.lat, maker.lng, a.lat, a.lng) - getDistance(maker.lat, maker.lng, b.lat, b.lng),
            )
            .slice(0, 5)
            .map((m) => m.id)
        return new Set(nearby)
    }, [makers, maker.id, maker.lat, maker.lng])

    // Related makers: same category first, then nearest to current maker — excluding nearby carousel
    const relatedMakers = useMemo(() => {
        const distFrom = (m: Maker) => getDistance(maker.lat, maker.lng, m.lat, m.lng)
        const others = makers.filter((m) => m.id !== maker.id && !nearbyExcludeIds.has(m.id))
        const sameCategory = others
            .filter((m) => m.category === maker.category)
            .sort((a, b) => distFrom(a) - distFrom(b))
        const different = others.filter((m) => m.category !== maker.category).sort((a, b) => distFrom(a) - distFrom(b))
        return [...sameCategory, ...different]
    }, [makers, maker.id, maker.category, maker.lat, maker.lng, nearbyExcludeIds])

    useEffect(() => {
        const hero = heroRef.current
        const root = scrollContainerRef?.current
        if (!hero || !root) return
        const io = new IntersectionObserver(([e]) => setShowCompact(!e.isIntersecting), {
            root,
            rootMargin: "-48px 0px 0px 0px",
        })
        io.observe(hero)
        return () => io.disconnect()
    }, [scrollContainerRef])

    useEffect(() => {
        setActiveTab("work")
    }, [maker.id])

    const pageTitle = `${maker.name} \u2014 ${maker.category} in ${maker.city} | maven`
    const pageDescription = maker.bio.length > 155 ? maker.bio.slice(0, 152) + "..." : maker.bio

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: maker.name,
        description: maker.bio,
        address: {
            "@type": "PostalAddress",
            streetAddress: maker.address,
            addressLocality: maker.city,
            addressCountry: maker.country,
        },
        geo: { "@type": "GeoCoordinates", latitude: maker.lat, longitude: maker.lng },
        url: shareUrl,
        ...(maker.website_url && { sameAs: [maker.website_url] }),
    }

    return (
        <div style={{ paddingBottom: 20, animation: "fadeSlideIn 0.25s ease" }}>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:url" content={shareUrl} />
                <meta property="og:type" content="profile" />
                <link rel="canonical" href={shareUrl} />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Helmet>

            {/* Unified sticky header — morphs between hero overlay and compact bar */}
            <MakerProfileHeader
                maker={maker}
                isCompact={showCompact}
                isSaved={isSaved}
                isDark={isDark}
                theme={theme}
                onBack={onBack}
                onLogoTap={onLogoTap}
                onToggleSave={onToggleSave}
                onShare={() => setShowShare(true)}
                scrollContainerRef={scrollContainerRef}
            />

            {/* Hero */}
            <MakerHero
                maker={maker}
                heroRef={heroRef}
                isDark={isDark}
                onImageTap={() => setViewerIndex(0)}
                minHeroHeight={breakpoint === "mobile" ? 340 : 280}
            />

            {/* Info section — inline, always visible */}
            <InfoSection maker={maker} theme={theme} />

            {/* Message button */}
            {maker.is_messageable && onMessage && maker.user_id !== userId && (
                <div style={{ padding: "0 20px", marginTop: 14 }}>
                    <button
                        onClick={() => onMessage(maker.id)}
                        style={{
                            width: "100%",
                            padding: "12px 0",
                            borderRadius: 0,
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "transparent",
                            color: theme.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                        </svg>
                        Message
                    </button>
                </div>
            )}

            {/* Tabs — Gallery / Instagram / Events */}
            {visibleTabs.length > 0 && (
                <>
                    <ProfileTabs tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />
                    <div style={{ minHeight: 120 }}>
                        {activeTab === "work" && (
                            <WorkTab
                                maker={maker}
                                theme={theme}
                                onImageTap={setViewerIndex}
                                columnCount={breakpoint === "mobile" ? 2 : 3}
                            />
                        )}
                        {activeTab === "about" && <AboutTab maker={maker} theme={theme} />}
                        {activeTab === "socials" && <SocialsTab maker={maker} theme={theme} />}
                        {activeTab === "events" && <EventsTab maker={maker} theme={theme} />}
                    </div>
                </>
            )}

            <NearbyCarousel anchor={maker} makers={makers || []} onMakerTap={onMakerTap} topPadding={32} />

            <RelatedMakersFeed
                makers={relatedMakers}
                onMakerTap={onMakerTap}
                columnCount={breakpoint === "mobile" ? 2 : 3}
            />

            {/* Image viewer modal */}
            {viewerIndex !== null && maker.gallery_urls && (
                <ImageGalleryModal
                    images={maker.gallery_urls}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                    scrollContainerRef={scrollContainerRef}
                />
            )}

            {/* Share modal */}
            {showShare && (
                <ShareModal maker={maker} theme={theme} shareUrl={shareUrl} onClose={() => setShowShare(false)} />
            )}
        </div>
    )
}
