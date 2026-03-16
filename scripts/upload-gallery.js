import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const args = process.argv.slice(2)
const onlySlug = args.find((a) => a.startsWith("--only="))?.split("=")[1]
const dryRun = args.includes("--dry-run")
const skipUpdate = args.includes("--skip-update")

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const BUCKET = "maker-images"

// Parse makers to get existing gallery_urls
function parseMakers() {
    const src = readFileSync(join(__dirname, "..", "src", "data", "makers.ts"), "utf8")
    const makers = []
    const re = /id:\s*"(\d+)"/g
    const positions = []
    let match
    while ((match = re.exec(src)) !== null) {
        positions.push({ id: match[1], start: match.index })
    }
    for (let i = 0; i < positions.length; i++) {
        const block = src.slice(positions[i].start, positions[i + 1]?.start || src.length)
        const slug = block.match(/slug:\s*"([^"]+)"/)?.[1] || ""
        const name = block.match(/name:\s*"([^"]+)"/)?.[1] || ""
        // Extract existing gallery URLs
        const galleryMatch = block.match(/gallery_urls:\s*\[([\s\S]*?)\]/)
        const urls = galleryMatch
            ? (galleryMatch[1].match(/"(https?:\/\/[^"]+)"/g) || []).map((u) => u.replace(/"/g, ""))
            : []
        makers.push({ slug, name, existingUrls: urls })
    }
    return makers
}

async function main() {
    const makers = parseMakers()
    const downloadsDir = join(__dirname, "pexels-downloads")

    if (!existsSync(downloadsDir)) {
        console.error("No pexels-downloads directory found. Run fetch-pexels-images.js first.")
        process.exit(1)
    }

    const slugDirs = readdirSync(downloadsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((s) => !onlySlug || s === onlySlug)

    if (onlySlug && !slugDirs.includes(onlySlug)) {
        console.error(`No directory found for slug "${onlySlug}"`)
        process.exit(1)
    }

    for (const slug of slugDirs) {
        const dir = join(downloadsDir, slug)
        const galleryFiles = readdirSync(dir)
            .filter((f) => f.match(/^gallery-\d+\.jpg$/))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0])
                const nb = parseInt(b.match(/\d+/)[0])
                return na - nb
            })

        const maker = makers.find((m) => m.slug === slug)
        if (!maker) {
            console.log(`${slug}: not found in makers.ts, skipping`)
            continue
        }

        if (!galleryFiles.length) {
            const candidates = readdirSync(dir).filter((f) => f.startsWith("candidate-"))
            if (candidates.length) {
                console.log(`${maker.name}: ${candidates.length} candidates found but no gallery-*.jpg files`)
                console.log(`  → Rename curated candidates to gallery-N.jpg (e.g., candidate-03.jpg → gallery-3.jpg)\n`)
            }
            continue
        }

        console.log(`${maker.name} (${slug}): ${galleryFiles.length} gallery images to upload`)

        const newUrls = []
        for (const file of galleryFiles) {
            const n = parseInt(file.match(/\d+/)[0])
            const storagePath = `${slug}/gallery-${n}.jpg`
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

            if (dryRun) {
                console.log(`  → would upload ${file} to ${storagePath}`)
                newUrls.push(publicUrl)
                continue
            }

            const fileData = readFileSync(join(dir, file))
            const { error } = await supabase.storage.from(BUCKET).upload(storagePath, fileData, {
                contentType: "image/jpeg",
                upsert: true,
            })
            if (error) {
                console.log(`  ✗ ${file}: ${error.message}`)
            } else {
                console.log(`  ✓ ${file} → ${storagePath}`)
            }
            newUrls.push(publicUrl)
        }

        // Merge existing + new URLs (deduplicated)
        const allUrls = [...new Set([...maker.existingUrls, ...newUrls])]

        if (!skipUpdate && !dryRun) {
            // Update makers.ts
            const makersPath = join(__dirname, "..", "src", "data", "makers.ts")
            let src = readFileSync(makersPath, "utf8")

            // Find the gallery_urls block for this maker by slug
            const slugPattern = new RegExp(
                `(slug:\\s*"${slug}"[\\s\\S]*?gallery_urls:\\s*\\[)[\\s\\S]*?(\\])`,
            )
            const urlsStr = allUrls.map((u) => `\n            "${u}"`).join(",")
            src = src.replace(slugPattern, `$1${urlsStr},\n        $2`)
            writeFileSync(makersPath, src)
            console.log(`  → updated makers.ts (${allUrls.length} total URLs)`)
        } else if (dryRun) {
            console.log(`  → would update makers.ts (${allUrls.length} total URLs)`)
        }

        console.log()
    }
}

main().catch((e) => { console.error(e); process.exit(1) })
