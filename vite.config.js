import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import basicSsl from "@vitejs/plugin-basic-ssl"

const cspContent = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://xsibqwoulhymoptduuca.supabase.co wss://xsibqwoulhymoptduuca.supabase.co",
  "frame-ancestors 'none'",
].join("; ")

// Inject CSP meta tag only in production builds
function cspPlugin() {
  return {
    name: "inject-csp",
    transformIndexHtml(html, ctx) {
      if (ctx.server) return html // skip in dev
      return html.replace(
        "<!-- CSP injected by Vite in production only -->",
        `<meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), basicSsl(), cspPlugin()],
  server: {
    host: true, // expose on local network for mobile testing
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          leaflet: ["leaflet"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
})
