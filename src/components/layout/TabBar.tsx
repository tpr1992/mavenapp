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

function IconShopV2() {
    return (
        <svg {...iconProps}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
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

function IconUserV2() {
    return (
        <svg {...iconProps}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

const TAB_ICONS_V2: Record<string, () => React.ReactNode> = {
    discover: () => <IconHomeV2 />,
    shop: () => <IconShopV2 />,
    map: () => <IconMapV2 />,
    profile: () => <IconUserV2 />,
}

interface TabBarProps {
    activeTab: string
    selectedMaker: Maker | null
    onTabChange: (tab: string) => void
}

export default memo(function TabBar({ activeTab, selectedMaker, onTabChange }: TabBarProps) {
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
                        <span style={{ lineHeight: 0, color: theme.text }}>{TAB_ICONS_V2[tab.id]?.() ?? tab.icon}</span>
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
                                    background: "#f5f5f0",
                                }}
                            />
                        )}
                    </button>
                )
            })}
        </div>
    )
})
