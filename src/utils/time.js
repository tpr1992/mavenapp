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

export function getTodayHours(hours) {
  if (!hours) return "Hours unavailable"
  const day = DAYS[new Date().getDay()]
  const todayHours = hours[day]
  if (!todayHours || todayHours === "closed") return "Closed today"
  return `Open ${todayHours.replace("-", "\u2013")}`
}

export function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

export function getTodayDayKey() {
  return DAYS[new Date().getDay()]
}

export { DAYS }
