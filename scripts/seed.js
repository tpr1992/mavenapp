/**
 * Seed script — uploads all makers from src/data/makers.js to Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/seed.js
 */

import { createClient } from "@supabase/supabase-js"
import { MAKERS } from "../src/data/makers.js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
  process.exit(1)
}

const supabase = createClient(url, key)

async function seed() {
  console.log(`Seeding ${MAKERS.length} makers...`)

  const rows = MAKERS.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    bio: m.bio,
    category: m.category,
    city: m.city,
    address: m.address,
    lat: m.lat,
    lng: m.lng,
    country: m.country,
    years_active: m.years_active,
    avatar_url: m.avatar_url,
    gallery_urls: m.gallery_urls,
    hero_color: m.hero_color,
    is_verified: m.is_verified,
    is_featured: m.is_featured,
    is_spotlight: m.is_spotlight || false,
    spotlight_quote: m.spotlight_quote || null,
    website_url: m.website_url,
    instagram_handle: m.instagram_handle,
    opening_hours: m.opening_hours,
    distance: m.distance,
    made_in_ireland: m.made_in_ireland || false,
  }))

  const { data, error } = await supabase
    .from("makers")
    .upsert(rows, { onConflict: "id" })

  if (error) {
    console.error("Seed failed:", error.message)
    process.exit(1)
  }

  console.log("Done! Upserted", MAKERS.length, "makers.")
}

seed()
