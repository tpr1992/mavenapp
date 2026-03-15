import { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(): State {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback
            return (
                <div
                    style={{
                        padding: 32,
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Something went wrong</p>
                    <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>Try refreshing the page</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "10px 24px",
                            borderRadius: 100,
                            border: "none",
                            background: "#1a1a1a",
                            color: "#fff",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Reload
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
