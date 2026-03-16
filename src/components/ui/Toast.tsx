interface ToastProps {
    message: string
}

export default function Toast({ message }: ToastProps) {
    return (
        <div
            style={{
                position: "fixed",
                bottom: 100,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#1a1a1a",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 0,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                zIndex: 100,
                animation: "fadeSlideIn 0.2s ease",
            }}
        >
            {message}
        </div>
    )
}
