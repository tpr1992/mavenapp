// Slurs targeting protected classes only — race, ethnicity, gender identity, sexuality, disability.
// Regular swearing is allowed (this is Ireland).
const BLOCKED_WORDS = [
    // Racial / ethnic slurs
    "nigger",
    "niggers",
    "nigga",
    "niggas",
    "niglet",
    "chink",
    "chinc",
    "gook",
    "kike",
    "kyke",
    "spic",
    "spick",
    "wetback",
    "beaner",
    "paki",
    "wop",
    "dago",
    "gringo",
    "cracker",
    "honkey",
    "jigaboo",
    "jungle bunny",
    "junglebunny",
    "coon",
    "sand nigger",
    "sandnigger",
    "spook",
    "guido",
    "heeb",
    "kraut",
    "porchmonkey",
    "porch monkey",
    "negro",
    "nigaboo",
    // Homophobic / transphobic slurs
    "faggot",
    "faggots",
    "fagot",
    "fag",
    "fags",
    "dyke",
    "tranny",
    "shemale",
    // Disability slurs
    "retard",
    "retarded",
    "retards",
    "tard",
    "spaz",
    "spastic",
]

function buildRegex(): RegExp {
    const pattern = BLOCKED_WORDS.map((w) => {
        const escaped = w
            .replace(/a/gi, "[a@4]")
            .replace(/e/gi, "[e3]")
            .replace(/i/gi, "[i1!]")
            .replace(/o/gi, "[o0]")
            .replace(/s/gi, "[s$5]")
        return escaped
    }).join("|")
    return new RegExp(`\\b(${pattern})\\b`, "gi")
}

export function filterProfanity(text: string): string {
    return text.replace(buildRegex(), (match) => "*".repeat(match.length))
}
