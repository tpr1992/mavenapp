import React, { forwardRef } from "react"
import { useTheme } from "../../contexts/ThemeContext"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    onFocus?: () => void
    onBlur?: () => void
    placeholder?: string
    elevated?: boolean
    children?: React.ReactNode
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
    { value, onChange, onFocus, onBlur, placeholder = "Search...", elevated, children },
    ref,
) {
    const { theme } = useTheme()

    return (
        <div style={{ position: "relative" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: theme.inputBg,
                    borderRadius: 14,
                    padding: "10px 16px",
                    border: `1px solid ${theme.border}`,
                    ...(elevated ? { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" } : {}),
                }}
            >
                <span style={{ fontSize: 16, color: theme.textSecondary }}>{"\u2315"}</span>
                <input
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 16,
                        color: theme.text,
                    }}
                />
                {value && (
                    <button
                        onClick={() => onChange("")}
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: theme.border,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            padding: 0,
                        }}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <line
                                x1="2.5"
                                y1="2.5"
                                x2="7.5"
                                y2="7.5"
                                stroke={theme.textMuted}
                                strokeWidth="1.4"
                                strokeLinecap="round"
                            />
                            <line
                                x1="7.5"
                                y1="2.5"
                                x2="2.5"
                                y2="7.5"
                                stroke={theme.textMuted}
                                strokeWidth="1.4"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                )}
            </div>
            {children}
        </div>
    )
})

export default SearchBar
