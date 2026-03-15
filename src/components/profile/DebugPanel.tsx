import { useState, useEffect, useCallback } from "react"
import { resetClicks, simulateScenario } from "../../utils/simulateClicks"
import type { Scenario } from "../../utils/simulateClicks"
import type { Maker, Theme } from "../../types"

interface DebugPanelProps {
    isDebug: boolean
    makers: Maker[]
    refetch: () => void
    theme: Theme
}

const SCENARIO_BUTTONS: { label: string; value: Scenario }[] = [
    { label: "Launch", value: "launch" },
    { label: "Trending", value: "trending" },
    { label: "Low-Data", value: "low-data" },
    { label: "Even", value: "even" },
]

export default function DebugPanel({ isDebug, makers, refetch, theme }: DebugPanelProps) {
    const [simRunning, setSimRunning] = useState<Scenario | "reset" | null>(null)
    const [simStatus, setSimStatus] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ scenario?: Scenario; isReset?: boolean } | null>(null)

    const executeSimulate = useCallback(
        async (scenario: Scenario) => {
            setSimRunning(scenario)
            setSimStatus("")
            try {
                const count = await simulateScenario(scenario, makers)
                setSimStatus(`${count.toLocaleString()} clicks simulated (${scenario})`)
                refetch()
            } catch (e) {
                setSimStatus(`Error: ${e instanceof Error ? e.message : "unknown"}`)
            } finally {
                setSimRunning(null)
            }
        },
        [makers, refetch],
    )

    const executeReset = useCallback(async () => {
        setSimRunning("reset")
        setSimStatus("")
        try {
            await resetClicks()
            setSimStatus("Clicks cleared")
            refetch()
        } catch (e) {
            setSimStatus(`Error: ${e instanceof Error ? e.message : "unknown"}`)
        } finally {
            setSimRunning(null)
        }
    }, [refetch])

    const handleConfirm = useCallback(() => {
        if (!confirmAction) return
        setConfirmAction(null)
        if (confirmAction.isReset) executeReset()
        else if (confirmAction.scenario) executeSimulate(confirmAction.scenario)
    }, [confirmAction, executeSimulate, executeReset])

    useEffect(() => {
        if (!simStatus) return
        const t = setTimeout(() => setSimStatus(""), 3000)
        return () => clearTimeout(t)
    }, [simStatus])

    if (!isDebug) return null

    return (
        <>
            <div
                style={{
                    padding: "16px 0",
                    borderBottom: `1px solid ${theme.border}`,
                }}
            >
                <p
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: theme.textMuted,
                        margin: "0 0 12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                    }}
                >
                    Click Simulation Scenarios
                </p>
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                    }}
                >
                    {SCENARIO_BUTTONS.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setConfirmAction({ scenario: value })}
                            disabled={simRunning !== null}
                            style={{
                                flex: 1,
                                padding: "9px 0",
                                borderRadius: 10,
                                border: `1px solid ${theme.border}`,
                                background: theme.card,
                                cursor: simRunning ? "default" : "pointer",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                color: theme.text,
                                opacity: simRunning && simRunning !== value ? 0.35 : 1,
                                textAlign: "center" as const,
                                transition: "opacity 0.15s ease",
                            }}
                        >
                            {simRunning === value ? "\u23F3" : label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setConfirmAction({ isReset: true })}
                    disabled={simRunning !== null}
                    style={{
                        width: "100%",
                        marginTop: 10,
                        padding: "9px 0",
                        borderRadius: 10,
                        border: "none",
                        background: "rgba(229,62,62,0.1)",
                        color: "#e53e3e",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: simRunning ? "default" : "pointer",
                        opacity: simRunning && simRunning !== "reset" ? 0.35 : 1,
                        transition: "opacity 0.15s ease",
                    }}
                >
                    {simRunning === "reset" ? "\u23F3 Clearing..." : "Reset Clicks"}
                </button>
                {simStatus && (
                    <p
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11.5,
                            color: simStatus.startsWith("Error") ? "#e53e3e" : theme.textSecondary,
                            margin: "10px 0 0",
                            textAlign: "center",
                        }}
                    >
                        {simStatus}
                    </p>
                )}
            </div>

            {confirmAction && (
                <div
                    onClick={() => setConfirmAction(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        zIndex: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: theme.card,
                            borderRadius: 20,
                            padding: "28px 24px",
                            maxWidth: 320,
                            width: "100%",
                            textAlign: "center",
                        }}
                    >
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 15,
                                fontWeight: 600,
                                color: theme.text,
                                margin: "0 0 8px",
                            }}
                        >
                            {confirmAction.isReset ? "Reset all clicks?" : "Run simulation?"}
                        </p>
                        <p
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13.5,
                                color: theme.textSecondary,
                                lineHeight: 1.5,
                                margin: "0 0 20px",
                            }}
                        >
                            {confirmAction.isReset
                                ? "This will delete all existing click data. You can re-simulate afterwards."
                                : "This will reset all existing click data and replace it with simulated clicks."}
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setConfirmAction(null)}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 100,
                                    border: `1px solid ${theme.border}`,
                                    background: theme.card,
                                    color: theme.text,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 100,
                                    border: "none",
                                    background: confirmAction.isReset ? "#c53030" : theme.btnBg,
                                    color: confirmAction.isReset ? "#fff" : theme.btnText,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                {confirmAction.isReset ? "Reset" : "Simulate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
