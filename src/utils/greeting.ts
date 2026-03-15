const GREETINGS_MORNING = [
    (n: string) => `Good morning, ${n}!`,
    (n: string) => `Rise and shine, ${n}!`,
    (n: string) => `Morning, ${n} \u2615`,
    (n: string) => `Maidin mhaith, ${n}!`,
    (n: string) => `Early bird! Welcome back, ${n}`,
]

const GREETINGS_AFTERNOON = [
    (n: string) => `Good afternoon, ${n}!`,
    (n: string) => `Hey ${n}, hope your day's going well`,
    (n: string) => `Afternoon, ${n} \u2600\uFE0F`,
    (n: string) => `Welcome back, ${n}!`,
    (n: string) => `${n}! Good to see you`,
    (n: string) => `Tr\u00e1thn\u00f3na maith, ${n}!`,
    (n: string) => `C\u00e9n chaoi, ${n}?`,
]

const GREETINGS_EVENING = [
    (n: string) => `Good evening, ${n}!`,
    (n: string) => `Evening, ${n} \u263E`,
    (n: string) => `Hey ${n}, winding down?`,
    (n: string) => `${n}! Nice evening for browsing`,
    (n: string) => `Tr\u00e1thn\u00f3na maith, ${n}!`,
    (n: string) => `O\u00edche mhaith, ${n} \u263E`,
    (n: string) => `C\u00e9n chaoi, ${n}? \u2728`,
    (n: string) => `Aon sc\u00e9al, ${n}?`,
    (n: string) => `${n}! F\u00e1ilte ar ais`,
    (n: string) => `Settling in for the evening, ${n}?`,
]

const GREETINGS_ANYTIME = [
    (n: string) => `${n}, let's find some makers`,
    (n: string) => `Lovely to have you back, ${n}`,
    (n: string) => `Look who's back! Hey ${n}`,
    (n: string) => `Hey ${n}, what'll we discover today?`,
    (n: string) => `Dia duit, ${n}!`,
    (n: string) => `F\u00e1ilte ar ais, ${n}!`,
    (n: string) => `Aon sc\u00e9al, ${n}?`,
    (n: string) => `What's the craic, ${n}?`,
]

function getSessionSeed(): number {
    const key = "maven_greeting_seed"
    const stored = sessionStorage.getItem(key)
    if (stored !== null) return Number(stored)
    const seed = Math.random()
    sessionStorage.setItem(key, String(seed))
    return seed
}

function seededRandom(seed: number, index: number): number {
    const x = Math.sin(seed * 9999 + index * 7919) * 10000
    return x - Math.floor(x)
}

export function getGreeting(name: string): string {
    const seed = getSessionSeed()
    const hour = new Date().getHours()

    const useTimeBased = seededRandom(seed, 0) < 0.5
    let pool = GREETINGS_ANYTIME

    if (useTimeBased) {
        if (hour >= 5 && hour < 12) pool = GREETINGS_MORNING
        else if (hour >= 12 && hour < 17) pool = GREETINGS_AFTERNOON
        else pool = GREETINGS_EVENING
    }

    const index = Math.floor(seededRandom(seed, 1) * pool.length)
    return pool[index](name)
}
