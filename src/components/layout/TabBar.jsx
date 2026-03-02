import { memo } from "react"
import { TAB_ITEMS } from "../../constants/navigation"
import { useTheme } from "../../contexts/ThemeContext"

export default memo(function TabBar({ activeTab, savedCount, selectedMaker, onTabChange }) {
  const { theme } = useTheme()

  return (
    <div
      role="tablist"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: theme.tabBg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${theme.border}`,
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
        const count = tab.id === "saved" ? savedCount : 0
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
              opacity: isActive ? 1 : 0.45,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, color: theme.text }}>
              {tab.id === "saved" && count > 0 ? "\u2665" : tab.icon}
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                color: theme.text,
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
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
