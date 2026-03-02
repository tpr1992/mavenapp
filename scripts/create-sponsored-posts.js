/**
 * Creates the sponsored_posts table and seeds mock data.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/create-sponsored-posts.js
 *
 * Table schema:
 *   - id:          text, primary key (human-readable slug like "burren-balm-feb26")
 *   - brand:       text, advertiser name shown on tile
 *   - tagline:     text, description shown below brand name
 *   - image_url:   text, product/lifestyle image for the tile
 *   - link_url:    text, where the tap goes (nullable)
 *   - tile_height: integer, image height in the masonry grid (default 200)
 *   - is_active:   boolean, master on/off switch (default true)
 *   - start_date:  date, campaign start (inclusive)
 *   - end_date:    date, campaign end (inclusive)
 *   - priority:    integer, higher = placed earlier in feed (default 0)
 *   - created_at:  timestamptz, auto-set
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
  process.exit(1)
}

const supabase = createClient(url, key)

const MOCK_ADS = [
  {
    id: "burren-balm-mar26",
    brand: "Burren Balm",
    tagline: "Handmade skincare from the wild Atlantic coast",
    image_url: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=500&fit=crop",
    link_url: "https://burrenbalm.ie",
    tile_height: 200,
    is_active: true,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    priority: 10,
  },
  {
    id: "foxford-mar26",
    brand: "Foxford Woollen Mills",
    tagline: "Woven in Mayo since 1892. Blankets, throws & scarves crafted in the west of Ireland.",
    image_url: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&h=500&fit=crop",
    link_url: "https://foxfordwoollenmills.com",
    tile_height: 220,
    is_active: true,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    priority: 5,
  },
  {
    id: "dingle-distillery-mar26",
    brand: "Dingle Distillery",
    tagline: "Small batch single malt whiskey from the Dingle Peninsula",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop",
    link_url: "https://dingledistillery.ie",
    tile_height: 185,
    is_active: true,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    priority: 0,
  },
]

async function run() {
  // Try to insert — if table doesn't exist, tell user to create it in Supabase dashboard
  const { error: checkErr } = await supabase.from("sponsored_posts").select("id").limit(1)

  if (checkErr?.message?.includes("Could not find")) {
    console.log("\n⚠️  Table 'sponsored_posts' doesn't exist yet.")
    console.log("   Create it in Supabase Dashboard → SQL Editor with:\n")
    console.log(`CREATE TABLE sponsored_posts (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  tagline TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  tile_height INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow public read for active ads
ALTER TABLE sponsored_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active sponsored posts"
  ON sponsored_posts FOR SELECT
  USING (is_active = true AND current_date BETWEEN start_date AND end_date);
`)
    console.log("   Then re-run this script to seed the mock ads.\n")
    process.exit(1)
  }

  // Upsert mock ads
  const { error } = await supabase
    .from("sponsored_posts")
    .upsert(MOCK_ADS, { onConflict: "id" })

  if (error) {
    console.error("Failed to seed:", error.message)
    process.exit(1)
  }

  console.log(`✓ Seeded ${MOCK_ADS.length} sponsored posts`)

  // Verify
  const { data } = await supabase
    .from("sponsored_posts")
    .select("id, brand, is_active, start_date, end_date, priority")
    .order("priority", { ascending: false })

  console.table(data)
}

run()
