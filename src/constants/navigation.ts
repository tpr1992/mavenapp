export interface TabItem {
    id: string
    label: string
    icon: string
}

export const TAB_ITEMS: TabItem[] = [
    { id: "discover", label: "Discover", icon: "\u25C9" },
    { id: "map", label: "Map", icon: "\u25CE" },
    { id: "saved", label: "Saved", icon: "\u2661" },
    { id: "messages", label: "Messages", icon: "\u2709" },
    { id: "profile", label: "Profile", icon: "\u25EF" },
]
