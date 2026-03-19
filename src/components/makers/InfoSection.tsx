import { isOpenNow, getTodayHours } from "../../utils/time"
import type { Maker, Theme } from "../../types"
import { font } from "../../styles/tokens"

function InfoSection({ maker, theme }: { maker: Maker; theme: Theme }) {
    const todayStatus = isOpenNow(maker.opening_hours)
    const todayText = getTodayHours(maker.opening_hours)

    return (
        <div style={{ padding: "0 20px" }}>
            <div
                style={{
                    display: "flex",
                    borderTop: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                    marginTop: 14,
                }}
            >
                {/* Column 1: Open status */}
                <div
                    style={{
                        flex: 1,
                        padding: "10px 0",
                        textAlign: "center",
                        borderRight: `1px solid ${theme.border}`,
                    }}
                >
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                        }}
                    >
                        <span style={{ color: todayStatus ? "#4ade80" : theme.textMuted, fontSize: 6 }}>
                            {"\u25CF"}
                        </span>
                        {todayStatus ? "OPEN" : "CLOSED"}
                    </div>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        {todayText}
                    </div>
                </div>

                {/* Column 2: Category */}
                <div
                    style={{
                        flex: 1,
                        padding: "10px 0",
                        textAlign: "center",
                        borderRight: `1px solid ${theme.border}`,
                    }}
                >
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                            textTransform: "uppercase",
                        }}
                    >
                        {maker.category.toUpperCase()}
                    </div>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        Category
                    </div>
                </div>

                {/* Column 3: Years active */}
                <div style={{ flex: 1, padding: "10px 0", textAlign: "center" }}>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.text,
                        }}
                    >
                        {maker.years_active} YRS
                    </div>
                    <div
                        style={{
                            fontFamily: font.body,
                            fontSize: 9,
                            color: theme.textMuted,
                            letterSpacing: "0.04em",
                            marginTop: 2,
                        }}
                    >
                        Active
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InfoSection
