import { useTheme } from "../../contexts/ThemeContext"
import { font } from "../../styles/tokens"

interface IdentityHeroProps {
    profileName: string
    email: string
    unreadMessages: number
    onNotificationsTap: () => void
    onSettingsTap: () => void
}

export default function IdentityHero({
    profileName,
    email,
    unreadMessages,
    onNotificationsTap,
    onSettingsTap,
}: IdentityHeroProps) {
    const { theme } = useTheme()

    return (
        <div
            style={{
                height: 120,
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg, #1a1816, #252220, #1a1816)",
            }}
        >
            {/* Diagonal line texture */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.06,
                    backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 13px)",
                }}
            />
            {/* Top-right icons: bell + gear */}
            <div
                style={{
                    position: "absolute",
                    top: 14,
                    right: 16,
                    display: "flex",
                    gap: 16,
                    zIndex: 2,
                }}
            >
                {/* Notification bell */}
                <button
                    onClick={onNotificationsTap}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {unreadMessages > 0 && (
                        <span
                            style={{
                                position: "absolute",
                                top: 3,
                                right: 3,
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#22c55e",
                                border: "2px solid #1a1816",
                            }}
                        />
                    )}
                </button>
                {/* Gear icon — opens About */}
                <button
                    onClick={onSettingsTap}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
            </div>
            {/* Identity text at bottom-left */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "0 20px 20px",
                    zIndex: 2,
                }}
            >
                <div
                    style={{
                        fontFamily: font.body,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.4)",
                        marginBottom: 8,
                    }}
                >
                    Member since 2025
                </div>
                <div
                    style={{
                        fontFamily: font.heading,
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: "#fff",
                        marginBottom: 6,
                        lineHeight: 1.1,
                    }}
                >
                    {profileName}
                </div>
                <div
                    style={{
                        fontFamily: font.body,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                    }}
                >
                    {email}
                </div>
            </div>
        </div>
    )
}
