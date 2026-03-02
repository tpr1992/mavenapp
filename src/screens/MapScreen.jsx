import { useState, useRef, useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import { CATEGORY_ICON } from "../constants/categories"
import { isOpenNow, getTodayHours } from "../utils/time"
import { formatLocation } from "../utils/distance"
import { TOWNS } from "../data/towns"
import CategoryPills from "../components/ui/CategoryPills"
import MakerAvatar from "../components/ui/MakerAvatar"
import { useTheme } from "../contexts/ThemeContext"

// Fix Leaflet default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: undefined,
    iconUrl: undefined,
    shadowUrl: undefined,
})

function createPinIcon(maker, isSelected, isDark) {
    const icon = CATEGORY_ICON[maker.category] || ""

    let bg, color, border, shadow
    if (isSelected) {
        bg = isDark ? "#e8e6e3" : "#1a1a1a"
        color = isDark ? "#1a1a1a" : "#fff"
        border = "none"
        shadow = "0 4px 12px rgba(0,0,0,0.35)"
    } else {
        bg = isDark ? "#2a2a2a" : "#fff"
        color = isDark ? "#e8e6e3" : "#1a1a1a"
        border = isDark ? "1.5px solid #555" : "1.5px solid #c5c0b8"
        shadow = isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.18)"
    }
    const scale = isSelected ? "scale(1.1)" : "scale(1)"

    const html = `
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
      "></div>
    </div>
  `

    // Estimate width based on name length for accurate anchor
    const estimatedWidth = maker.name.length * 7 + 50

    return L.divIcon({
        html,
        className: "",
        iconSize: [estimatedWidth, 40],
        iconAnchor: [estimatedWidth / 2, 40],
    })
}

export default function MapScreen({ makers = [], onMakerTap, savedIds, onToggleSave, userLocation }) {
    const { isDark, theme } = useTheme()

    const [category, setCategory] = useState("All")
    const [openNow, setOpenNow] = useState(false)
    const [selectedMaker, setSelectedMaker] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)

    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const clusterGroupRef = useRef(null)
    const tileLayerRef = useRef(null)

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

    const handleSelectTown = (town) => {
        const map = mapInstanceRef.current
        if (map) {
            map.flyTo([town.lat, town.lng], 13, { duration: 0.8 })
        }
        setSearchQuery("")
        setSearchFocused(false)
    }

    // Initialize the Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return

        const center = userLocation ? [userLocation.lat, userLocation.lng] : [53.27, -9.05]

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

        L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map)

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

    // Sync markers with filtered makers (clustered)
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        // Remove previous cluster group
        if (clusterGroupRef.current) {
            map.removeLayer(clusterGroupRef.current)
        }

        const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 45,
            disableClusteringAtZoom: 16,
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
                    iconSize: [sz, sz],
                    iconAnchor: [sz / 2, sz / 2],
                })
            },
        })

        filtered.forEach((maker) => {
            const isSelected = selectedMaker?.id === maker.id
            const pinIcon = createPinIcon(maker, isSelected, isDark)
            const marker = L.marker([maker.lat, maker.lng], { icon: pinIcon })
            marker.on("click", () => {
                setSelectedMaker(maker)
                map.flyTo([maker.lat, maker.lng], 15, { duration: 0.8 })
            })
            clusterGroup.addLayer(marker)
        })

        map.addLayer(clusterGroup)
        clusterGroupRef.current = clusterGroup
    }, [filtered, selectedMaker, isDark])

    return (
        <div style={{ height: "100%", position: "relative" }}>
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

            {/* Bottom Card */}
            {selectedMaker && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 76,
                        left: 12,
                        right: 12,
                        background: theme.card,
                        borderRadius: 18,
                        padding: 18,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                        zIndex: 1000,
                        animation: "slideUp 0.25s ease",
                        border: `1px solid ${theme.border}`,
                        cursor: "pointer",
                    }}
                    onClick={() => onMakerTap(selectedMaker)}
                >
                    <div style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
                        <MakerAvatar maker={selectedMaker} size={50} />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: theme.text,
                                    }}
                                >
                                    {selectedMaker.name}
                                </span>
                                {selectedMaker.is_verified && <span style={{ fontSize: 12 }}>{"\u2713"}</span>}
                            </div>
                            <div
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    color: theme.textSecondary,
                                    marginTop: 2,
                                }}
                            >
                                {selectedMaker.category} {"\u00B7"} {formatLocation(selectedMaker)} {"\u00B7"}{" "}
                                {getTodayHours(selectedMaker.opening_hours)}
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleSave(selectedMaker.id)
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: `1px solid ${theme.border}`,
                                background: theme.card,
                                cursor: "pointer",
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: savedIds.has(selectedMaker.id) ? "#c53030" : theme.textSecondary,
                            }}
                        >
                            {savedIds.has(selectedMaker.id) ? "\u2665" : "\u2661"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
