export interface TabItem {
    id: string
    label: string
    icon: string
}

export const TAB_ITEMS: TabItem[] = [
    { id: "discover", label: "Discover", icon: "\u25C9" },
    { id: "shop", label: "Shop", icon: "\u25A6" },
    { id: "map", label: "Map", icon: "\u25CE" },
    { id: "profile", label: "Profile", icon: "\u25EF" },
]
