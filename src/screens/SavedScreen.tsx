import { Helmet } from "react-helmet-async"
import { optimizeImageUrl, imageSrcSet } from "../utils/image"
import { formatLocation } from "../utils/distance"
import { useTheme } from "../contexts/ThemeContext"
import { useAuth } from "../contexts/AuthContext"
import { useMakersContext } from "../contexts/MakersContext"
import type { Maker } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"
import { font } from "../styles/tokens"

interface SavedScreenProps {
    onMakerTap: (maker: Maker) => void
    onToggleSave: (id: string) => void
    onTabChange: (tab: string) => void
    onLogoTap: () => void
    breakpoint?: Breakpoint
}

interface LayoutRow {
    type: "full" | "pair"
    makers: Maker[]
}

function buildRows(makers: Maker[]): LayoutRow[] {
    const rows: LayoutRow[] = []
    let i = 0
    let rowType = 0
    while (i < makers.length) {
        if (rowType % 3 === 0 && i < makers.length) {
            rows.push({ type: "full", makers: [makers[i]] })
            i++
        } else if (i + 1 < makers.length) {
            rows.push({ type: "pair", makers: [makers[i], makers[i + 1]] })
            i += 2
        } else {
            rows.push({ type: "full", makers: [makers[i]] })
            i++
        }
        rowType++
    }
    return rows
}

export default function SavedScreen({
    onMakerTap,
    onToggleSave,
    onTabChange,
    onLogoTap: _onLogoTap,
    breakpoint: _breakpoint = "mobile",
}: SavedScreenProps) {
    const { theme } = useTheme()
    const { makers, loading: makersLoading, savedIds } = useMakersContext()
    const { user } = useAuth()
    const savedMakers = makers.filter((m) => savedIds.has(m.id))

    return (
        <div style={{ paddingBottom: 16 }}>
            <Helmet>
                <title>Saved — maven</title>
            </Helmet>
            <div style={{ padding: "0 20px 16px" }}>
                <h2
                    style={{
                        fontFamily: font.heading,
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: theme.text,
                        margin: "14px 0 4px",
                    }}
                >
                    Saved
                </h2>
                <span
                    style={{
                        fontFamily: font.body,
                        fontSize: 12,
                        color: theme.textMuted,
                    }}
                >
                    {savedMakers.length} maker{savedMakers.length !== 1 ? "s" : ""} saved
                </span>
            </div>
            <div style={{ animation: "fadeIn 0.15s ease" }}>
                {makersLoading ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div
                            style={{
                                marginBottom: 16,
                                opacity: 0.3,
                                animation: "pulse 1.5s ease infinite",
                                color: theme.textMuted,
                            }}
                        >
                            <svg
                                width={40}
                                height={40}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </div>
                    </div>
                ) : !user ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div style={{ marginBottom: 16, color: theme.textMuted }}>
                            <svg
                                width={40}
                                height={40}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </div>
                        <p
                            style={{
                                fontFamily: font.body,
                                fontSize: 15,
                                color: theme.textMuted,
                                lineHeight: 1.6,
                            }}
                        >
                            Sign in to save your favourite makers.
                        </p>
                        <button
                            onClick={() => onTabChange("profile")}
                            style={{
                                marginTop: 16,
                                fontFamily: font.body,
                                fontSize: 14,
                                fontWeight: 600,
                                color: theme.bg,
                                background: theme.text,
                                border: "none",
                                borderRadius: 0,
                                padding: "10px 24px",
                                cursor: "pointer",
                            }}
                        >
                            Sign in
                        </button>
                    </div>
                ) : savedMakers.length === 0 ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div style={{ marginBottom: 16, color: theme.textMuted }}>
                            <svg
                                width={40}
                                height={40}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </div>
                        <p
                            style={{
                                fontFamily: font.heading,
                                fontSize: 14,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                            }}
                        >
                            NO SAVES YET
                        </p>
                        <p
                            style={{
                                fontFamily: font.body,
                                fontSize: 13,
                                color: theme.textMuted,
                                lineHeight: 1.6,
                                marginTop: 8,
                            }}
                        >
                            Tap the heart on any maker to save them here.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "0 3px" }}>
                        {buildRows(savedMakers).map((row, ri) => {
                            if (row.type === "full") {
                                const maker = row.makers[0]
                                const heroUrl = maker.gallery_urls?.[0]
                                return (
                                    <div
                                        key={maker.id}
                                        onClick={() => onMakerTap(maker)}
                                        style={{
                                            height: 200,
                                            position: "relative",
                                            overflow: "hidden",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {heroUrl ? (
                                            <img
                                                src={optimizeImageUrl(heroUrl, 600) ?? undefined}
                                                srcSet={imageSrcSet(heroUrl, 400)}
                                                alt={maker.name}
                                                loading="lazy"
                                                decoding="async"
                                                onLoad={(e) => {
                                                    ;(e.target as HTMLImageElement).style.opacity = "1"
                                                }}
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    opacity: 0,
                                                    transition: "opacity 0.3s ease",
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    background: maker.hero_color || theme.surface,
                                                }}
                                            />
                                        )}
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: "55%",
                                                background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))",
                                                pointerEvents: "none",
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: "0 16px 14px",
                                                zIndex: 5,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontFamily: font.body,
                                                    fontSize: 8.5,
                                                    fontWeight: 500,
                                                    letterSpacing: "0.14em",
                                                    textTransform: "uppercase",
                                                    color: "rgba(255,255,255,0.35)",
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {maker.category}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: font.heading,
                                                    fontSize: 20,
                                                    fontWeight: 800,
                                                    letterSpacing: "0.03em",
                                                    textTransform: "uppercase",
                                                    color: "#fff",
                                                    margin: "0 0 4px",
                                                    lineHeight: 1.15,
                                                }}
                                            >
                                                {maker.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: font.body,
                                                    fontSize: 10.5,
                                                    color: "rgba(255,255,255,0.35)",
                                                }}
                                            >
                                                {formatLocation(maker)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onToggleSave(maker.id)
                                            }}
                                            aria-label={`Unsave ${maker.name}`}
                                            style={{
                                                position: "absolute",
                                                top: 12,
                                                right: 14,
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                padding: 4,
                                                zIndex: 5,
                                                color: "#fc8181",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                                            </svg>
                                        </button>
                                    </div>
                                )
                            }
                            // Pair row
                            return (
                                <div key={`pair-${ri}`} style={{ display: "flex", gap: 3 }}>
                                    {row.makers.map((maker) => {
                                        const heroUrl = maker.gallery_urls?.[0]
                                        return (
                                            <div
                                                key={maker.id}
                                                onClick={() => onMakerTap(maker)}
                                                style={{
                                                    flex: 1,
                                                    height: 220,
                                                    position: "relative",
                                                    overflow: "hidden",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {heroUrl ? (
                                                    <img
                                                        src={optimizeImageUrl(heroUrl, 400) ?? undefined}
                                                        srcSet={imageSrcSet(heroUrl, 400)}
                                                        alt={maker.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        onLoad={(e) => {
                                                            ;(e.target as HTMLImageElement).style.opacity = "1"
                                                        }}
                                                        style={{
                                                            position: "absolute",
                                                            inset: 0,
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                            opacity: 0,
                                                            transition: "opacity 0.3s ease",
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            inset: 0,
                                                            background: maker.hero_color || theme.surface,
                                                        }}
                                                    />
                                                )}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: "50%",
                                                        background:
                                                            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))",
                                                        pointerEvents: "none",
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        padding: "0 12px 12px",
                                                        zIndex: 5,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontFamily: font.heading,
                                                            fontSize: 14,
                                                            fontWeight: 800,
                                                            letterSpacing: "0.03em",
                                                            textTransform: "uppercase",
                                                            color: "#fff",
                                                            margin: "0 0 3px",
                                                            lineHeight: 1.15,
                                                        }}
                                                    >
                                                        {maker.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontFamily: font.body,
                                                            fontSize: 9.5,
                                                            color: "rgba(255,255,255,0.3)",
                                                        }}
                                                    >
                                                        {formatLocation(maker)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onToggleSave(maker.id)
                                                    }}
                                                    aria-label={`Unsave ${maker.name}`}
                                                    style={{
                                                        position: "absolute",
                                                        top: 8,
                                                        right: 10,
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        padding: 4,
                                                        zIndex: 5,
                                                        color: "#fc8181",
                                                    }}
                                                >
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
