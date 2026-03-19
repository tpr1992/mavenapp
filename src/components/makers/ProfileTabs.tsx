import type { Maker, Theme } from "../../types"
import { font } from "../../styles/tokens"

export interface TabItem {
    id: string
    label: string
}

const TABS: TabItem[] = [
    { id: "work", label: "Work" },
    { id: "about", label: "About" },
    { id: "socials", label: "Socials" },
    { id: "events", label: "Events" },
]

export function getVisibleTabs(maker: Maker): TabItem[] {
    return TABS.filter((tab) => {
        if (tab.id === "socials") return !!maker.instagram_handle
        if (tab.id === "events") return maker.events && maker.events.length > 0
        return true
    })
}

function ProfileTabs({
    tabs,
    activeTab,
    onTabChange,
    theme,
}: {
    tabs: TabItem[]
    activeTab: string
    onTabChange: (id: string) => void
    theme: Theme
}) {
    return (
        <div
            style={{
                display: "flex",
                overflowX: "auto",
                scrollbarWidth: "none",
                borderBottom: `1px solid ${theme.border}`,
                padding: "0 20px",
                marginTop: 10,
                gap: 22,
            }}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        flexShrink: 0,
                        fontFamily: font.body,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: activeTab === tab.id ? theme.text : theme.textMuted,
                        padding: "12px 0",
                        marginBottom: -1,
                        background: "none",
                        border: "none",
                        borderBottom: `2px solid ${activeTab === tab.id ? theme.text : "transparent"}`,
                        cursor: "pointer",
                        transition: "color 0.15s ease, border-color 0.15s ease",
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

export default ProfileTabs
