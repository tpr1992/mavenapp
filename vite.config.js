import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import basicSsl from "@vitejs/plugin-basic-ssl"

const cspContent = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://xsibqwoulhymoptduuca.supabase.co wss://xsibqwoulhymoptduuca.supabase.co https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com",
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
          supabase: ["@supabase/supabase-js"],
          maplibre: ["maplibre-gl", "supercluster"],
        },
      },
    },
  },
})
