import { memo } from "react"
import { TAB_ITEMS } from "../../constants/navigation"
import { useTheme } from "../../contexts/ThemeContext"
import { glassBarStyle } from "../../utils/glass"
import type { Maker } from "../../types"

// v2 Lucide SVG icons — inline to avoid a dependency
const iconProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
}

function IconHomeV2() {
    return (
        <svg {...iconProps}>
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
    )
}

function IconMapV2() {
    return (
        <svg {...iconProps}>
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
            <path d="M15 5.764v15" />
            <path d="M9 3.236v15" />
        </svg>
    )
}

function IconHeartV2() {
    return (
        <svg {...iconProps}>
            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
        </svg>
    )
}

function IconHeartFilledV2() {
    return (
        <svg {...iconProps} fill="currentColor">
            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
        </svg>
    )
}

function IconMessageV2() {
    return (
        <svg {...iconProps}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
    )
}

function IconUserV2() {
    return (
        <svg {...iconProps}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

const TAB_ICONS_V2: Record<string, (hasSaved: boolean) => React.ReactNode> = {
    discover: () => <IconHomeV2 />,
    map: () => <IconMapV2 />,
    saved: (hasSaved) => (hasSaved ? <IconHeartFilledV2 /> : <IconHeartV2 />),
    messages: () => <IconMessageV2 />,
    profile: () => <IconUserV2 />,
}

interface TabBarProps {
    activeTab: string
    savedCount: number
    unreadMessages: number
    selectedMaker: Maker | null
    onTabChange: (tab: string) => void
}

export default memo(function TabBar({
    activeTab,
    savedCount,
    unreadMessages,
    selectedMaker,
    onTabChange,
}: TabBarProps) {
    const { theme, isDark } = useTheme()
    const g = glassBarStyle(isDark)

    return (
        <div
            role="tablist"
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 56,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                background: g.background,
                backdropFilter: g.backdropFilter,
                WebkitBackdropFilter: g.WebkitBackdropFilter,
                borderTop: g.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                paddingLeft: 8,
                paddingRight: 8,
                zIndex: 20,
            }}
        >
            {TAB_ITEMS.map((tab) => {
                const isActive = !selectedMaker && activeTab === tab.id
                const count = tab.id === "saved" ? savedCount : tab.id === "messages" ? unreadMessages : 0
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-label={tab.label}
                        onClick={() => onTabChange(tab.id)}
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
                            opacity: isActive ? 1 : isDark ? 0.45 : 0.55,
                        }}
                    >
                        <span style={{ lineHeight: 0, color: theme.text, position: "relative" }}>
                            {TAB_ICONS_V2[tab.id]?.(count > 0) ?? tab.icon}
                            {tab.id === "messages" && count > 0 && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: -4,
                                        right: -6,
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: 100,
                                        background: "#E53935",
                                        color: "#fff",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        fontFamily: "'DM Sans', sans-serif",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0 4px",
                                        lineHeight: 1,
                                    }}
                                >
                                    {count > 99 ? "99+" : count}
                                </span>
                            )}
                        </span>
                        {isActive && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    background: theme.text,
                                }}
                            />
                        )}
                    </button>
                )
            })}
        </div>
    )
})
