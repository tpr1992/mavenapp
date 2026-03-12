import { useState } from "react"
import type { Maker } from "../../types"
import { getInitials } from "../../utils/time"
import { optimizeImageUrl, imageSrcSet, IMG_QUALITY } from "../../utils/image"

interface MakerAvatarProps {
    maker: Maker
    size?: number
    eager?: boolean
}

export default function MakerAvatar({ maker, size = 48, eager = false }: MakerAvatarProps) {
    const [imgError, setImgError] = useState(false)
    const showImg = maker.avatar_url && !imgError

    return (
        <div
            style={{
                position: "relative",
                width: size,
                height: size,
                borderRadius: size / 2,
                background: maker.hero_color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: size * 0.32,
                letterSpacing: "0.02em",
                flexShrink: 0,
                overflow: "hidden",
            }}
        >
            {getInitials(maker.name)}
            {showImg && (
                <img
                    src={optimizeImageUrl(maker.avatar_url!, size * 2, { quality: IMG_QUALITY.thumbnail }) ?? undefined}
                    srcSet={imageSrcSet(maker.avatar_url!, size * 2, { quality: IMG_QUALITY.thumbnail })}
                    alt={maker.name}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    onError={() => setImgError(true)}
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "block",
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        objectFit: "cover",
                    }}
                />
            )}
        </div>
    )
}
