import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import https from "https"
import http from "http"

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.PEXELS_API_KEY
const args = process.argv.slice(2)
const onlySlug = args.find((a) => a.startsWith("--only="))?.split("=")[1]
const perQuery = parseInt(args.find((a) => a.startsWith("--per-query="))?.split("=")[1] || "5")
const dryRun = args.includes("--dry-run")

if (!API_KEY && !dryRun) {
    console.error("Error: PEXELS_API_KEY env var required (or use --dry-run)")
    process.exit(1)
}

// Manual target overrides
const TARGET_OVERRIDES = {
    "fia-and-thread": 15,
}

// Deterministic target 8-15 based on slug hash
function slugHash(slug) {
    let h = 0
    for (let i = 0; i < slug.length; i++) h = ((h << 5) - h + slug.charCodeAt(i)) | 0
    return Math.abs(h)
}

function getTarget(slug) {
    if (TARGET_OVERRIDES[slug] !== undefined) return TARGET_OVERRIDES[slug]
    return 8 + (slugHash(slug) % 8) // 8-15
}

// Parse makers from src/data/makers.ts
function parseMakers() {
    const src = readFileSync(join(__dirname, "..", "src", "data", "makers.ts"), "utf8")
    const makers = []
    // Split by id: "N" patterns
    const re = /id:\s*"(\d+)"/g
    const positions = []
    let match
    while ((match = re.exec(src)) !== null) {
        positions.push({ id: match[1], start: match.index })
    }
    for (let i = 0; i < positions.length; i++) {
        const block = src.slice(positions[i].start, positions[i + 1]?.start || src.length)
        const id = positions[i].id
        const name = block.match(/name:\s*"([^"]+)"/)?.[1] || ""
        const slug = block.match(/slug:\s*"([^"]+)"/)?.[1] || ""
        const bio = block.match(/bio:\s*"([^"]+)"/)?.[1] || ""
        const category = block.match(/category:\s*"([^"]+)"/)?.[1] || ""
        // Count gallery_urls
        const galleryMatch = block.match(/gallery_urls:\s*\[([\s\S]*?)\]/)
        const existingCount = galleryMatch ? (galleryMatch[1].match(/https?:\/\//g) || []).length : 0
        makers.push({ id, name, slug, bio, category, existingCount })
    }
    return makers
}

// Extract craft keywords from bio
function extractKeywords(bio, category) {
    const craftWords = [
        "pottery", "ceramic", "ceramics", "mug", "bowl", "plate", "glaze", "kiln", "stoneware", "earthenware",
        "silver", "gold", "ring", "bracelet", "necklace", "jewellery", "jewelry", "metalwork",
        "linen", "tweed", "wool", "cotton", "fabric", "textile", "weave", "weaving", "knit", "knitting",
        "leather", "hide", "tan", "bag", "belt", "wallet",
        "print", "screenprint", "lino", "linocut", "risograph", "letterpress", "woodblock",
        "candle", "soap", "wax", "soy", "fragrance", "scent",
        "wood", "timber", "oak", "ash", "furniture", "bowl", "turning", "woodwork",
        "iron", "forge", "blacksmith", "steel", "wrought",
        "glass", "blown", "stained", "fused",
        "dye", "indigo", "natural dye",
    ]
    const bioLower = bio.toLowerCase()
    return craftWords.filter((w) => bioLower.includes(w))
}

// Generate search queries for a maker
function generateQueries(keywords, category) {
    const templates = {
        objects: [
            "handmade {kw} artisan workshop",
            "{kw} craft close up detail",
            "handcrafted {kw} natural light",
            "{kw} studio workspace tools",
            "artisan {kw} ireland rustic",
        ],
        clothing: [
            "handmade {kw} fabric textile",
            "{kw} fashion editorial flat lay",
            "artisan {kw} natural materials",
            "{kw} clothing rack studio",
            "sustainable fashion {kw} craft",
        ],
        art: [
            "{kw} printmaking studio workshop",
            "{kw} art print close up detail",
            "artist studio {kw} creative workspace",
            "{kw} artwork gallery wall",
            "handmade {kw} art process",
        ],
    }
    const t = templates[category] || templates.objects
    const queries = new Set()
    for (const kw of keywords.slice(0, 4)) {
        for (const tmpl of t.slice(0, 2)) {
            queries.add(tmpl.replace("{kw}", kw))
        }
    }
    // Add generic fallbacks
    queries.add("irish artisan workshop natural light")
    queries.add(`handmade ${category} craft detail`)
    return [...queries].slice(0, 8)
}

// Pexels API search
async function searchPexels(query, count) {
    return new Promise((resolve, reject) => {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=${count}`
        https.get(url, { headers: { Authorization: API_KEY } }, (res) => {
            let data = ""
            res.on("data", (d) => (data += d))
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data))
                } catch {
                    reject(new Error("Failed to parse Pexels response"))
                }
            })
        }).on("error", reject)
    })
}

// Download a file following redirects
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http
        client.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                downloadFile(res.headers.location, dest).then(resolve).catch(reject)
                return
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`))
                return
            }
            const chunks = []
            res.on("data", (d) => chunks.push(d))
            res.on("end", () => {
                writeFileSync(dest, Buffer.concat(chunks))
                resolve()
            })
        }).on("error", reject)
    })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
    const makers = parseMakers()
    console.log(`Parsed ${makers.length} makers\n`)

    const filtered = onlySlug ? makers.filter((m) => m.slug === onlySlug) : makers
    if (onlySlug && !filtered.length) {
        console.error(`Maker with slug "${onlySlug}" not found`)
        process.exit(1)
    }

    const targetDist = {}
    let skipCount = 0
    let downloadCount = 0

    for (const maker of filtered) {
        const target = getTarget(maker.slug)
        targetDist[target] = (targetDist[target] || 0) + 1
        const needed = target - maker.existingCount
        const keywords = extractKeywords(maker.bio, maker.category)
        const queries = generateQueries(keywords, maker.category)

        console.log(`${maker.name} (${maker.slug})`)
        console.log(`  existing: ${maker.existingCount}, target: ${target}, needed: ${needed > 0 ? needed : 0}`)
        console.log(`  keywords: ${keywords.slice(0, 6).join(", ") || "(none)"}`)

        if (needed <= 0) {
            console.log(`  → SKIP (already has enough images)\n`)
            skipCount++
            continue
        }

        // Download 50% more than needed for curation headroom
        const downloadTarget = Math.ceil(needed * 1.5)
        console.log(`  queries: ${queries.length}, downloading ~${downloadTarget} candidates`)

        if (dryRun) {
            queries.forEach((q) => console.log(`    → "${q}"`))
            console.log()
            continue
        }

        const dir = join(__dirname, "pexels-downloads", maker.slug)
        mkdirSync(dir, { recursive: true })

        const seenUrls = new Set()
        let saved = 0
        let nn = maker.existingCount

        for (const query of queries) {
            if (saved >= downloadTarget) break
            try {
                const result = await searchPexels(query, perQuery)
                if (!result.photos?.length) continue
                for (const photo of result.photos) {
                    if (saved >= downloadTarget) break
                    const imgUrl = photo.src.large
                    if (seenUrls.has(imgUrl)) continue
                    seenUrls.add(imgUrl)

                    const filename = `candidate-${String(nn).padStart(2, "0")}.jpg`
                    const dest = join(dir, filename)
                    try {
                        await downloadFile(imgUrl, dest)
                        console.log(`    ✓ ${filename}`)
                        saved++
                        nn++
                    } catch (e) {
                        console.log(`    ✗ ${filename}: ${e.message}`)
                    }
                }
                await sleep(300)
            } catch (e) {
                console.log(`    ✗ query failed: ${e.message}`)
            }
        }
        downloadCount += saved
        console.log(`  → saved ${saved} candidates\n`)
    }

    console.log(`\n--- Summary ---`)
    console.log(`Makers processed: ${filtered.length}`)
    console.log(`Skipped (enough images): ${skipCount}`)
    if (!dryRun) console.log(`Images downloaded: ${downloadCount}`)
    console.log(`\nTarget distribution:`)
    Object.keys(targetDist).sort((a, b) => a - b).forEach((t) => {
        console.log(`  ${t} images: ${targetDist[t]} makers`)
    })
}

main().catch((e) => { console.error(e); process.exit(1) })
