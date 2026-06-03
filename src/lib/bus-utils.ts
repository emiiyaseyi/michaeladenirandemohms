export const BUS_DAYS = [1, 3, 5] // Mon=1, Wed=3, Fri=5
export const MAX_SEATS = 14

export const MORNING_STOPS = [
  "Egbeda", "Alimosho", "Iyana Ipaja",
  "Ikeja", "Leventies", "Maryland Bustop", "DSN Hub, Yaba",
]
export const AFTERNOON_STOPS = [
  "DSN Hub, Yaba", "Maryland", "Leventies",
  "Ikeja", "Iyana Ipaja", "Alimosho", "Egbeda",
]

// WAT = UTC+1
export function watNow(): Date {
  return new Date(Date.now() + 3_600_000)
}

export function watTotalMinutes(d: Date): number {
  const wat = new Date(d.getTime() + 3_600_000)
  return wat.getUTCHours() * 60 + wat.getUTCMinutes()
}

export function isBusDay(now = new Date()): boolean {
  const watDay = new Date(now.getTime() + 3_600_000).getUTCDay()
  return BUS_DAYS.includes(watDay)
}

// Today midnight UTC — used as bookingDate key
export function todayUTC(now = new Date()): Date {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export type BusTier = "intern" | "associate" | "staff"

export function busTier(jobTitle?: string | null): BusTier {
  const t = (jobTitle ?? "").toLowerCase()
  if (t.includes("intern")) return "intern"
  if (t.includes("associate")) return "associate"
  return "staff"
}

// Afternoon open minute for each tier
export const AFTERNOON_OPEN: Record<BusTier, number> = {
  staff: 13 * 60,           // 1:00 PM
  intern: 14 * 60 + 30,     // 2:30 PM
  associate: 14 * 60 + 30,  // 2:30 PM
}

export const MORNING_OPEN_MINS = 7 * 60        // 7:00 AM
export const MORNING_CLOSE_MINS = 7 * 60 + 45  // 7:45 AM
export const AFTERNOON_CLOSE_MINS = 15 * 60 + 50 // 3:50 PM

export function isWindowOpen(
  trip: "MORNING" | "AFTERNOON",
  tier: BusTier,
  now = new Date()
): boolean {
  if (!isBusDay(now)) return false
  const mins = watTotalMinutes(now)
  if (trip === "MORNING") return mins >= MORNING_OPEN_MINS && mins < MORNING_CLOSE_MINS
  return mins >= AFTERNOON_OPEN[tier] && mins < AFTERNOON_CLOSE_MINS
}

export function windowOpenTime(trip: "MORNING" | "AFTERNOON", tier: BusTier): string {
  if (trip === "MORNING") return "7:00 AM"
  return tier === "staff" ? "1:00 PM" : "2:30 PM"
}

export function windowCloseTime(trip: "MORNING" | "AFTERNOON"): string {
  return trip === "MORNING" ? "7:45 AM" : "3:50 PM"
}

export function nextBusDay(now = new Date()): string {
  const wat = new Date(now.getTime() + 3_600_000)
  let d = new Date(wat)
  for (let i = 1; i <= 7; i++) {
    d = new Date(wat)
    d.setUTCDate(wat.getUTCDate() + i)
    if (BUS_DAYS.includes(d.getUTCDay())) break
  }
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[d.getUTCDay()]
}
