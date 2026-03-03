import { Helmet } from "react-helmet-async"
import MakerListItem from "../components/makers/MakerListItem"
import { useTheme } from "../contexts/ThemeContext"
import { useAuth } from "../contexts/AuthContext"
import type { Maker } from "../types"

interface SavedScreenProps {
    makers?: Maker[]
    makersLoading: boolean
    onMakerTap: (maker: Maker) => void
    savedIds: Set<string>
    onToggleSave: (id: string) => void
    onTabChange: (tab: string) => void
}

export default function SavedScreen({
    makers = [],
    makersLoading,
    onMakerTap,
    savedIds,
    onToggleSave,
    onTabChange,
}: SavedScreenProps) {
    const { theme } = useTheme()
    const { user } = useAuth()
    const savedMakers = makers.filter((m) => savedIds.has(m.id))

    return (
        <div style={{ paddingBottom: 100 }}>
            <Helmet>
                <title>Saved Makers — maven</title>
            </Helmet>
            <div style={{ padding: "16px 20px 20px" }}>
                <h1
                    style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: theme.text,
                        margin: "0 0 4px",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Saved
                </h1>
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
                        style={{ fontSize: 40, marginBottom: 16, opacity: 0.3, animation: "pulse 1.5s ease infinite" }}
                    >
                        {"\u2661"}
                    </div>
                </div>
            ) : !user ? (
                <div style={{ padding: "60px 40px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u2661"}</div>
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
                    <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u2661"}</div>
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
                <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {savedMakers.map((maker, i) => (
                        <MakerListItem
                            key={maker.id}
                            maker={maker}
                            index={i}
                            isSaved={true}
                            onTap={onMakerTap}
                            onToggleSave={onToggleSave}
                            showHours={false}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
