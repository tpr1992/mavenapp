import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import App from "./App"
import "./styles/index.css"

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <HelmetProvider>
            <ThemeProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ThemeProvider>
        </HelmetProvider>
    </StrictMode>,
)
