/**
 * Generates sitemap.xml from maker data in Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... SITE_URL=https://maven.ie node scripts/generate-sitemap.js
 */

import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
const siteUrl = process.env.SITE_URL || "https://maven.ie"

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
  process.exit(1)
}

const supabase = createClient(url, key)

const { data: makers, error } = await supabase
  .from("makers")
  .select("slug, updated_at")
  .order("name")

if (error) {
  console.error("Failed to fetch makers:", error.message)
  process.exit(1)
}

const today = new Date().toISOString().split("T")[0]

const urls = [
  { loc: siteUrl + "/", priority: "1.0", changefreq: "daily" },
  { loc: siteUrl + "/?tab=map", priority: "0.6", changefreq: "weekly" },
  ...makers.map((m) => ({
    loc: siteUrl + "/?maker=" + m.slug,
    lastmod: m.updated_at ? m.updated_at.split("T")[0] : today,
    priority: "0.8",
    changefreq: "weekly",
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`

writeFileSync("public/sitemap.xml", xml)
console.log(`Sitemap generated with ${urls.length} URLs → public/sitemap.xml`)
