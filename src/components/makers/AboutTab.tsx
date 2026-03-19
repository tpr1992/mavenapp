import { isOpenNow, getTodayHours } from "../../utils/time"
import type { Maker, Theme } from "../../types"

function AboutTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const todayStatus = isOpenNow(maker.opening_hours)
    const todayText = getTodayHours(maker.opening_hours)

    // Split bio at first sentence for editorial treatment
    const dotIndex = maker.bio.indexOf(". ")
    const firstSentence = dotIndex > -1 ? maker.bio.slice(0, dotIndex + 1) : maker.bio
    const restOfBio = dotIndex > -1 ? maker.bio.slice(dotIndex + 2).trim() : ""

    const detailRows: { label: string; value: string; status?: string; statusColor?: string }[] = [
        {
            label: "LOCATION",
            value: `${maker.address}${maker.city ? `, ${maker.city}` : ""}`,
        },
        {
            label: "HOURS",
            value: todayText,
            status: todayStatus ? "Open now" : "Closed now",
            statusColor: todayStatus ? "#4ade80" : theme.textMuted,
        },
        {
            label: "CATEGORY",
            value: maker.category.charAt(0).toUpperCase() + maker.category.slice(1),
        },
        {
            label: "ACTIVE",
            value: `${maker.years_active} year${maker.years_active !== 1 ? "s" : ""}`,
        },
        ...(maker.made_in_ireland ? [{ label: "MADE IN", value: "Ireland" }] : []),
    ]

    return (
        <div>
            {/* Bio — editorial split */}
            <div style={{ padding: "22px 20px 0" }}>
                <p
                    style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: 17,
                        fontStyle: "italic",
                        color: theme.text,
                        lineHeight: 1.55,
                        margin: "0 0 14px",
                        letterSpacing: "-0.01em",
                    }}
                >
                    {firstSentence}
                </p>
                {restOfBio && (
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13.5,
                            color: theme.textSecondary,
                            lineHeight: 1.6,
                            margin: 0,
                        }}
                    >
                        {restOfBio}
                    </p>
                )}
            </div>

            {/* Structured detail rows */}
            <div
                style={{
                    marginTop: 22,
                    borderTop: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                }}
            >
                {detailRows.map((item, i) => (
                    <div
                        key={item.label}
                        style={{
                            padding: "12px 20px",
                            borderBottom: i < detailRows.length - 1 ? `1px solid ${theme.border}` : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 9.5,
                                fontWeight: 500,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: theme.textMuted,
                                width: 90,
                                flexShrink: 0,
                                paddingTop: 2,
                            }}
                        >
                            {item.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                            <span
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.text,
                                }}
                            >
                                {item.value}
                            </span>
                            {item.status && (
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 11,
                                        color: item.statusColor,
                                        marginTop: 2,
                                    }}
                                >
                                    {item.status}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AboutTab
