/**
 * Rewrite image URLs to request only the resolution needed for display.
 *
 * Supported sources:
 *  - Unsplash  (?w=&h= query params)
 *  - Supabase Storage  (/render/image/public/… or /object/public/… with ?width=&height= transform)
 *
 * Pass `quality` (1–100) to control JPEG compression on Supabase transforms.
 * The default (75) is a good balance of sharpness vs. file size for thumbnails.
 */
export function optimizeImageUrl(url, width, { quality = 75 } = {}) {
    if (!url) return url

    // Unsplash: rewrite w/h params
    if (url.includes("unsplash.com")) {
        const height = Math.round(width * 1.25)
        return url.replace(/[?&]w=\d+/, `?w=${width}`).replace(/[?&]h=\d+/, `&h=${height}`)
    }

    // Supabase Storage: use the image transform API
    // Transforms work on /render/image/public/ or /object/public/ paths
    if (url.includes(".supabase.co/storage/")) {
        const height = Math.round(width * 1.25)
        // Ensure we're using the render endpoint for transforms
        const renderUrl = url.replace("/object/public/", "/render/image/public/")
        // Strip any existing transform params
        const base = renderUrl.split("?")[0]
        return `${base}?width=${width}&height=${height}&quality=${quality}&resize=cover`
    }

    return url
}
