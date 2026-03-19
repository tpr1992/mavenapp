import { optimizeImageUrl, imageSrcSet } from "../../utils/image"
import type { Maker, Theme } from "../../types"
import { font } from "../../styles/tokens"

function SocialsTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const handle = maker.instagram_handle || ""
    const cleanHandle = handle.replace("@", "")
    const images = maker.gallery_urls || []

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px" }}>
                <div
                    style={{
                        width: 32,
                        height: 32,
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.textMuted}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontFamily: font.heading,
                            fontSize: 16,
                            fontWeight: 800,
                            color: theme.text,
                        }}
                    >
                        Instagram
                    </div>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 11,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                        }}
                    >
                        {handle}
                    </div>
                </div>
                <a
                    href={`https://instagram.com/${cleanHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontFamily: font.body,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: theme.textMuted,
                        border: `1px solid ${theme.border}`,
                        padding: "5px 10px",
                        borderRadius: 0,
                        textDecoration: "none",
                    }}
                >
                    View Profile
                </a>
            </div>

            {images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, padding: "0 12px" }}>
                    {images.slice(0, 9).map((url, i) => (
                        <div
                            key={i}
                            style={{
                                aspectRatio: "1",
                                borderRadius: 0,
                                overflow: "hidden",
                                background: theme.surface,
                                animation: `fadeSlideIn 0.35s ease ${i * 0.04}s both`,
                            }}
                        >
                            <img
                                src={optimizeImageUrl(url, 150) ?? undefined}
                                srcSet={imageSrcSet(url, 150) ?? undefined}
                                alt={`${maker.name} instagram ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                onLoad={(e) => {
                                    ;(e.currentTarget as HTMLImageElement).style.opacity = "1"
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    opacity: 0,
                                    transition: "opacity 0.3s ease",
                                }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                    <p
                        style={{
                            fontFamily: font.body,
                            fontSize: 13,
                            color: theme.textMuted,
                            lineHeight: 1.6,
                        }}
                    >
                        Visit {handle} on Instagram to see their latest work.
                    </p>
                </div>
            )}

            <a
                href={`https://instagram.com/${cleanHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    margin: "12px 16px 0",
                    border: `1px solid ${theme.border}`,
                    borderRadius: 0,
                    padding: 14,
                    fontFamily: font.body,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: theme.textMuted,
                    textDecoration: "none",
                }}
            >
                View all on Instagram
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.textMuted}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            </a>
        </div>
    )
}

export default SocialsTab
