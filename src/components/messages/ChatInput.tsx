import { useState, useRef } from "react"
import type { Theme } from "../../types"

interface ChatInputProps {
    onSend: (body: string) => void
    theme: Theme
    isDark: boolean
}

export default function ChatInput({ onSend, theme, isDark }: ChatInputProps) {
    const [text, setText] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const canSend = text.trim().length > 0

    const handleSend = () => {
        if (!canSend) return
        onSend(text)
        setText("")
        inputRef.current?.focus()
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
                borderTop: `1px solid ${theme.border}`,
                background: theme.bg,
                flexShrink: 0,
            }}
        >
            <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="on"
                spellCheck
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder="Message..."
                style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "10px 16px",
                    borderRadius: 100,
                    border: `1px solid ${theme.border}`,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16,
                    color: theme.text,
                    outline: "none",
                    boxSizing: "border-box",
                }}
            />
            <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: "none",
                    background: canSend ? theme.btnBg : theme.border,
                    color: canSend ? theme.btnText : theme.textMuted,
                    cursor: canSend ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.2s ease",
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m5 12 7-7 7 7" />
                    <path d="M12 19V5" />
                </svg>
            </button>
        </div>
    )
}
