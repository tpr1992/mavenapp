import { useMemo } from "react"
import { safeOpen } from "../../utils/safeOpen"
import type { Maker, Theme } from "../../types"
import { font } from "../../styles/tokens"

function EventsTab({ maker, theme }: { maker: Maker; theme: Theme }) {
    const events = maker.events || []

    const parsedDates = useMemo(
        () =>
            events.map((event) => {
                const date = new Date(event.date)
                return {
                    day: date.getDate(),
                    month: date.toLocaleString("en", { month: "short" }),
                }
            }),
        [events],
    )

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "18px 16px 12px",
                }}
            >
                <span
                    style={{
                        fontFamily: font.heading,
                        fontSize: 16,
                        fontWeight: 800,
                        color: theme.text,
                    }}
                >
                    Events
                </span>
                <span
                    style={{
                        fontFamily: font.body,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: theme.textMuted,
                    }}
                >
                    {events.length} upcoming
                </span>
            </div>

            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {events.map((event, i) => {
                    const { day, month } = parsedDates[i]

                    return (
                        <div
                            key={i}
                            onClick={() => safeOpen(event.url)}
                            style={{
                                background: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: 0,
                                overflow: "hidden",
                                display: "flex",
                                cursor: event.url ? "pointer" : "default",
                                animation: `fadeSlideIn 0.35s ease ${i * 0.06}s both`,
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    flexShrink: 0,
                                    background: theme.bg,
                                    borderRight: `1px solid ${theme.border}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "14px 6px",
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: font.heading,
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: theme.text,
                                        lineHeight: 1,
                                    }}
                                >
                                    {day}
                                </div>
                                <div
                                    style={{
                                        fontFamily: font.body,
                                        fontSize: 9,
                                        fontWeight: 600,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        color: theme.textMuted,
                                        marginTop: 2,
                                    }}
                                >
                                    {month}
                                </div>
                            </div>

                            <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                                {event.tag && (
                                    <div
                                        style={{
                                            fontFamily: font.body,
                                            fontSize: 9,
                                            fontWeight: 600,
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            color: theme.textMuted,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {event.tag}
                                    </div>
                                )}
                                <div
                                    style={{
                                        fontFamily: font.heading,
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: theme.text,
                                        lineHeight: 1.25,
                                        marginBottom: 4,
                                    }}
                                >
                                    {event.name}
                                </div>
                                <div
                                    style={{
                                        fontFamily: font.body,
                                        fontSize: 11,
                                        color: theme.textMuted,
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {event.time} {event.location && `\u00B7 ${event.location}`}
                                    {event.details && (
                                        <>
                                            <br />
                                            {event.details}
                                        </>
                                    )}
                                </div>
                                {event.cta && (
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            fontFamily: font.body,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            color: theme.textSecondary,
                                            marginTop: 8,
                                            borderBottom: `1px solid ${theme.border}`,
                                            paddingBottom: 1,
                                        }}
                                    >
                                        {event.cta}
                                        <svg
                                            width="9"
                                            height="9"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={theme.textSecondary}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default EventsTab
