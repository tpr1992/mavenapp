import { useState, useEffect, useRef, useCallback } from "react"

const MAKERS = [
    {
        id: "1",
        name: "Cloch Ceramics",
        slug: "cloch-ceramics",
        bio: "Hand-thrown stoneware inspired by the Atlantic coast. Every piece carries the salt air of Connemara.",
        category: "objects",
        city: "Galway",
        address: "14 Sea Road, Salthill",
        lat: 53.26,
        lng: -9.07,
        country: "IE",
        years_active: 7,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#8B7355",
        is_verified: true,
        is_featured: true,
        website_url: "https://clochceramics.ie",
        instagram_handle: "@clochceramics",
        opening_hours: { mon: "10-17", tue: "10-17", wed: "10-17", thu: "10-17", fri: "10-17", sat: "11-16", sun: "closed" },
        distance: 0.8
    },
    {
        id: "2",
        name: "Niamh Daly Studio",
        slug: "niamh-daly-studio",
        bio: "Contemporary jewellery handcrafted from recycled silver and Irish bog oak. Wearable sculptures.",
        category: "objects",
        city: "Galway",
        address: "23 Middle Street",
        lat: 53.272,
        lng: -9.053,
        country: "IE",
        years_active: 4,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#2D3436",
        is_verified: true,
        is_featured: false,
        website_url: "",
        instagram_handle: "@niamhdaly.studio",
        opening_hours: { mon: "closed", tue: "11-18", wed: "11-18", thu: "11-18", fri: "11-18", sat: "11-17", sun: "closed" },
        distance: 1.2
    },
    {
        id: "3",
        name: "FOLD Textiles",
        slug: "fold-textiles",
        bio: "Natural dye studio working with Irish wool and linen. Small-batch scarves, throws, and wall pieces.",
        category: "objects",
        city: "Galway",
        address: "Unit 4, Merchants Dock",
        lat: 53.269,
        lng: -9.048,
        country: "IE",
        years_active: 3,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#A0937D",
        is_verified: true,
        is_featured: false,
        website_url: "https://foldtextiles.com",
        instagram_handle: "@fold.textiles",
        opening_hours: { mon: "closed", tue: "closed", wed: "12-18", thu: "12-18", fri: "12-18", sat: "10-16", sun: "10-14" },
        distance: 1.5
    },
    {
        id: "4",
        name: "Seán Keane Print",
        slug: "sean-keane-print",
        bio: "Risograph and letterpress studio. Limited edition prints of the West of Ireland landscape.",
        category: "art",
        city: "Galway",
        address: "8 Abbeygate Street Upper",
        lat: 53.273,
        lng: -9.054,
        country: "IE",
        years_active: 9,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#1B4332",
        is_verified: true,
        is_featured: false,
        website_url: "",
        instagram_handle: "@seankeaneprint",
        opening_hours: { mon: "10-17", tue: "10-17", wed: "10-17", thu: "10-17", fri: "10-17", sat: "10-15", sun: "closed" },
        distance: 0.3
    },
    {
        id: "5",
        name: "Ríona Collective",
        slug: "riona-collective",
        bio: "Slow fashion co-op. Three designers sharing a studio making considered garments from deadstock fabric.",
        category: "clothing",
        city: "Galway",
        address: "Fisheries Field, Nun's Island",
        lat: 53.268,
        lng: -9.058,
        country: "IE",
        years_active: 2,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#6B4423",
        is_verified: true,
        is_featured: false,
        website_url: "https://rionacollective.ie",
        instagram_handle: "@riona.collective",
        opening_hours: { thu: "12-19", fri: "12-19", sat: "10-17", sun: "closed", mon: "closed", tue: "closed", wed: "closed" },
        distance: 2.1
    },
    {
        id: "6",
        name: "Stone Valley Workshop",
        slug: "stone-valley-workshop",
        bio: "Woodturning and furniture from reclaimed Galway timber. Each piece tells the story of its tree.",
        category: "objects",
        city: "Galway",
        address: "Barna Village",
        lat: 53.252,
        lng: -9.144,
        country: "IE",
        years_active: 12,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#5C4033",
        is_verified: true,
        is_featured: false,
        website_url: "",
        instagram_handle: "@stonevalleyworkshop",
        opening_hours: { mon: "9-17", tue: "9-17", wed: "9-17", thu: "9-17", fri: "9-14", sat: "closed", sun: "closed" },
        distance: 5.4
    },
    {
        id: "7",
        name: "Lúnasa Silver",
        slug: "lunasa-silver",
        bio: "Celtic-inspired silver jewellery made in a tiny Claddagh workshop. Traditional craft, modern lines.",
        category: "objects",
        city: "Galway",
        address: "5 Quay Lane, Claddagh",
        lat: 53.267,
        lng: -9.056,
        country: "IE",
        years_active: 15,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#4A5568",
        is_verified: true,
        is_featured: false,
        website_url: "https://lunasasilver.ie",
        instagram_handle: "@lunasa.silver",
        opening_hours: { mon: "10-18", tue: "10-18", wed: "10-18", thu: "10-18", fri: "10-18", sat: "10-17", sun: "12-16" },
        distance: 1.8
    },
    {
        id: "8",
        name: "INK & IRON",
        slug: "ink-and-iron",
        bio: "Screenprinted posters and hand-forged metal goods. A printmaker and a blacksmith under one roof.",
        category: "art",
        city: "Galway",
        address: "Liosban Industrial Estate, Unit 12",
        lat: 53.283,
        lng: -9.028,
        country: "IE",
        years_active: 5,
        avatar_url: "",
        gallery_urls: [],
        hero_color: "#1A1A2E",
        is_verified: true,
        is_featured: false,
        website_url: "https://inkandiron.ie",
        instagram_handle: "@ink.and.iron",
        opening_hours: { mon: "closed", tue: "10-18", wed: "10-18", thu: "10-18", fri: "10-20", sat: "10-16", sun: "closed" },
        distance: 3.2
    }
]

const CATEGORIES = ["All", "Clothing", "Objects", "Art"]

const CATEGORY_EMOJI = {
    clothing: "👗",
    objects: "✦",
    art: "🎨",
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function isOpenNow(hours) {
    if (!hours) return false
    const now = new Date()
    const day = DAYS[now.getDay()]
    const todayHours = hours[day]
    if (!todayHours || todayHours === "closed") return false
    const [open, close] = todayHours.split("-").map(Number)
    const currentHour = now.getHours()
    return currentHour >= open && currentHour < close
}

function getTodayHours(hours) {
    if (!hours) return "Hours unavailable"
    const day = DAYS[new Date().getDay()]
    const todayHours = hours[day]
    if (!todayHours || todayHours === "closed") return "Closed today"
    return `Open ${todayHours.replace("-", "–")}`
}

function getInitials(name) {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function MakerAvatar({ maker, size = 48 }) {
    const s = {
        width: size,
        height: size,
        borderRadius: size / 2,
        background: maker.hero_color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        fontSize: size * 0.32,
        letterSpacing: "0.02em",
        flexShrink: 0
    }
    return <div style={s}>{getInitials(maker.name)}</div>
}

function GalleryPlaceholder({ maker, height = 200 }) {
    const patterns = [
        { emoji: "◆", rotation: 15 },
        { emoji: "○", rotation: -8 },
        { emoji: "△", rotation: 22 }
    ]
    return (
        <div style={{
            display: "flex",
            gap: 8,
            height
        }}>
            {patterns.map((p, i) => (
                <div key={i} style={{
                    flex: 1,
                    borderRadius: 12,
                    background: `${maker.hero_color}${i === 0 ? "22" : i === 1 ? "18" : "12"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    color: maker.hero_color,
                    opacity: 0.5,
                    transform: `rotate(${p.rotation}deg)`
                }}>
                    {p.emoji}
                </div>
            ))}
        </div>
    )
}

function CategoryPills({ selected, onSelect, showOpenNow = false, openNowActive = false, onToggleOpenNow }) {
    return (
        <div style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "0 20px 8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
        }}>
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 100,
                        border: "none",
                        background: selected === cat ? "#1a1a1a" : "#f0ece6",
                        color: selected === cat ? "#faf8f4" : "#1a1a1a",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                        letterSpacing: "0.01em"
                    }}
                >
                    {cat}
                </button>
            ))}
            {showOpenNow && (
                <button
                    onClick={onToggleOpenNow}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 100,
                        border: openNowActive ? "none" : "1.5px solid #d4cfc7",
                        background: openNowActive ? "#22543d" : "transparent",
                        color: openNowActive ? "#fff" : "#666",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease"
                    }}
                >
                    ● Open Now
                </button>
            )}
        </div>
    )
}

function DiscoverScreen({ onMakerTap, savedIds, onToggleSave }) {
    const [category, setCategory] = useState("All")

    const featured = MAKERS.find(m => m.is_featured)
    const nearby = MAKERS
        .filter(m => !m.is_featured)
        .filter(m => category === "All" || m.category === category.toLowerCase())
        .sort((a, b) => a.distance - b.distance)

    const allFiltered = MAKERS
        .filter(m => category === "All" || m.category === category.toLowerCase())
        .sort((a, b) => a.distance - b.distance)

    return (
        <div style={{ paddingBottom: 100 }}>
            {/* Header */}
            <div style={{ padding: "16px 20px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#1a1a1a",
                            margin: 0,
                            letterSpacing: "-0.02em"
                        }}>
                            maven
                        </h1>
                    </div>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f0ece6",
                        padding: "6px 12px",
                        borderRadius: 100
                    }}>
                        <div style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#22543d",
                            animation: "pulse 2s ease-in-out infinite"
                        }} />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#4a4a4a"
                        }}>
                            Galway
                        </span>
                    </div>
                </div>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "#888",
                    margin: "6px 0 0",
                    letterSpacing: "0.01em"
                }}>
                    Discover local makers near you
                </p>
            </div>

            {/* Categories */}
            <CategoryPills selected={category} onSelect={setCategory} />

            {/* Featured Maker */}
            {featured && category === "All" && (
                <div style={{ padding: "12px 20px 0" }}>
                    <div
                        onClick={() => onMakerTap(featured)}
                        style={{
                            background: featured.hero_color,
                            borderRadius: 20,
                            padding: "28px 24px",
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            transition: "transform 0.2s ease"
                        }}
                    >
                        <div style={{
                            position: "absolute",
                            top: -30,
                            right: -30,
                            width: 150,
                            height: 150,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.06)"
                        }} />
                        <div style={{
                            position: "absolute",
                            bottom: -50,
                            left: -20,
                            width: 120,
                            height: 120,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.04)"
                        }} />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.6)",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em"
                        }}>
                            Featured Maker
                        </span>
                        <h2 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#fff",
                            margin: "10px 0 8px",
                            lineHeight: 1.2
                        }}>
                            {featured.name}
                        </h2>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13.5,
                            color: "rgba(255,255,255,0.8)",
                            margin: 0,
                            lineHeight: 1.5,
                            maxWidth: 280
                        }}>
                            {featured.bio}
                        </p>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginTop: 16
                        }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: "rgba(255,255,255,0.6)"
                            }}>
                                {CATEGORY_EMOJI[featured.category]} {featured.category}
                            </span>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: "rgba(255,255,255,0.6)"
                            }}>
                                ◈ {featured.distance} km away
                            </span>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: isOpenNow(featured.opening_hours) ? "rgba(134,239,172,0.9)" : "rgba(255,255,255,0.4)"
                            }}>
                                {isOpenNow(featured.opening_hours) ? "● Open" : "○ Closed"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Nearby Makers - Horizontal Scroll */}
            {category === "All" && (
                <div style={{ marginTop: 28 }}>
                    <div style={{ padding: "0 20px", marginBottom: 14 }}>
                        <h3 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 18,
                            fontWeight: 600,
                            color: "#1a1a1a",
                            margin: 0
                        }}>
                            Nearby
                        </h3>
                    </div>
                    <div style={{
                        display: "flex",
                        gap: 14,
                        overflowX: "auto",
                        padding: "0 20px 4px",
                        scrollbarWidth: "none"
                    }}>
                        {nearby.slice(0, 5).map(maker => (
                            <div
                                key={maker.id}
                                onClick={() => onMakerTap(maker)}
                                style={{
                                    minWidth: 200,
                                    background: "#fff",
                                    borderRadius: 16,
                                    padding: 16,
                                    cursor: "pointer",
                                    border: "1px solid #e8e4de",
                                    transition: "transform 0.15s ease, box-shadow 0.15s ease"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                                    <MakerAvatar maker={maker} size={36} />
                                    <div>
                                        <div style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: "#1a1a1a"
                                        }}>
                                            {maker.name}
                                        </div>
                                        <div style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 11.5,
                                            color: "#999"
                                        }}>
                                            {maker.category} · {maker.distance} km
                                        </div>
                                    </div>
                                </div>
                                <p style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12.5,
                                    color: "#666",
                                    margin: 0,
                                    lineHeight: 1.5,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                }}>
                                    {maker.bio}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Makers List */}
            <div style={{ marginTop: 28, padding: "0 20px" }}>
                <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    margin: "0 0 14px"
                }}>
                    {category === "All" ? "All Makers" : category}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {allFiltered.map((maker, i) => (
                        <div
                            key={maker.id}
                            onClick={() => onMakerTap(maker)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: 14,
                                background: "#fff",
                                borderRadius: 14,
                                cursor: "pointer",
                                border: "1px solid #e8e4de",
                                transition: "transform 0.15s ease",
                                animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`
                            }}
                        >
                            <MakerAvatar maker={maker} size={48} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 14.5,
                                        fontWeight: 600,
                                        color: "#1a1a1a"
                                    }}>
                                        {maker.name}
                                    </span>
                                    {maker.is_verified && (
                                        <span style={{ fontSize: 12 }} title="Verified">✓</span>
                                    )}
                                </div>
                                <div style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    color: "#999",
                                    marginTop: 2
                                }}>
                                    {maker.category} · {maker.distance} km · {getTodayHours(maker.opening_hours)}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSave(maker.id) }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: 20,
                                    cursor: "pointer",
                                    padding: 4,
                                    color: savedIds.has(maker.id) ? "#c53030" : "#ccc",
                                    transition: "transform 0.2s ease"
                                }}
                            >
                                {savedIds.has(maker.id) ? "♥" : "♡"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function MakerProfile({ maker, onBack, isSaved, onToggleSave }) {
    const [shareToast, setShareToast] = useState(false)

    const handleShare = useCallback(() => {
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2000)
    }, [])

    return (
        <div style={{ paddingBottom: 100, animation: "fadeSlideIn 0.25s ease" }}>
            {/* Hero */}
            <div style={{
                background: maker.hero_color,
                padding: "16px 20px 32px",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{
                    position: "absolute",
                    top: -60,
                    right: -60,
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)"
                }} />

                {/* Top bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24
                }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: "rgba(255,255,255,0.15)",
                            border: "none",
                            borderRadius: 100,
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#fff",
                            fontSize: 18
                        }}
                    >
                        ←
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={handleShare}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                border: "none",
                                borderRadius: 100,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 16
                            }}
                        >
                            ↗
                        </button>
                        <button
                            onClick={() => onToggleSave(maker.id)}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                border: "none",
                                borderRadius: 100,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 18,
                                color: isSaved ? "#fc8181" : "#fff"
                            }}
                        >
                            {isSaved ? "♥" : "♡"}
                        </button>
                    </div>
                </div>

                {/* Maker Info */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                    <MakerAvatar maker={maker} size={64} />
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h1 style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 24,
                                fontWeight: 700,
                                color: "#fff",
                                margin: 0,
                                lineHeight: 1.2
                            }}>
                                {maker.name}
                            </h1>
                            {maker.is_verified && (
                                <span style={{
                                    background: "rgba(255,255,255,0.2)",
                                    padding: "2px 8px",
                                    borderRadius: 100,
                                    fontSize: 10,
                                    color: "#fff",
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontWeight: 600
                                }}>
                                    Verified
                                </span>
                            )}
                        </div>
                        <div style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: "rgba(255,255,255,0.7)",
                            marginTop: 4
                        }}>
                            {maker.address}, {maker.city}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "24px 20px" }}>
                {/* Category Tags */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <span style={{
                        padding: "6px 12px",
                        borderRadius: 100,
                        background: "#f0ece6",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#555"
                    }}>
                        {CATEGORY_EMOJI[maker.category]} {maker.category}
                    </span>
                    <span style={{
                        padding: "6px 12px",
                        borderRadius: 100,
                        background: isOpenNow(maker.opening_hours) ? "#f0fff4" : "#fef5f5",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        color: isOpenNow(maker.opening_hours) ? "#22543d" : "#9b2c2c"
                    }}>
                        {isOpenNow(maker.opening_hours) ? "● Open Now" : "○ Closed"}
                    </span>
                </div>

                {/* Bio */}
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    color: "#333",
                    lineHeight: 1.65,
                    margin: "0 0 24px"
                }}>
                    {maker.bio}
                </p>

                {/* Stats */}
                <div style={{
                    display: "flex",
                    gap: 0,
                    background: "#f9f7f3",
                    borderRadius: 14,
                    padding: 4,
                    marginBottom: 24
                }}>
                    {[
                        { label: "Distance", value: `${maker.distance} km` },
                        { label: "Making for", value: `${maker.years_active} yrs` },
                        { label: "Based in", value: maker.country }
                    ].map((stat, i) => (
                        <div key={i} style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "14px 8px",
                            borderRight: i < 2 ? "1px solid #e8e4de" : "none"
                        }}>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#999",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 4
                            }}>
                                {stat.label}
                            </div>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1a1a1a"
                            }}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Gallery */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        margin: "0 0 12px"
                    }}>
                        Studio
                    </h3>
                    <GalleryPlaceholder maker={maker} />
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: "#bbb",
                        textAlign: "center",
                        marginTop: 8,
                        fontStyle: "italic"
                    }}>
                        Gallery images from maker
                    </p>
                </div>

                {/* Hours */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        margin: "0 0 12px"
                    }}>
                        Opening Hours
                    </h3>
                    <div style={{
                        background: "#f9f7f3",
                        borderRadius: 14,
                        padding: "14px 18px"
                    }}>
                        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(day => {
                            const hours = maker.opening_hours[day]
                            const isToday = DAYS[new Date().getDay()] === day
                            return (
                                <div key={day} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "7px 0",
                                    borderBottom: day !== "sun" ? "1px solid #eeebe5" : "none"
                                }}>
                                    <span style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13,
                                        fontWeight: isToday ? 700 : 400,
                                        color: isToday ? "#1a1a1a" : "#666",
                                        textTransform: "capitalize"
                                    }}>
                                        {day}{isToday ? " ·" : ""}
                                    </span>
                                    <span style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13,
                                        fontWeight: isToday ? 600 : 400,
                                        color: !hours || hours === "closed" ? "#ccc" : isToday ? "#1a1a1a" : "#666"
                                    }}>
                                        {!hours || hours === "closed" ? "Closed" : hours.replace("-", " – ")}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Links */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {maker.instagram_handle && (
                        <a
                            href={`https://instagram.com/${maker.instagram_handle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                background: "#f9f7f3",
                                borderRadius: 12,
                                textDecoration: "none",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: "#555"
                            }}
                        >
                            <span style={{ fontSize: 16 }}>📷</span>
                            {maker.instagram_handle}
                        </a>
                    )}
                    {maker.website_url && (
                        <a
                            href={maker.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                background: "#f9f7f3",
                                borderRadius: 12,
                                textDecoration: "none",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: "#555"
                            }}
                        >
                            <span style={{ fontSize: 16 }}>🌐</span>
                            {maker.website_url.replace("https://", "")}
                        </a>
                    )}
                </div>

                {/* CTA */}
                <button
                    onClick={() => window.open(`https://maps.apple.com/?daddr=${maker.lat},${maker.lng}`, "_blank")}
                    style={{
                        width: "100%",
                        padding: "16px 24px",
                        borderRadius: 14,
                        border: "none",
                        background: "#1a1a1a",
                        color: "#fff",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "opacity 0.2s ease",
                        letterSpacing: "0.01em"
                    }}
                >
                    Visit Studio — Get Directions ↗
                </button>
            </div>

            {/* Share Toast */}
            {shareToast && (
                <div style={{
                    position: "fixed",
                    bottom: 100,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1a1a1a",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: 100,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    zIndex: 100,
                    animation: "fadeSlideIn 0.2s ease"
                }}>
                    Link copied — share with a friend!
                </div>
            )}
        </div>
    )
}

function MapScreen({ onMakerTap, savedIds, onToggleSave }) {
    const [category, setCategory] = useState("All")
    const [openNow, setOpenNow] = useState(false)
    const [selectedMaker, setSelectedMaker] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")

    const filtered = MAKERS
        .filter(m => category === "All" || m.category === category.toLowerCase())
        .filter(m => !openNow || isOpenNow(m.opening_hours))
        .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div style={{ height: "100%", position: "relative" }}>
            {/* Search Bar */}
            <div style={{
                position: "absolute",
                top: 12,
                left: 12,
                right: 12,
                zIndex: 10
            }}>
                <div style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    border: "1px solid #e8e4de"
                }}>
                    <span style={{ fontSize: 16, color: "#999" }}>⌕</span>
                    <input
                        placeholder="Search makers or city..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            border: "none",
                            outline: "none",
                            flex: 1,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            color: "#1a1a1a",
                            background: "transparent"
                        }}
                    />
                </div>
            </div>

            {/* Filter Pills */}
            <div style={{
                position: "absolute",
                top: 64,
                left: 0,
                right: 0,
                zIndex: 10
            }}>
                <CategoryPills
                    selected={category}
                    onSelect={setCategory}
                    showOpenNow
                    openNowActive={openNow}
                    onToggleOpenNow={() => setOpenNow(!openNow)}
                />
            </div>

            {/* Map Placeholder */}
            <div style={{
                width: "100%",
                height: "100%",
                background: "#e8e4de",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Grid pattern to simulate map */}
                <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.3 }}>
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c4bfb5" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Simulated road lines */}
                <div style={{
                    position: "absolute",
                    top: "35%",
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "#d4cfc7"
                }} />
                <div style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "45%",
                    width: 3,
                    background: "#d4cfc7"
                }} />
                <div style={{
                    position: "absolute",
                    top: "60%",
                    left: "20%",
                    right: "10%",
                    height: 2,
                    background: "#d4cfc7",
                    transform: "rotate(-15deg)"
                }} />

                {/* User location */}
                <div style={{
                    position: "absolute",
                    top: "48%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 5
                }}>
                    <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#3B82F6",
                        border: "3px solid #fff",
                        boxShadow: "0 2px 8px rgba(59,130,246,0.4)",
                        position: "relative"
                    }}>
                        <div style={{
                            position: "absolute",
                            top: -8,
                            left: -8,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "rgba(59,130,246,0.15)",
                            animation: "pulse 2s ease-in-out infinite"
                        }} />
                    </div>
                </div>

                {/* Maker Pins */}
                {filtered.map((maker, i) => {
                    const positions = [
                        { top: "25%", left: "30%" },
                        { top: "32%", left: "62%" },
                        { top: "42%", left: "22%" },
                        { top: "38%", left: "75%" },
                        { top: "55%", left: "35%" },
                        { top: "60%", left: "68%" },
                        { top: "70%", left: "25%" },
                        { top: "52%", left: "55%" }
                    ]
                    const pos = positions[i % positions.length]
                    const isSelected = selectedMaker?.id === maker.id

                    return (
                        <div
                            key={maker.id}
                            onClick={() => setSelectedMaker(maker)}
                            style={{
                                position: "absolute",
                                ...pos,
                                zIndex: isSelected ? 8 : 6,
                                cursor: "pointer",
                                transition: "transform 0.2s ease",
                                transform: isSelected ? "scale(1.15)" : "scale(1)"
                            }}
                        >
                            <div style={{
                                background: isSelected ? "#1a1a1a" : "#fff",
                                color: isSelected ? "#fff" : "#1a1a1a",
                                padding: "6px 10px",
                                borderRadius: 10,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                border: isSelected ? "none" : "1px solid #e0ddd6"
                            }}>
                                <span>{CATEGORY_EMOJI[maker.category]}</span>
                                {maker.name}
                            </div>
                            <div style={{
                                width: 8,
                                height: 8,
                                background: isSelected ? "#1a1a1a" : "#fff",
                                border: isSelected ? "none" : "1px solid #e0ddd6",
                                transform: "rotate(45deg)",
                                margin: "-5px auto 0",
                                boxShadow: "2px 2px 4px rgba(0,0,0,0.06)"
                            }} />
                        </div>
                    )
                })}
            </div>

            {/* Bottom Card */}
            {selectedMaker && (
                <div style={{
                    position: "absolute",
                    bottom: 76,
                    left: 12,
                    right: 12,
                    background: "#fff",
                    borderRadius: 18,
                    padding: 18,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    zIndex: 10,
                    animation: "slideUp 0.25s ease",
                    border: "1px solid #e8e4de"
                }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <MakerAvatar maker={selectedMaker} size={50} />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#1a1a1a"
                                }}>
                                    {selectedMaker.name}
                                </span>
                                {selectedMaker.is_verified && <span style={{ fontSize: 12 }}>✓</span>}
                            </div>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                color: "#888",
                                marginTop: 2
                            }}>
                                {selectedMaker.category} · {selectedMaker.distance} km · {getTodayHours(selectedMaker.opening_hours)}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSave(selectedMaker.id) }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    border: "1px solid #e0ddd6",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 16,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: savedIds.has(selectedMaker.id) ? "#c53030" : "#999"
                                }}
                            >
                                {savedIds.has(selectedMaker.id) ? "♥" : "♡"}
                            </button>
                            <button
                                onClick={() => onMakerTap(selectedMaker)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "#1a1a1a",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff"
                                }}
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function SavedScreen({ onMakerTap, savedIds, onToggleSave }) {
    const savedMakers = MAKERS.filter(m => savedIds.has(m.id))

    return (
        <div style={{ paddingBottom: 100 }}>
            <div style={{ padding: "16px 20px 20px" }}>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    margin: "0 0 4px",
                    letterSpacing: "-0.02em"
                }}>
                    Saved
                </h1>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "#888",
                    margin: 0
                }}>
                    {savedMakers.length} maker{savedMakers.length !== 1 ? "s" : ""} saved
                </p>
            </div>

            {savedMakers.length === 0 ? (
                <div style={{
                    padding: "60px 40px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>♡</div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        color: "#999",
                        lineHeight: 1.6
                    }}>
                        No saved makers yet.<br />
                        Tap the heart on any maker to save them here.
                    </p>
                </div>
            ) : (
                <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {savedMakers.map((maker, i) => (
                        <div
                            key={maker.id}
                            onClick={() => onMakerTap(maker)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: 14,
                                background: "#fff",
                                borderRadius: 14,
                                cursor: "pointer",
                                border: "1px solid #e8e4de",
                                animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`
                            }}
                        >
                            <MakerAvatar maker={maker} size={48} />
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14.5,
                                    fontWeight: 600,
                                    color: "#1a1a1a"
                                }}>
                                    {maker.name}
                                </div>
                                <div style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    color: "#999",
                                    marginTop: 2
                                }}>
                                    {maker.category} · {maker.city} · {maker.distance} km
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSave(maker.id) }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: 20,
                                    cursor: "pointer",
                                    padding: 4,
                                    color: "#c53030"
                                }}
                            >
                                ♥
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ProfileScreen() {
    return (
        <div style={{ paddingBottom: 100 }}>
            <div style={{ padding: "16px 20px 20px" }}>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    margin: "0 0 24px",
                    letterSpacing: "-0.02em"
                }}>
                    Profile
                </h1>

                {/* Profile placeholder */}
                <div style={{
                    background: "#f9f7f3",
                    borderRadius: 18,
                    padding: "32px 24px",
                    textAlign: "center",
                    marginBottom: 20
                }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "#e0ddd6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                        fontSize: 28,
                        color: "#999"
                    }}>
                        ◯
                    </div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: "#888",
                        margin: 0,
                        lineHeight: 1.6
                    }}>
                        Sign in to sync your saved makers across devices
                    </p>
                    <button style={{
                        marginTop: 16,
                        padding: "12px 28px",
                        borderRadius: 100,
                        border: "none",
                        background: "#1a1a1a",
                        color: "#fff",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer"
                    }}>
                        Sign In
                    </button>
                </div>

                {/* Settings items */}
                {[
                    { icon: "◎", label: "Location Settings" },
                    { icon: "◈", label: "Notifications" },
                    { icon: "◇", label: "About maven" },
                    { icon: "↗", label: "Suggest a Maker" }
                ].map((item, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "16px 0",
                            borderBottom: i < 3 ? "1px solid #eee" : "none",
                            cursor: "pointer"
                        }}
                    >
                        <span style={{ fontSize: 18, color: "#888", width: 24, textAlign: "center" }}>{item.icon}</span>
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14.5,
                            color: "#333",
                            flex: 1
                        }}>
                            {item.label}
                        </span>
                        <span style={{ color: "#ccc", fontSize: 14 }}>›</span>
                    </div>
                ))}

                <div style={{
                    marginTop: 32,
                    textAlign: "center"
                }}>
                    <span style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#ddd"
                    }}>
                        maven
                    </span>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: "#ccc",
                        margin: "4px 0 0"
                    }}>
                        v1.0.0 · Made with ♥ in Galway
                    </p>
                </div>
            </div>
        </div>
    )
}

const TAB_ITEMS = [
    { id: "discover", label: "Discover", icon: "◉" },
    { id: "map", label: "Map", icon: "◎" },
    { id: "saved", label: "Saved", icon: "♡" },
    { id: "profile", label: "Profile", icon: "◯" }
]

export default function MavenApp() {
    const [activeTab, setActiveTab] = useState("discover")
    const [selectedMaker, setSelectedMaker] = useState(null)
    const [savedIds, setSavedIds] = useState(new Set())
    const containerRef = useRef(null)

    const handleMakerTap = useCallback((maker) => {
        setSelectedMaker(maker)
        if (containerRef.current) containerRef.current.scrollTop = 0
    }, [])

    const handleBack = useCallback(() => {
        setSelectedMaker(null)
    }, [])

    const handleToggleSave = useCallback((makerId) => {
        setSavedIds(prev => {
            const next = new Set(prev)
            if (next.has(makerId)) {
                next.delete(makerId)
            } else {
                next.add(makerId)
            }
            return next
        })
    }, [])

    const handleTabChange = useCallback((tab) => {
        setSelectedMaker(null)
        setActiveTab(tab)
    }, [])

    return (
        <div style={{
            width: "100%",
            maxWidth: 430,
            margin: "0 auto",
            height: "100vh",
            background: "#faf8f4",
            position: "relative",
            overflow: "hidden",
            fontFamily: "'DM Sans', sans-serif",
            borderLeft: "1px solid #e8e4de",
            borderRight: "1px solid #e8e4de"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@400;500;600;700&display=swap');

                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                ::-webkit-scrollbar { display: none; }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.4); }
                }

                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Content */}
            <div
                ref={containerRef}
                style={{
                    height: "calc(100vh - 64px)",
                    overflowY: "auto",
                    overflowX: "hidden"
                }}
            >
                {selectedMaker ? (
                    <MakerProfile
                        maker={selectedMaker}
                        onBack={handleBack}
                        isSaved={savedIds.has(selectedMaker.id)}
                        onToggleSave={handleToggleSave}
                    />
                ) : activeTab === "discover" ? (
                    <DiscoverScreen
                        onMakerTap={handleMakerTap}
                        savedIds={savedIds}
                        onToggleSave={handleToggleSave}
                    />
                ) : activeTab === "map" ? (
                    <MapScreen
                        onMakerTap={handleMakerTap}
                        savedIds={savedIds}
                        onToggleSave={handleToggleSave}
                    />
                ) : activeTab === "saved" ? (
                    <SavedScreen
                        onMakerTap={handleMakerTap}
                        savedIds={savedIds}
                        onToggleSave={handleToggleSave}
                    />
                ) : (
                    <ProfileScreen />
                )}
            </div>

            {/* Tab Bar */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 64,
                background: "rgba(250,248,244,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderTop: "1px solid #e8e4de",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                padding: "0 8px",
                zIndex: 20
            }}>
                {TAB_ITEMS.map(tab => {
                    const isActive = !selectedMaker && activeTab === tab.id
                    const savedCount = tab.id === "saved" ? savedIds.size : 0
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 3,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px 16px",
                                position: "relative",
                                transition: "opacity 0.2s ease",
                                opacity: isActive ? 1 : 0.45
                            }}
                        >
                            <span style={{ fontSize: 20, lineHeight: 1 }}>
                                {tab.id === "saved" && savedCount > 0 ? "♥" : tab.icon}
                            </span>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: isActive ? 600 : 500,
                                color: "#1a1a1a",
                                letterSpacing: "0.02em"
                            }}>
                                {tab.label}
                            </span>
                            {isActive && (
                                <div style={{
                                    position: "absolute",
                                    top: 0,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    background: "#1a1a1a"
                                }} />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
