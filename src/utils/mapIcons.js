import L from "leaflet"
import { CATEGORY_ICON } from "../constants/categories"

export function createPinIcon(maker, isSelected, isDark) {
    const icon = CATEGORY_ICON[maker.category] || ""

    let bg, color, border, shadow, backdrop
    if (isSelected) {
        bg = isDark ? "#e8e6e3" : "#1a1a1a"
        color = isDark ? "#1a1a1a" : "#fff"
        border = "none"
        shadow = "0 4px 12px rgba(0,0,0,0.35)"
        backdrop = "none"
    } else {
        bg = isDark ? "rgba(30,30,30,0.5)" : "rgba(255,255,255,0.5)"
        color = isDark ? "#e8e6e3" : "#1a1a1a"
        border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)"
        shadow = isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.18)"
        backdrop = "blur(16px) saturate(1.4)"
    }
    const scale = isSelected ? "scale(1.1)" : "scale(1)"

    const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        background: ${bg};
        color: ${color};
        padding: 6px 10px;
        border-radius: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        gap: 4px;
        border: ${border};
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      ">
        <span style="display:inline-flex;align-items:center">${icon}</span>
        ${maker.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>
      <div style="
        width: 8px;
        height: 8px;
        background: ${bg};
        border: ${border};
        transform: rotate(45deg);
        margin-top: -5px;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
        backdrop-filter: ${backdrop};
        -webkit-backdrop-filter: ${backdrop};
      "></div>
    </div>
  `

    // Estimate width based on name length for accurate anchor
    const estimatedWidth = maker.name.length * 7 + 50

    return L.divIcon({
        html,
        className: "",
        iconSize: [estimatedWidth, 40],
        iconAnchor: [estimatedWidth / 2, 40],
    })
}
