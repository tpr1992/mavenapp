export const IMG_QUALITY = {
    thumbnail: 60,
    default: 80,
    hero: 85,
    lightbox: 90,
} as const

export function optimizeImageUrl(
    url: string | null | undefined,
    width: number,
    { quality = IMG_QUALITY.default as number } = {},
): string | null | undefined {
    if (!url) return url

    // Unsplash: rewrite w/h params
    if (url.includes("unsplash.com")) {
        const height = Math.round(width * 1.25)
        return url.replace(/[?&]w=\d+/, `?w=${width}`).replace(/[?&]h=\d+/, `&h=${height}`)
    }

    // Supabase Storage: use the image transform API
    if (url.includes(".supabase.co/storage/")) {
        const height = Math.round(width * 1.25)
        const renderUrl = url.replace("/object/public/", "/render/image/public/")
        const base = renderUrl.split("?")[0]
        return `${base}?width=${width}&height=${height}&quality=${quality}&resize=cover`
    }

    return url
}

/** Returns a `"url1 1x, url2 2x"` srcset string for 1x and 2x displays. */
export function imageSrcSet(
    url: string | null | undefined,
    baseWidth: number,
    { quality = IMG_QUALITY.default as number } = {},
): string | undefined {
    if (!url) return undefined
    const x1 = optimizeImageUrl(url, baseWidth, { quality })
    const x2 = optimizeImageUrl(url, baseWidth * 2, { quality })
    if (!x1 || !x2) return undefined
    return `${x1} 1x, ${x2} 2x`
}
