import { useRef, memo } from "react"
import MakerAvatar from "../ui/MakerAvatar"
import { useTheme } from "../../contexts/ThemeContext"
import { formatLocation } from "../../utils/distance"

export default memo(function NearbyMakerCard({ maker, onTap }) {
    const { theme } = useTheme()
    const touch = useRef({ x: 0, y: 0, moved: false })

    return (
        <div
            onPointerDown={(e) => {
                touch.current = { x: e.clientX, y: e.clientY, moved: false }
            }}
            onPointerMove={(e) => {
                if (
                    !touch.current.moved &&
                    (Math.abs(e.clientX - touch.current.x) > 8 || Math.abs(e.clientY - touch.current.y) > 8)
                )
                    touch.current.moved = true
            }}
            onClick={() => {
                if (!touch.current.moved) onTap(maker)
            }}
            style={{
                minWidth: 180,
                background: "transparent",
                borderRadius: 6,
                padding: 12,
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MakerAvatar maker={maker} size={34} />
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            color: theme.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {maker.name}
                    </div>
                    <div
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: theme.textMuted,
                        }}
                    >
                        {maker.category} {"\u00B7"} {formatLocation(maker)}
                    </div>
                </div>
            </div>
        </div>
    )
})
