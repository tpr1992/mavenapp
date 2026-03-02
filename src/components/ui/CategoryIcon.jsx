import { CATEGORY_ICON } from "../../constants/categories"

export default function CategoryIcon({ category, size, style }) {
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
