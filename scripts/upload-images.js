/**
 * Upload all maker images to Supabase Storage for automatic optimization.
 *
 * Downloads each external image (avatar + gallery) and uploads it to a
 * `maker-images` bucket. Then updates makers.js with the new Supabase Storage URLs.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/upload-images.js
 */

import { createClient } from "@supabase/supabase-js"
import { MAKERS } from "../src/data/makers.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
const BUCKET = "maker-images"

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
    process.exit(1)
}

const supabase = createClient(url, key)

async function ensureBucket() {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === BUCKET)
    if (!exists) {
        const { error } = await supabase.storage.createBucket(BUCKET, {
            public: true,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
            fileSizeLimit: 10 * 1024 * 1024, // 10MB
        })
        if (error) {
            console.error("Failed to create bucket:", error.message)
            process.exit(1)
        }
        console.log(`Created bucket: ${BUCKET}`)
    } else {
        console.log(`Bucket ${BUCKET} already exists`)
    }
}

function getExtFromContentType(contentType) {
    const map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/avif": ".avif",
        "image/gif": ".gif",
    }
    return map[contentType] || ".jpg"
}

function isAlreadySupabase(imageUrl) {
    return imageUrl && imageUrl.includes(".supabase.co/storage/")
}

async function downloadImage(imageUrl) {
    const res = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MavenImageUploader/1.0)" },
        redirect: "follow",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${imageUrl}`)
    const contentType = res.headers.get("content-type") || "image/jpeg"
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType }
}

async function uploadImage(storagePath, buffer, contentType) {
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType,
        upsert: true,
    })
    if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`)
    return `${url}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

async function processImage(imageUrl, storagePath) {
    if (isAlreadySupabase(imageUrl)) return imageUrl

    try {
        const { buffer, contentType } = await downloadImage(imageUrl)
        const ext = getExtFromContentType(contentType)
        const fullPath = storagePath + ext
        const publicUrl = await uploadImage(fullPath, buffer, contentType)
        return publicUrl
    } catch (err) {
        console.error(`  SKIP: ${err.message}`)
        return imageUrl // keep original on failure
    }
}

async function run() {
    await ensureBucket()

    const updatedMakers = []
    let uploaded = 0
    let skipped = 0

    for (const maker of MAKERS) {
        console.log(`\nProcessing: ${maker.name} (${maker.slug})`)

        // Upload avatar
        let newAvatarUrl = maker.avatar_url
        if (maker.avatar_url && !isAlreadySupabase(maker.avatar_url)) {
            process.stdout.write("  avatar... ")
            newAvatarUrl = await processImage(maker.avatar_url, `${maker.slug}/avatar`)
            if (newAvatarUrl !== maker.avatar_url) {
                uploaded++
                console.log("ok")
            } else {
                skipped++
            }
        }

        // Upload gallery images
        const newGalleryUrls = []
        if (maker.gallery_urls) {
            for (let i = 0; i < maker.gallery_urls.length; i++) {
                const galleryUrl = maker.gallery_urls[i]
                if (isAlreadySupabase(galleryUrl)) {
                    newGalleryUrls.push(galleryUrl)
                    continue
                }
                process.stdout.write(`  gallery[${i}]... `)
                const newUrl = await processImage(galleryUrl, `${maker.slug}/gallery-${i}`)
                newGalleryUrls.push(newUrl)
                if (newUrl !== galleryUrl) {
                    uploaded++
                    console.log("ok")
                } else {
                    skipped++
                }
            }
        }

        updatedMakers.push({
            ...maker,
            avatar_url: newAvatarUrl,
            gallery_urls: newGalleryUrls,
        })
    }

    console.log(`\nUploaded: ${uploaded}, Skipped/Failed: ${skipped}`)

    // Write updated makers.js
    const makersPath = path.join(__dirname, "..", "src", "data", "makers.js")
    const makersContent = `export const MAKERS = ${JSON.stringify(updatedMakers, null, 4)}\n`
    fs.writeFileSync(makersPath, makersContent, "utf-8")
    console.log(`\nUpdated ${makersPath}`)
    console.log("Run 'npm run format' to reformat, then reseed with 'node scripts/seed.js'")
}

run().catch((err) => {
    console.error("Fatal:", err)
    process.exit(1)
})
