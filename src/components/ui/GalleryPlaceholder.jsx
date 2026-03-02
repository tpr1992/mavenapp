import { optimizeImageUrl } from "../../utils/image"

const PATTERNS = [
    { emoji: "\u25C6", rotation: 15 },
    { emoji: "\u25CB", rotation: -8 },
    { emoji: "\u25B3", rotation: 22 },
]

export default function GalleryPlaceholder({ maker, height = 200 }) {
    if (maker.gallery_urls && maker.gallery_urls.length > 0) {
        return (
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    height,
                    overflowX: "auto",
                    scrollSnapType: "x proximity",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    overscrollBehavior: "contain",
                    willChange: "scroll-position",
                }}
            >
                {maker.gallery_urls.map((url, i) => (
                    <img
                        key={i}
                        src={optimizeImageUrl(url, 200)}
                        alt={`${maker.name} gallery ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{
                            height: "100%",
                            minWidth: 160,
                            borderRadius: 12,
                            objectFit: "cover",
                            flexShrink: 0,
                            scrollSnapAlign: "start",
                        }}
                    />
                ))}
            </div>
        )
    }

    return (
        <div style={{ display: "flex", gap: 8, height }}>
            {PATTERNS.map((p, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        background: `${maker.hero_color}${i === 0 ? "22" : i === 1 ? "18" : "12"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        color: maker.hero_color,
                        opacity: 0.5,
                        transform: `rotate(${p.rotation}deg)`,
                    }}
                >
                    {p.emoji}
                </div>
            ))}
        </div>
    )
}
