const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function isOpenNow(hours) {
    if (!hours) return false
    const now = new Date()
    const day = DAYS[now.getDay()]
    const todayHours = hours[day]
    if (!todayHours || todayHours === "closed") return false
    const [open, close] = todayHours.split("-").map(Number)
    const currentHour = now.getHours()
    return currentHour >= open && currentHour < close
}

function to12h(h) {
    const n = Number(h)
    if (n === 0 || n === 24) return "12AM"
    if (n === 12) return "12PM"
    return n < 12 ? `${n}AM` : `${n - 12}PM`
}

export function formatHoursRange(hoursStr) {
    if (!hoursStr || hoursStr === "closed") return "Closed"
    const [open, close] = hoursStr.split("-")
    return `${to12h(open)}\u2013${to12h(close)}`
}

export function getTodayHours(hours) {
    if (!hours) return "Hours unavailable"
    const day = DAYS[new Date().getDay()]
    const todayHours = hours[day]
    if (!todayHours || todayHours === "closed") return "Closed today"
    return `Open ${formatHoursRange(todayHours)}`
}

export function getInitials(name) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
}

export { DAYS }
