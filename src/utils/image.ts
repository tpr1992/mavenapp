export function optimizeImageUrl(
    url: string | null | undefined,
    width: number,
    { quality = 75 } = {},
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
