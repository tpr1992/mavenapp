import { useState } from "react"
import type { Maker } from "../../types"
import { getInitials } from "../../utils/time"
import { optimizeImageUrl } from "../../utils/image"

interface MakerAvatarProps {
    maker: Maker
    size?: number
}

export default function MakerAvatar({ maker, size = 48 }: MakerAvatarProps) {
    const [imgError, setImgError] = useState(false)

    if (maker.avatar_url && !imgError) {
        return (
            <img
                src={optimizeImageUrl(maker.avatar_url, size * 2) ?? undefined}
                alt={maker.name}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    objectFit: "cover",
                    flexShrink: 0,
                }}
            />
        )
    }

    return (
        <div
            style={{
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
            }}
        >
            {getInitials(maker.name)}
        </div>
    )
}
