import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Helmet } from "react-helmet-async"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import Supercluster from "supercluster"
import { isOpenNow } from "../utils/time"
import { optimizeImageUrl } from "../utils/image"
import { TOWNS } from "../data/towns"
import { CATEGORY_ICON } from "../constants/categories"
import type { Town } from "../utils/distance"
import CategoryPills from "../components/ui/CategoryPills"
import { useTheme } from "../contexts/ThemeContext"
import SwipeableMapCard from "../components/map/SwipeableMapCard"
import SearchBar from "../components/ui/SearchBar"
import type { Maker } from "../types"
import type { UserLocation } from "../hooks/useUserLocation"

// ── CARTO vector tile styles (free, no API key) ──
const STYLES = {
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
}

interface MapScreenV2Props {
    makers?: Maker[]
    onMakerTap: (maker: Maker) => void
    savedIds: Set<string>
    onToggleSave: (id: string) => void
    userLocation: UserLocation | null
    isDebug?: boolean
}

// ── Pin element factory ──

function createPinElement(maker: Maker, isSelected: boolean, isDark: boolean): HTMLDivElement {
    const icon = CATEGORY_ICON[maker.category] || ""

    let bg: string, color: string, border: string, shadow: string, backdrop: string
    if (isSelected) {
        bg = isDark ? "#e8e6e3" : "#1a1a1a"
        color = isDark ? "#1a1a1a" : "#fff"
        border = "none"
        shadow = "0 4px 12px rgba(0,0,0,0.35)"
        backdrop = "none"
    } else {
        bg = isDark ? "rgba(30,30,30,0.5)" : "rgba(255,255,255,0.5)"
        color = isDark ? "#e8e6e3" : "#1a1a1a"
        border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)"
        shadow = isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.18)"
        backdrop = "blur(16px) saturate(1.4)"
    }
    const scale = isSelected ? "scale(1.1)" : "scale(1)"

    const el = document.createElement("div")
    el.style.cursor = "pointer"
    el.style.opacity = "0"
    el.style.transition = "opacity 0.2s ease"
    requestAnimationFrame(() => {
        el.style.opacity = "1"
    })
    el.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        background: ${bg};
        color: ${color};
        padding: 6px 10px;
        border-radius: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        gap: 4px;
        border: ${border};
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      ">
        <span style="display:inline-flex;align-items:center">${icon}</span>
        ${maker.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>
      <div style="
        width: 8px;
        height: 8px;
        background: ${bg};
        border: ${border};
        transform: rotate(45deg);
        margin-top: -5px;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      "></div>
    </div>
  `
    return el
}

// ── Cluster element factory ──

function createClusterElement(count: number, isDark: boolean): HTMLDivElement {
    const bg = isDark ? "#e8e6e3" : "#1a1a1a"
    const color = isDark ? "#1a1a1a" : "#fff"
    const sz = count >= 10 ? 40 : 34

    const el = document.createElement("div")
    el.style.cursor = "pointer"
    el.style.opacity = "0"
    el.style.transition = "opacity 0.15s ease"
    requestAnimationFrame(() => {
        el.style.opacity = "1"
    })
    el.innerHTML = `<div style="
    width:${sz}px;height:${sz}px;border-radius:50%;
    background:${bg};color:${color};
    display:flex;align-items:center;justify-content:center;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
    box-shadow:0 2px 10px rgba(0,0,0,${isDark ? "0.5" : "0.2"});
  ">${count}</div>`
    return el
}

export default function MapScreenV2({
    makers = [],
    onMakerTap,
    savedIds,
    onToggleSave,
    userLocation,
    isDebug,
}: MapScreenV2Props) {
    const { isDark, theme } = useTheme()

    const [category, setCategory] = useState("All")
    const [openNow, setOpenNow] = useState(false)
    const [selectedMaker, setSelectedMaker] = useState<Maker | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)

    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
    const clusterRef = useRef<Supercluster | null>(null)
    const selectedIdRef = useRef<string | null>(null)
    const preloadCache = useRef<HTMLImageElement[]>([])

    // Refs for stable callbacks
    const isDarkRef = useRef(isDark)
    const filteredRef = useRef<Maker[]>([])
    const makerByIdRef = useRef<Map<string, Maker>>(new Map())
    isDarkRef.current = isDark

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

    const makerById = useMemo(() => {
        const map = new Map<string, Maker>()
        filtered.forEach((m) => map.set(m.id, m))
        return map
    }, [filtered])

    makerByIdRef.current = makerById
    filteredRef.current = filtered

    const handleSelectTown = useCallback((town: Town) => {
        const map = mapRef.current
        if (map) {
            map.flyTo({ center: [town.lng, town.lat], zoom: 13, speed: 1.2, essential: true })
        }
        setSearchQuery("")
        setSearchFocused(false)
    }, [])

    const handleMarkerClick = useCallback((maker: Maker) => {
        const map = mapRef.current
        if (!map) return

        preloadCache.current = []
        const heroUrl = maker.gallery_urls?.[0]
        if (heroUrl) {
            const heroFull = new window.Image()
            heroFull.src = optimizeImageUrl(heroUrl, 600) ?? ""
            const heroThumb = new window.Image()
            heroThumb.src = optimizeImageUrl(heroUrl, 120) ?? ""
            preloadCache.current.push(heroFull, heroThumb)
        }
        maker.gallery_urls?.slice(1, 6).forEach((url) => {
            const img = new window.Image()
            img.src = optimizeImageUrl(url, 200) ?? ""
            preloadCache.current.push(img)
        })

        setSelectedMaker(maker)
        map.flyTo({ center: [maker.lng, maker.lat], zoom: Math.max(map.getZoom(), 15), essential: true })
    }, [])

    // ── Sync ALL markers (clusters + pins) from Supercluster ──
    const syncMarkers = useCallback(() => {
        const map = mapRef.current
        const index = clusterRef.current
        if (!map || !index) return

        const dark = isDarkRef.current
        const lookup = makerByIdRef.current
        const bounds = map.getBounds()
        const bbox: [number, number, number, number] = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
        ]
        const zoom = Math.floor(map.getZoom())
        const features = index.getClusters(bbox, zoom)
        const activeKeys = new Set<string>()

        for (const feature of features) {
            const coords = feature.geometry.coordinates as [number, number]
            const props = feature.properties

            if (props.cluster) {
                // ── Cluster marker ──
                const key = `cluster-${props.cluster_id}`
                activeKeys.add(key)

                // Always recreate clusters so click handlers have fresh cluster_id
                const existing = markersRef.current.get(key)
                if (existing) existing.remove()

                const el = createClusterElement(props.point_count, dark)
                const clkId = props.cluster_id as number
                const clkCoords = coords.slice() as [number, number]
                const clkCount = props.point_count as number
                el.addEventListener("click", (e) => {
                    e.stopPropagation()
                    const ci = clusterRef.current
                    if (!ci || !map) return
                    const expZoom = ci.getClusterExpansionZoom(clkId)
                    // Cap zoom for small clusters — no need to dive to street level
                    const cap = clkCount <= 3 ? 18 : clkCount <= 8 ? 17 : 18
                    const targetZoom = Math.min(Math.max(expZoom, map.getZoom() + 2), cap)
                    map.easeTo({
                        center: clkCoords,
                        zoom: targetZoom,
                        duration: 500,
                    })
                })
                const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(map)
                marker.getElement().style.zIndex = "500"
                markersRef.current.set(key, marker)
            } else {
                // ── Individual pin marker ──
                const id = props.id as string
                const maker = lookup.get(id)
                if (!maker) continue

                activeKeys.add(id)

                const existing = markersRef.current.get(id)
                if (existing) {
                    existing.setLngLat(coords)
                } else {
                    const isSelected = selectedIdRef.current === id
                    const el = createPinElement(maker, isSelected, dark)
                    el.addEventListener("click", (e) => {
                        e.stopPropagation()
                        handleMarkerClick(maker)
                    })
                    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(coords).addTo(map)
                    if (isSelected) marker.getElement().style.zIndex = "1000"
                    markersRef.current.set(id, marker)
                }
            }
        }

        // Remove markers no longer visible
        markersRef.current.forEach((marker, key) => {
            if (!activeKeys.has(key)) {
                marker.remove()
                markersRef.current.delete(key)
            }
        })
    }, [handleMarkerClick])

    // ── Initialize map (runs once) ──
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        const center: [number, number] = userLocation ? [userLocation.lng, userLocation.lat] : [-9.05, 53.27]

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: isDarkRef.current ? STYLES.dark : STYLES.light,
            center,
            zoom: 13,
            attributionControl: false,
        })

        mapRef.current = map

        map.on("moveend", syncMarkers)

        // Initial sync once style loads
        map.on("load", () => syncMarkers())

        return () => {
            markersRef.current.forEach((m) => m.remove())
            markersRef.current.clear()
            map.remove()
            mapRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Rebuild Supercluster index when data or theme changes ──
    useEffect(() => {
        const index = new Supercluster({
            radius: 40,
            maxZoom: 17,
            minPoints: 2,
        })

        const points: Supercluster.PointFeature<{ id: string }>[] = filtered.map((m) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [m.lng, m.lat] },
            properties: { id: m.id },
        }))

        index.load(points)
        clusterRef.current = index

        // Clear all markers and re-sync with new index
        markersRef.current.forEach((m) => m.remove())
        markersRef.current.clear()
        syncMarkers()
    }, [filtered, syncMarkers])

    // ── Switch tile style + rebuild markers on theme change ──
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        map.setStyle(isDark ? STYLES.dark : STYLES.light)

        map.once("style.load", () => {
            markersRef.current.forEach((m) => m.remove())
            markersRef.current.clear()
            syncMarkers()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark])

    // ── Update pin styles on selection change ──
    useEffect(() => {
        const prevId = selectedIdRef.current
        const nextId = selectedMaker?.id ?? null
        selectedIdRef.current = nextId

        const map = mapRef.current
        if (!map) return

        const rebuild = (id: string, isSelected: boolean) => {
            const existing = markersRef.current.get(id)
            if (!existing) return
            const maker = makerByIdRef.current.get(id)
            if (!maker) return
            const lngLat = existing.getLngLat()
            existing.remove()
            const el = createPinElement(maker, isSelected, isDarkRef.current)
            el.addEventListener("click", (e) => {
                e.stopPropagation()
                handleMarkerClick(maker)
            })
            const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map)
            if (isSelected) marker.getElement().style.zIndex = "1000"
            markersRef.current.set(id, marker)
        }

        if (prevId && prevId !== nextId) rebuild(prevId, false)
        if (nextId) rebuild(nextId, true)
    }, [selectedMaker, handleMarkerClick])

    // ── Prefetch hero thumbnails for visible pins on map settle ──
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        let timeout: ReturnType<typeof setTimeout>
        const prefetchVisible = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                const bounds = map.getBounds()
                filteredRef.current.forEach((maker) => {
                    if (bounds.contains([maker.lng, maker.lat])) {
                        const url = maker.gallery_urls?.[0]
                        if (url) new window.Image().src = optimizeImageUrl(url, 120) ?? ""
                    }
                })
            }, 400)
        }

        map.on("moveend", prefetchVisible)
        prefetchVisible()
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

            {/* MapLibre GL Container */}
            <div
                ref={mapContainerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                    background: theme.bg,
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
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    placeholder="Search makers or city..."
                    elevated
                >
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
                </SearchBar>
            </div>

            {/* Filter Pills */}
            <div
                style={{
                    position: "absolute",
                    top: 68,
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

            {/* Attribution */}
            <div
                style={{
                    position: "absolute",
                    bottom: 4,
                    right: 6,
                    zIndex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                    pointerEvents: "auto",
                    lineHeight: 1.3,
                }}
            >
                {"© "}
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                >
                    OSM
                </a>
                {" · "}
                <a
                    href="https://carto.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                >
                    CARTO
                </a>
                {" · "}
                <a
                    href="https://maplibre.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                >
                    MapLibre
                </a>
            </div>

            {/* Bottom Card */}
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
