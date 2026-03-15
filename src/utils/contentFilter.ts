// Content filter for profile/content creation — maker names, usernames, bios, website URLs.
// Stricter than the message filter: blocks ALL profanity, not just slurs.

interface ContentFilterResult {
    blocked: boolean
    reason?: string
}

// ── Slurs (from profanity.ts) ──────────────────────────────────────────────────
const SLURS = [
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

// ── Common profanity (blocked in profile content) ──────────────────────────────
const PROFANITY = [
    "fuck",
    "fucker",
    "fuckers",
    "fucking",
    "fucked",
    "fucks",
    "motherfucker",
    "motherfucking",
    "shit",
    "shitty",
    "shits",
    "shitting",
    "bullshit",
    "ass",
    "asshole",
    "assholes",
    "arsehole",
    "bitch",
    "bitches",
    "bitchy",
    "dick",
    "dicks",
    "dickhead",
    "cock",
    "cocks",
    "cocksucker",
    "pussy",
    "pussies",
    "cunt",
    "cunts",
    "whore",
    "whores",
    "slut",
    "sluts",
    "slutty",
    "bastard",
    "bastards",
    "bollocks",
]

// ── Adult / porn sites ─────────────────────────────────────────────────────────
const ADULT_SITES = [
    "onlyfans",
    "pornhub",
    "xvideos",
    "xhamster",
    "chaturbate",
    "cam4",
    "myfreecams",
    "livejasmin",
    "stripchat",
    "brazzers",
    "redtube",
    "youporn",
    "xtube",
]

// ── Gambling sites ─────────────────────────────────────────────────────────────
const GAMBLING_SITES = [
    "bet365",
    "paddy power",
    "paddypower",
    "betfair",
    "william hill",
    "williamhill",
    "ladbrokes",
    "pokerstars",
    "888casino",
    "betway",
    "unibet",
    "bwin",
]

// ── Spam phrases ───────────────────────────────────────────────────────────────
const SPAM_PHRASES = [
    "buy followers",
    "free money",
    "get rich",
    "make money fast",
    "work from home",
    "crypto trading",
    "forex trading",
]

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip common obfuscation: dots, spaces, underscores, dashes between every letter */
function deobfuscate(text: string): string {
    // Collapse single separators between single characters: "o.n.l.y.f.a.n.s" → "onlyfans"
    // Matches: letter, separator, letter, separator, letter ... (at least 3 letters)
    return text.replace(/(?<=[a-z])[.\s_-]+(?=[a-z])/gi, "")
}

/** Apply leet-speak substitutions for matching */
function deleet(text: string): string {
    return text.replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!]/g, "i").replace(/0/g, "o").replace(/[$5]/g, "s")
}

/** Build a word-boundary regex from a list of terms */
function buildWordRegex(words: readonly string[]): RegExp {
    const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    return new RegExp(`\\b(${escaped.join("|")})\\b`, "i")
}

/** Build a substring regex (no word boundaries) for site names and phrases */
function buildSubstringRegex(terms: readonly string[]): RegExp {
    const escaped = terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    return new RegExp(`(${escaped.join("|")})`, "i")
}

// Pre-compiled regexes
const SLUR_RE = buildWordRegex(SLURS)
const PROFANITY_RE = buildWordRegex(PROFANITY)
const ADULT_RE = buildSubstringRegex(ADULT_SITES)
const GAMBLING_RE = buildSubstringRegex(GAMBLING_SITES)
const SPAM_RE = buildSubstringRegex(SPAM_PHRASES)

// ── Public API ─────────────────────────────────────────────────────────────────

/** Check text against all content rules. Returns blocked status and reason. */
export function isContentBlocked(text: string): ContentFilterResult {
    if (!text || text.trim().length === 0) return { blocked: false }

    const lower = text.toLowerCase()
    const cleaned = deleet(deobfuscate(lower))

    // Also test the raw lowercased version (handles cases where deobfuscate is too aggressive)
    const variants = [cleaned, deleet(lower)]

    for (const variant of variants) {
        if (SLUR_RE.test(variant)) {
            return { blocked: true, reason: "Contains inappropriate language" }
        }
        if (PROFANITY_RE.test(variant)) {
            return { blocked: true, reason: "Contains inappropriate language" }
        }
        if (ADULT_RE.test(variant)) {
            return { blocked: true, reason: "References blocked website" }
        }
        if (GAMBLING_RE.test(variant)) {
            return { blocked: true, reason: "References blocked website" }
        }
        if (SPAM_RE.test(variant)) {
            return { blocked: true, reason: "Contains spam content" }
        }
    }

    return { blocked: false }
}

/** Quick boolean check for maker names and usernames */
export function isNameBlocked(name: string): boolean {
    return isContentBlocked(name).blocked
}
