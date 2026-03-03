import { memo } from "react"
import { optimizeImageUrl } from "../../utils/image"
import { useTheme } from "../../contexts/ThemeContext"

const HEIGHT_VARIANTS = [220, 260, 190, 240, 210]

export default memo(function RelatedMakersFeed({ makers, onMakerTap }) {
    const { theme } = useTheme()

    if (!makers.length) return null

    return (
        <div style={{ marginTop: 28, padding: "0 12px" }}>
            <div style={{ padding: "0 4px", marginBottom: 16 }}>
                <h3
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 18,
                        fontWeight: 600,
                        color: theme.text,
                        margin: 0,
                    }}
                >
                    Discover more
                </h3>
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: theme.textMuted,
                        margin: "4px 0 0",
                    }}
                >
                    Makers you might love
                </p>
            </div>

            {/* Masonry grid — two columns with staggered heights */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {[0, 1].map((col) => (
                    <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        {makers
                            .filter((_, i) => i % 2 === col)
                            .map((m, i) => {
                                const heroUrl = m.gallery_urls?.[0]
                                const imgHeight = HEIGHT_VARIANTS[(i + col) % HEIGHT_VARIANTS.length]
                                const delay = Math.min(i * 0.06, 0.5)

                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => onMakerTap(m)}
                                        style={{
                                            borderRadius: 14,
                                            overflow: "hidden",
                                            cursor: "pointer",
                                            background: theme.card,
                                            border: `1px solid ${theme.border}`,
                                            animation: `fadeSlideIn 0.4s ease ${delay}s both`,
                                        }}
                                    >
                                        {heroUrl ? (
                                            <div
                                                style={{
                                                    position: "relative",
                                                    height: imgHeight,
                                                    background: theme.surface,
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <img
                                                    src={optimizeImageUrl(heroUrl, 300)}
                                                    alt={m.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onLoad={(e) => {
                                                        e.target.style.opacity = "1"
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                        opacity: 0,
                                                        transition: "opacity 0.35s ease",
                                                    }}
                                                />
                                                {/* Bottom scrim */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: "50%",
                                                        background:
                                                            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)",
                                                        pointerEvents: "none",
                                                    }}
                                                />
                                                {/* Overlay text */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        padding: "10px 12px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontFamily: "'Playfair Display', serif",
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            color: "#fff",
                                                            lineHeight: 1.2,
                                                        }}
                                                    >
                                                        {m.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontFamily: "'DM Sans', sans-serif",
                                                            fontSize: 10.5,
                                                            color: "rgba(255,255,255,0.7)",
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {m.category}
                                                        {m.city && ` \u00B7 ${m.city}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    height: 120,
                                                    background: theme.surface,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    padding: 16,
                                                }}
                                            >
                                                <div style={{ textAlign: "center" }}>
                                                    <div
                                                        style={{
                                                            fontFamily: "'Playfair Display', serif",
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            color: theme.text,
                                                        }}
                                                    >
                                                        {m.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontFamily: "'DM Sans', sans-serif",
                                                            fontSize: 10.5,
                                                            color: theme.textMuted,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        {m.category}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                ))}
            </div>

            {/* Footer count */}
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
                <span
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: theme.textMuted,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                    }}
                >
                    {makers.length} makers to explore
                </span>
            </div>
        </div>
    )
})
