import { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import { isOpenNow } from "../utils/time"
import { optimizeImageUrl } from "../utils/image"
import { TOWNS } from "../data/towns"
import type { Town } from "../utils/distance"
import CategoryPills from "../components/ui/CategoryPills"
import { useTheme } from "../contexts/ThemeContext"
import { createPinIcon } from "../utils/mapIcons"
import SwipeableMapCard from "../components/map/SwipeableMapCard"
import type { Maker } from "../types"
import type { UserLocation } from "../hooks/useUserLocation"

interface MarkerEntry {
    marker: L.Marker
    maker: Maker
}

interface MapScreenProps {
    makers?: Maker[]
    onMakerTap: (maker: Maker) => void
    savedIds: Set<string>
    onToggleSave: (id: string) => void
    userLocation: UserLocation | null
    isDebug?: boolean
}

// Fix Leaflet default icon path issue with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: undefined,
    iconUrl: undefined,
    shadowUrl: undefined,
})

export default function MapScreen({
    makers = [],
    onMakerTap,
    savedIds,
    onToggleSave,
    userLocation,
    isDebug,
}: MapScreenProps) {
    const { isDark, theme } = useTheme()

    const [category, setCategory] = useState("All")
    const [openNow, setOpenNow] = useState(false)
    const [selectedMaker, setSelectedMaker] = useState<Maker | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)

    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
    const markerMapRef = useRef<Map<string, MarkerEntry>>(new Map())
    const prevSelectedRef = useRef<Maker | null>(null)
    const tileLayerRef = useRef<L.TileLayer | null>(null)

    const townSuggestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (q.length < 1) return []
        return TOWNS.filter((t) => t.name.toLowerCase().startsWith(q))
            .concat(TOWNS.filter((t) => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q)))
            .slice(0, 4)
    }, [searchQuery])

    const filtered = useMemo(
        () =>
            makers
                .filter((m) => category === "All" || m.category === category.toLowerCase())
                .filter((m) => !openNow || isOpenNow(m.opening_hours))
                .filter(
                    (m) =>
                        !searchQuery ||
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.category.toLowerCase().includes(searchQuery.toLowerCase()),
                ),
        [makers, category, openNow, searchQuery],
    )

    const handleSelectTown = (town: Town) => {
        const map = mapInstanceRef.current
        if (map) {
            map.flyTo([town.lat, town.lng] as L.LatLngTuple, 13, { duration: 0.8 })
        }
        setSearchQuery("")
        setSearchFocused(false)
    }

    // Initialize the Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return

        const center: L.LatLngTuple = userLocation ? [userLocation.lat, userLocation.lng] : [53.27, -9.05]

        const map = L.map(mapContainerRef.current, {
            center,
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
        })

        const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

        tileLayerRef.current = L.tileLayer(tileUrl, {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map)

        L.control.attribution({ position: "topleft", prefix: false }).addTo(map)

        mapInstanceRef.current = map

        return () => {
            map.remove()
            mapInstanceRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Switch tile layer when isDark changes
    useEffect(() => {
        if (!mapInstanceRef.current || !tileLayerRef.current) return
        const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        tileLayerRef.current.setUrl(tileUrl)
    }, [isDark])

    // Rebuild cluster group when data or theme changes
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        if (clusterGroupRef.current) {
            map.removeLayer(clusterGroupRef.current)
        }

        const markers = new Map<string, MarkerEntry>()
        const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 65,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount()
                const bg = isDark ? "#e8e6e3" : "#1a1a1a"
                const clusterColor = isDark ? "#1a1a1a" : "#fff"
                const sz = count >= 10 ? 40 : 34
                return L.divIcon({
                    html: `<div style="
                      width:${sz}px;height:${sz}px;border-radius:50%;
                      background:${bg};color:${clusterColor};
                      display:flex;align-items:center;justify-content:center;
                      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
                      box-shadow:0 2px 10px rgba(0,0,0,${isDark ? "0.5" : "0.2"});
                    ">${count}</div>`,
                    className: "",
                    iconSize: [sz, sz] as L.PointTuple,
                    iconAnchor: [sz / 2, sz / 2] as L.PointTuple,
                })
            },
        })

        filtered.forEach((maker) => {
            const pinIcon = createPinIcon(maker, false, isDark)
            const marker = L.marker([maker.lat, maker.lng] as L.LatLngTuple, { icon: pinIcon })
            marker.on("click", () => {
                // Preload hero + gallery images so card expand is instant
                const heroUrl = maker.gallery_urls?.[0]
                if (heroUrl) {
                    new window.Image().src = optimizeImageUrl(heroUrl, 600) ?? ""
                    new window.Image().src = optimizeImageUrl(heroUrl, 120) ?? ""
                }
                maker.gallery_urls?.slice(1, 6).forEach((url) => {
                    new window.Image().src = optimizeImageUrl(url, 200) ?? ""
                })
                setSelectedMaker(maker)
                map.flyTo([maker.lat, maker.lng] as L.LatLngTuple, Math.max(map.getZoom(), 15))
            })
            clusterGroup.addLayer(marker)
            markers.set(maker.id, { marker, maker })
        })

        map.addLayer(clusterGroup)
        clusterGroupRef.current = clusterGroup
        markerMapRef.current = markers
    }, [filtered, isDark])

    // Update pin icons on selection change (no cluster rebuild)
    useEffect(() => {
        const markers = markerMapRef.current
        if (!markers.size) return

        const prev = prevSelectedRef.current
        if (prev) {
            const entry = markers.get(prev.id)
            if (entry) {
                entry.marker.setIcon(createPinIcon(entry.maker, false, isDark))
                entry.marker.setZIndexOffset(0)
            }
        }
        if (selectedMaker) {
            const entry = markers.get(selectedMaker.id)
            if (entry) {
                entry.marker.setIcon(createPinIcon(entry.maker, true, isDark))
                entry.marker.setZIndexOffset(1000)
            }
        }
        prevSelectedRef.current = selectedMaker
    }, [selectedMaker, isDark])

    // Prefetch hero thumbnails for visible pins when map stops moving
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        let timeout: ReturnType<typeof setTimeout>
        const prefetchVisible = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                const bounds = map.getBounds()
                filtered.forEach((maker) => {
                    if (bounds.contains([maker.lat, maker.lng] as L.LatLngTuple)) {
                        const url = maker.gallery_urls?.[0]
                        if (url) new window.Image().src = optimizeImageUrl(url, 120) ?? ""
                    }
                })
            }, 400) // debounce — wait for map to settle
        }

        map.on("moveend", prefetchVisible)
        prefetchVisible() // initial viewport
        return () => {
            clearTimeout(timeout)
            map.off("moveend", prefetchVisible)
        }
    }, [filtered])

    return (
        <div style={{ height: "100%", position: "relative", overscrollBehavior: "contain" }}>
            <Helmet>
                <title>Map — maven</title>
                <meta
                    name="description"
                    content="Find local makers near you on the map. Explore craftspeople in Galway, Ireland."
                />
            </Helmet>
            {/* Leaflet Map Container */}
            <div
                ref={mapContainerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                }}
            />

            {/* Search Bar */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    zIndex: 1001,
                }}
            >
                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            background: theme.inputBg,
                            borderRadius: 14,
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                            border: `1px solid ${theme.border}`,
                        }}
                    >
                        <span style={{ fontSize: 16, color: theme.textSecondary }}>{"\u2315"}</span>
                        <input
                            placeholder="Search makers or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                            style={{
                                border: "none",
                                outline: "none",
                                flex: 1,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: theme.text,
                                background: "transparent",
                            }}
                        />
                    </div>

                    {/* Town suggestions dropdown */}
                    {searchFocused && townSuggestions.length > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                marginTop: 6,
                                background: theme.card,
                                borderRadius: 12,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                border: `1px solid ${theme.border}`,
                                overflow: "hidden",
                                zIndex: 1001,
                            }}
                        >
                            {townSuggestions.map((town, i) => (
                                <div
                                    key={town.name + town.county}
                                    onClick={() => handleSelectTown(town)}
                                    style={{
                                        padding: "11px 16px",
                                        cursor: "pointer",
                                        borderBottom:
                                            i < townSuggestions.length - 1 ? `1px solid ${theme.border}` : "none",
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 13.5,
                                            fontWeight: 600,
                                            color: theme.text,
                                        }}
                                    >
                                        {town.name}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 11.5,
                                            color: theme.textMuted,
                                        }}
                                    >
                                        {town.name === town.county ? "" : `Co. ${town.county}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Pills */}
            <div
                style={{
                    position: "absolute",
                    top: 64,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                }}
            >
                <CategoryPills
                    selected={category}
                    onSelect={setCategory}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => setOpenNow(!openNow)}
                    elevated
                />
            </div>

            {/* Bottom Card — swipeable sheet */}
            {selectedMaker && (
                <SwipeableMapCard
                    key={selectedMaker.id}
                    maker={selectedMaker}
                    onDismiss={() => setSelectedMaker(null)}
                    onTap={onMakerTap}
                    onToggleSave={onToggleSave}
                    isSaved={savedIds.has(selectedMaker.id)}
                    theme={theme}
                    isDebug={isDebug}
                />
            )}
        </div>
    )
}
