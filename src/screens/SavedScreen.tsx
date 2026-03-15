import { Helmet } from "react-helmet-async"
import MakerListItem from "../components/makers/MakerListItem"
import { useTheme } from "../contexts/ThemeContext"
import { useAuth } from "../contexts/AuthContext"
import type { Maker } from "../types"
import type { Breakpoint } from "../hooks/useBreakpoint"

interface SavedScreenProps {
    makers?: Maker[]
    makersLoading: boolean
    onMakerTap: (maker: Maker) => void
    savedIds: Set<string>
    onToggleSave: (id: string) => void
    onTabChange: (tab: string) => void
    onLogoTap: () => void
    breakpoint?: Breakpoint
}

export default function SavedScreen({
    makers = [],
    makersLoading,
    onMakerTap,
    savedIds,
    onToggleSave,
    onTabChange,
    onLogoTap,
    breakpoint = "mobile",
}: SavedScreenProps) {
    const { theme } = useTheme()
    const { user } = useAuth()
    const savedMakers = makers.filter((m) => savedIds.has(m.id))

    return (
        <div style={{ paddingBottom: 100 }}>
            <Helmet>
                <title>Favourites — maven</title>
            </Helmet>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    height: 50,
                    boxSizing: "border-box",
                    padding: "10px 16px 10px 20px",
                }}
            >
                <h1
                    onClick={onLogoTap}
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 30,
                        fontWeight: 700,
                        color: theme.text,
                        margin: 0,
                        letterSpacing: "-0.03em",
                        lineHeight: 0.75,
                        cursor: "pointer",
                    }}
                >
                    maven
                </h1>
            </div>
            <div style={{ padding: "4px 16px 12px" }}>
                <h2
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 22,
                        fontWeight: 700,
                        color: theme.text,
                        margin: 0,
                    }}
                >
                    Favourites
                </h2>
            </div>
            <div style={{ animation: "fadeIn 0.15s ease" }}>
                <div style={{ padding: "14px 16px 14px" }}>
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            color: theme.textMuted,
                            margin: 0,
                        }}
                    >
                        {savedMakers.length} maker{savedMakers.length !== 1 ? "s" : ""} saved
                    </p>
                </div>

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
                                strokeWidth={1.5}
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
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </div>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
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
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                color: theme.bg,
                                background: theme.text,
                                border: "none",
                                borderRadius: 100,
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
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                            </svg>
                        </div>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 15,
                                color: theme.textMuted,
                                lineHeight: 1.6,
                            }}
                        >
                            No saved makers yet.
                            <br />
                            Tap the heart on any maker to save them here.
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            padding: "0 4px",
                            display: breakpoint !== "mobile" ? "grid" : "flex",
                            ...(breakpoint !== "mobile"
                                ? { gridTemplateColumns: "1fr 1fr", gap: 8 }
                                : { flexDirection: "column" as const, gap: 4 }),
                        }}
                    >
                        {savedMakers.map((maker, i) => (
                            <MakerListItem
                                key={maker.id}
                                maker={maker}
                                index={i}
                                isSaved={true}
                                onTap={onMakerTap}
                                onToggleSave={onToggleSave}
                                showHours={false}
                                stagger={false}
                                eager
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
