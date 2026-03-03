import type { CSSProperties } from "react"
import { CATEGORY_ICON } from "../../constants/categories"

interface CategoryIconProps {
    category: string
    size?: number | string
    style?: CSSProperties
}

export default function CategoryIcon({ category, size, style }: CategoryIconProps) {
    const svg = CATEGORY_ICON[category]
    if (!svg) return null
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                lineHeight: 1,
                fontSize: size,
                ...style,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    )
}
