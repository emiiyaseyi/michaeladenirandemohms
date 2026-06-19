"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Eye, X, Search, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

const CATEGORIES = [
  { key: "mainProject",     hoursKey: "mainProjectHours",    label: "Main Project" },
  { key: "specialProject",  hoursKey: "specialProjectHours", label: "Special Project" },
  { key: "training",        hoursKey: "trainingHours",       label: "Training" },
  { key: "reportingDoc",    hoursKey: "reportingDocHours",   label: "Reporting / Documentation" },
  { key: "operational",     hoursKey: "operationalHours",    label: "Operational Support" },
  { key: "research",        hoursKey: "researchHours",       label: "Research" },
  { key: "meetings",        hoursKey: "meetingsHours",       label: "Meetings" },
  { key: "community",       hoursKey: "communityHours",      label: "Community" },
  { key: "representation",  hoursKey: "representationHours", label: "Representation" },
  { key: "selfDev",         hoursKey: "selfDevHours",        label: "Self Development" },
]

const DAYS_LIST = ["monday","tuesday","wednesday","thursday","friday"] as const
type DayKey = typeof DAYS_LIST[number]

const REFLECTION_DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
]

type TaskRow = { text: string; minutes: string }
type CellEntries = Record<DayKey, TaskRow[]>

function parseMinutes(raw: string): number {
  const s = raw.trim().toLowerCase()
  const colon = s.match(/^(\d+):(\d{1,2})$/)
  if (colon) return +colon[1] * 60 + +colon[2]
  const hm = s.match(/(\d+)\s*h(?:our|r)?s?\s*(?:(\d+)\s*m(?:in)?s?)?/)
  if (hm) return +hm[1] * 60 + (hm[2] ? +hm[2] : 0)
  const mOnly = s.match(/^(\d+)\s*m(?:in)?s?$/)
  if (mOnly) return +mOnly[1]
  return isNaN(+s) ? 0 : +s
}

function fmtMinutes(m: number): string {
  if (!m) return ""
  const h = Math.floor(m / 60), min = m % 60
  return h ? (min ? `${h}h ${min}m` : `${h}h`) : `${min}m`
}

const emptyTaskRow = (): TaskRow => ({ text: "", minutes: "" })

const initEntries = (): Record<string, CellEntries> =>
  Object.fromEntries(CATEGORIES.map(c => [
    c.key,
    Object.fromEntries(DAYS_LIST.map(d => [d, [emptyTaskRow()]])) as CellEntries
  ]))

type Settings = {
  submissionDay: number; openHour: number; openMinute: number;
  lateHour: number; lateMinute: number; closeHour: number;
  lateDeduction: number; lateDeductionSunday: number; missingWeeklyDeduction: number;
  warningThresholdMinutes: number;
}

const DEFAULTS: Settings = {
  submissionDay: 5, openHour: 16, openMinute: 0, lateHour: 20, lateMinute: 0, closeHour: 24,
  lateDeduction: 2, lateDeductionSunday: 3, missingWeeklyDeduction: 10, warningThresholdMinutes: 15,
}

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
function hourLabel(h: number) {
  const n = h === 24 ? 0 : h
  return `${String(n).padStart(2, "0")}:00`
}

function pad(n: number) { return String(n).padStart(2, "0") }
function fmtRemaining(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (days > 0) return `${days}d ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

type Phase =
  | { kind: "closed_before"; ms: number; label: string }
  | { kind: "ontime"; ms: number; label: string }
  | { kind: "warning"; ms: number; label: string }
  | { kind: "late_friday"; ms: number }
  | { kind: "late_saturday"; ms: number }
  | { kind: "late_sunday"; ms: number }
  | { kind: "closed_after" }

// ── TESTING (R6): window left permanently open ───────────────────────────────
// While we're still iterating, treat every moment as "on-time" so the submit
// button stays enabled regardless of day/hour. Matching server bypass lives in
// src/app/api/intern-reports/route.ts (search for "TESTING_ALWAYS_OPEN").
// Flip back to false (or delete the early return + the const) to restore the
// real Friday-only window. Also documented in work.md Round 6.
const TESTING_ALWAYS_OPEN = false

function computePhase(cfg: Settings, nowWat: Date): Phase {
  if (TESTING_ALWAYS_OPEN) {
    // Fake an "ontime" phase with a far-future late marker so the countdown
    // shows a big positive number and nothing in the UI thinks we're closed.
    const fakeLate = new Date(nowWat.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { kind: "ontime", ms: fakeLate.getTime() - nowWat.getTime(), label: "Testing — window always open" }
  }
  // nowWat is a Date shifted by +1hr from UTC so that getUTC* methods return WAT values
  const day = nowWat.getUTCDay() // 0=Sun … 1=Mon … 6=Sat
  // Submission Day (open day) is configurable Mon-Fri. Saturday/Sunday are ALWAYS the
  // literal calendar late days — they never shift with the open day.
  const OPEN_DAY = cfg.submissionDay

  // Build a Date in WAT-shifted space for today at HH:MM WAT
  const todayAt = (h: number, m = 0) => {
    const d = new Date(nowWat)
    d.setUTCHours(h, m, 0, 0)
    return d
  }
  const msTo = (target: Date) => target.getTime() - nowWat.getTime()
  const openM = cfg.openMinute ?? 0
  const lateM = cfg.lateMinute ?? 0
  const fmtWAT = (h: number, m: number) =>
    `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} WAT`

  if (day === OPEN_DAY) {
    const openAt = todayAt(cfg.openHour, openM)
    const lateAt = todayAt(cfg.lateHour, lateM)
    const closeTodayAt = todayAt(24)
    if (nowWat < openAt) {
      return { kind: "closed_before", ms: msTo(openAt), label: `Opens at ${fmtWAT(cfg.openHour, openM)}` }
    }
    const warningStart = new Date(lateAt.getTime() - cfg.warningThresholdMinutes * 60 * 1000)
    if (nowWat < warningStart) return { kind: "ontime",  ms: msTo(lateAt), label: "On-time" }
    if (nowWat < lateAt)        return { kind: "warning", ms: msTo(lateAt), label: `Last ${cfg.warningThresholdMinutes} min!` }
    return { kind: "late_friday", ms: msTo(closeTodayAt) }
  }

  if (day === 6) {
    const tomorrowMidnight = todayAt(24)
    return { kind: "late_saturday", ms: msTo(tomorrowMidnight) }
  }

  if (day === 0) {
    const tomorrowMidnight = todayAt(24)
    return { kind: "late_sunday", ms: msTo(tomorrowMidnight) }
  }

  // A Mon-Fri weekday that isn't the open day.
  if (day < OPEN_DAY) {
    // Before this week's open day — window hasn't opened yet.
    const daysUntilOpen = OPEN_DAY - day
    const next = new Date(nowWat)
    next.setUTCDate(nowWat.getUTCDate() + daysUntilOpen)
    next.setUTCHours(cfg.openHour, openM, 0, 0)
    return { kind: "closed_before", ms: msTo(next), label: `Opens ${DAYS[OPEN_DAY]} ${fmtWAT(cfg.openHour, openM)}` }
  }

  // After this week's open day but before Saturday — window is closed until Saturday
  // (Saturday/Sunday late submission is always available regardless of the open day).
  const daysUntilSat = 6 - day
  const nextSat = new Date(nowWat)
  nextSat.setUTCDate(nowWat.getUTCDate() + daysUntilSat)
  nextSat.setUTCHours(0, 0, 0, 0)
  return { kind: "closed_before", ms: msTo(nextSat), label: `Window closed — opens again Saturday (late, −${cfg.lateDeduction} pts)` }
}

function computeWindow(cfg: Settings): { text: string; open: boolean; late: boolean } {
  const nowWat = new Date(Date.now() + 60 * 60 * 1000)
  const phase = computePhase(cfg, nowWat)
  switch (phase.kind) {
    case "closed_before": return { text: phase.label, open: false, late: false }
    case "closed_after":  return { text: "Submission window closed. Next opens Friday.", open: false, late: false }
    case "ontime":        return { text: `On-time window`, open: true, late: false }
    case "warning":       return { text: phase.label, open: true, late: false }
    case "late_friday":   return { text: `LATE — submit before midnight (0 pt deduction so far)`, open: true, late: true }
    case "late_saturday": return { text: `Saturday submission — −${cfg.lateDeduction} pts`, open: true, late: true }
    case "late_sunday":   return { text: `Sunday submission — −${cfg.lateDeductionSunday} pts (final day)`, open: true, late: true }
  }
}

function CountdownBanner({ cfg }: { cfg: Settings }) {
  const [now, setNow] = useState(() => new Date(Date.now() + 60 * 60 * 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(new Date(Date.now() + 60 * 60 * 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const phase = computePhase(cfg, now)

  let bg = "#F3F4F6"; let color = "#374151"; let icon = "🕒"; let title = ""; let subtitle = ""
  switch (phase.kind) {
    case "closed_before":
      bg = "#F3F4F6"; color = "#374151"; icon = "🕒"
      title = phase.label
      subtitle = "Submission is not yet open"
      break
    case "ontime":
      bg = "#DCFCE7"; color = "#15803D"; icon = "✓"
      title = "ON-TIME WINDOW"
      subtitle = `${fmtRemaining(phase.ms)} left`
      break
    case "warning":
      bg = "#FEE2E2"; color = "#DC2626"; icon = "⚠"
      title = phase.label
      subtitle = `${fmtRemaining(phase.ms)} to deadline`
      break
    case "late_friday":
      bg = "#FEE2E2"; color = "#DC2626"; icon = "⏰"
      title = "Late submission — no deduction yet"
      subtitle = "Submit tonight to avoid a point deduction"
      break
    case "late_saturday":
      bg = "#FEF3C7"; color = "#D97706"; icon = "⏰"
      title = `Late submission — −${cfg.lateDeduction} pts`
      subtitle = "Window closes Sunday midnight"
      break
    case "late_sunday":
      bg = "#FEE2E2"; color = "#DC2626"; icon = "🔥"
      title = `Late submission — −${cfg.lateDeductionSunday} pts · Final day`
      subtitle = "Last chance — window closes at midnight"
      break
    case "closed_after":
      bg = "#F3F4F6"; color = "#374151"; icon = "🕒"
      title = "Window closed"
      subtitle = `Next: Friday ${hourLabel(cfg.openHour)} WAT`
      break
  }

  return (
    <div style={{
      background: bg, borderRadius: 16, padding: "22px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      marginBottom: 20, border: `2px solid ${color}33`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 32, lineHeight: 1 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color, opacity: 0.85 }}>
            {subtitle}
          </div>
        </div>
      </div>
      {(phase.kind === "ontime" || phase.kind === "warning") && (
        <div style={{
          fontSize: 38, fontWeight: 900, color, fontVariantNumeric: "tabular-nums",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "0.02em",
        }}>
          {fmtRemaining(phase.ms)}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    DRAFT:            { label: "Draft",     bg: "#F3F4F6", color: "#6B7280" },
    SUBMITTED:        { label: "Submitted", bg: "#DBEAFE", color: "#1D4ED8" },
    LATE:             { label: "Late",      bg: "#FEF3C7", color: "#D97706" },
    REVIEWED:         { label: "Reviewed",  bg: "#DCFCE7", color: "#15803D" },
    ATTENDANCE_FILLED:{ label: "Completed", bg: "#DCFCE7", color: "#15803D" },
    MISSING:          { label: "Missed",    bg: "#FEE2E2", color: "#DC2626" },
  }
  const s = map[status] ?? map.DRAFT
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

const AVATAR_COLORS = ["#E11D48","#7C3AED","#1D4ED8","#0369A1","#0F766E","#15803D","#92400E","#B45309"]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function lbInitials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() }

export default function InternReportPage() {
  const [cfg, setCfg] = useState<Settings>(DEFAULTS)
  const [entries, setEntries] = useState<Record<string, CellEntries>>(initEntries())
  const [dailyReflections, setDailyReflections] = useState<Record<string, string>>({ Mon: "", Tue: "", Wed: "", Thu: "", Fri: "" })
  const [generalReflection, setGeneralReflection] = useState("")
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [lbWeekOffset, setLbWeekOffset] = useState(0)
  const [lbMode, setLbMode] = useState<"week" | "month" | "alltime">("week")
  const [lbDeptFilter, setLbDeptFilter] = useState("")
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, negative = past
  const [tab, setTab] = useState<"report" | "leaderboard">("report")
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState("")
  const [submitOk, setSubmitOk] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewReport, setViewReport] = useState<any | null>(null)
  const [window, setWindow] = useState(() => computeWindow(DEFAULTS))

  const [reportStartDate, setReportStartDate] = useState<Date | null>(null)
  const [projectLead, setProjectLead] = useState<{ id: string; name: string } | null>(null)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [extraReviewerIds, setExtraReviewerIds] = useState<string[]>([])
  const [reviewerSearch, setReviewerSearch] = useState("")
  const [reviewerDropOpen, setReviewerDropOpen] = useState(false)
  const [reviewerDropPos, setReviewerDropPos] = useState({ top: 0, left: 0, width: 0 })
  const reviewerRef = useRef<HTMLDivElement>(null)
  const openReviewerDrop = () => {
    if (reviewerRef.current) {
      const r = reviewerRef.current.getBoundingClientRect()
      setReviewerDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setReviewerDropOpen(true)
  }

  useEffect(() => {
    fetch("/api/settings/intern-reports")
      .then(r => r.json())
      .then(d => {
        const cfg = { ...DEFAULTS, ...d }
        setCfg(cfg); setWindow(computeWindow(cfg))
      })
      .catch(() => {})
    fetch("/api/intern-reports").then(r => r.json()).then(d => setReports(d.reports ?? [])).finally(() => setLoading(false))
    fetch("/api/self-service/profile").then(r => r.json()).then(d => {
      const pl = d.profile?.projectLead
      if (pl) setProjectLead({ id: pl.id, name: pl.name })
      // Eligibility to submit reports starts from account creation, not hireDate —
      // unless an admin set an explicit override (internReportStartDate) for this intern.
      const start = d.profile?.internReportStartDate ?? d.profile?.accountCreatedAt
      if (start) setReportStartDate(new Date(start))
    }).catch(() => {})
    fetch("/api/intern-reports/reviewers").then(r => r.json()).then(d => setAllEmployees(d.employees ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => setWindow(computeWindow(cfg)), 30_000)
    return () => clearInterval(t)
  }, [cfg])

  useEffect(() => {
    let url = "/api/intern-reports/leaderboard"
    if (lbMode === "week") {
      const d = new Date(); d.setUTCHours(0,0,0,0)
      const dayN = d.getUTCDay(); const diff = dayN === 0 ? -6 : 1 - dayN
      d.setUTCDate(d.getUTCDate() + diff + lbWeekOffset * 7)
      url += `?week=${encodeURIComponent(d.toISOString())}`
    } else {
      url += `?mode=${lbMode}`
    }
    fetch(url).then(r => r.json()).then(data => setLeaderboard(data.leaderboard ?? [])).catch(() => {})
  }, [lbWeekOffset, lbMode])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!reviewerRef.current?.contains(e.target as Node)) setReviewerDropOpen(false)
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  const setTaskRow = (catKey: string, day: DayKey, idx: number, field: keyof TaskRow, val: string) =>
    setEntries(e => {
      const rows = [...(e[catKey]?.[day] ?? [emptyTaskRow()])]
      rows[idx] = { ...rows[idx], [field]: val }
      return { ...e, [catKey]: { ...e[catKey], [day]: rows } }
    })

  const addTaskRow = (catKey: string, day: DayKey) =>
    setEntries(e => {
      const rows = [...(e[catKey]?.[day] ?? [emptyTaskRow()]), emptyTaskRow()]
      return { ...e, [catKey]: { ...e[catKey], [day]: rows } }
    })

  const removeTaskRow = (catKey: string, day: DayKey, idx: number) =>
    setEntries(e => {
      const rows = (e[catKey]?.[day] ?? [emptyTaskRow()]).filter((_, i) => i !== idx)
      return { ...e, [catKey]: { ...e[catKey], [day]: rows.length ? rows : [emptyTaskRow()] } }
    })

  const cellMinutes = (catKey: string, day: DayKey) =>
    (entries[catKey]?.[day] ?? []).reduce((s, r) => s + parseMinutes(r.minutes), 0)

  const catTotal = (catKey: string) =>
    DAYS_LIST.reduce((s, d) => s + cellMinutes(catKey, d), 0) / 60

  const addReviewer = (emp: any) => {
    if (extraReviewerIds.includes(emp.id)) return
    setExtraReviewerIds(ids => [...ids, emp.id])
    setReviewerSearch(""); setReviewerDropOpen(false)
  }
  const removeReviewer = (id: string) => setExtraReviewerIds(ids => ids.filter(i => i !== id))

  const filteredReviewers = allEmployees.filter(e => {
    if (extraReviewerIds.includes(e.id)) return false
    if (projectLead && e.id === projectLead.id) return false
    const q = reviewerSearch.toLowerCase()
    return !q || `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""} ${e.department?.name ?? ""}`.toLowerCase().includes(q)
  })

  const totalHours = CATEGORIES.reduce((s, c) => s + catTotal(c.key), 0)

  // Current week (WAT) — used as reference for the week navigator
  const watNow = new Date(new Date().getTime() + 60 * 60 * 1000)
  const currentDay = watNow.getDay()
  const diffToCurrentMonday = currentDay === 0 ? -6 : 1 - currentDay
  const currentWeekMon = new Date(watNow)
  currentWeekMon.setDate(watNow.getDate() + diffToCurrentMonday)
  currentWeekMon.setHours(0,0,0,0)

  // Selected week based on weekOffset
  const weekMon = new Date(currentWeekMon)
  weekMon.setDate(currentWeekMon.getDate() + weekOffset * 7)
  const weekFri = new Date(weekMon); weekFri.setDate(weekMon.getDate() + 4)
  const weekLabel = `${format(weekMon, "MMM d")} – ${format(weekFri, "MMM d, yyyy")}`
  const isPastWeek = weekOffset < 0

  // Monday of the intern's earliest reportable week — can't navigate to weeks before this
  let earliestWeekMon: Date | null = null
  if (reportStartDate) {
    const sd = new Date(reportStartDate)
    const startDay = sd.getDay()
    const diffToStartMonday = startDay === 0 ? -6 : 1 - startDay
    earliestWeekMon = new Date(sd)
    earliestWeekMon.setDate(sd.getDate() + diffToStartMonday)
    earliestWeekMon.setHours(0, 0, 0, 0)
  }
  const atEarliestWeek = !!earliestWeekMon && weekMon <= earliestWeekMon

  // Flat per-week deduction: -missingWeeklyDeduction for every Monday this report has been outstanding (no streak).
  const missedMondays = (() => {
    if (!isPastWeek) return 0
    const firstMissedMonday = new Date(weekMon); firstMissedMonday.setDate(weekMon.getDate() + 7)
    if (watNow.getTime() < firstMissedMonday.getTime()) return 0
    return Math.floor((watNow.getTime() - firstMissedMonday.getTime()) / (7 * 86400000)) + 1
  })()
  const pastWeekDeduction = missedMondays * (cfg.missingWeeklyDeduction ?? 10)

  const lbMonday = (() => {
    const d = new Date(); d.setUTCHours(0,0,0,0)
    const dayN = d.getUTCDay(); const diff = dayN === 0 ? -6 : 1 - dayN
    d.setUTCDate(d.getUTCDate() + diff + lbWeekOffset * 7)
    return d
  })()
  const lbFriday = new Date(lbMonday); lbFriday.setUTCDate(lbMonday.getUTCDate() + 4)
  const lbWeekLabel = `${format(lbMonday, "MMM d")} – ${format(lbFriday, "MMM d, yyyy")}`

  const selectedWeekReport = reports.find(r => {
    const ws = new Date(r.weekStart); ws.setHours(0,0,0,0)
    const wm = new Date(weekMon); wm.setHours(0,0,0,0)
    return ws.getTime() === wm.getTime()
  })
  // Keep thisWeekReport for backward compat (used in alreadySubmitted)
  const thisWeekReport = selectedWeekReport

  const handleSubmit = async () => {
    if (!isPastWeek && !window.open) return
    setSubmitting(true); setSubmitErr("")
    const taskDescriptions = Object.fromEntries(CATEGORIES.map(c => [c.key, entries[c.key]]))
    const res = await fetch("/api/intern-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskDescriptions, dailyReflections, generalReflection, extraReviewerIds, weekStart: weekMon.toISOString() }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitErr(d.error ?? "Failed to submit"); return }
    if (weekOffset === 0) setSubmitOk(true)
    setReports(prev => [d.report, ...prev.filter(r => r.id !== d.report.id)])
  }

  const alreadySubmitted = (submitOk && weekOffset === 0)
    || ["SUBMITTED","LATE","REVIEWED","ATTENDANCE_FILLED"].includes(selectedWeekReport?.status)

  // Compulsory: every Mon-Fri daily reflection must be non-empty after trim
  const missingReflectionDays = REFLECTION_DAYS
    .filter(d => !dailyReflections[d.key] || dailyReflections[d.key].trim().length === 0)
    .map(d => d.label)
  const allReflectionsFilled = missingReflectionDays.length === 0
  const generalReflectionFilled = generalReflection.trim().length > 0
  const hoursOk = totalHours <= 40
  const hasReviewer = !!projectLead || extraReviewerIds.length > 0
  const hasUntimedTasks = CATEGORIES.some(c =>
    DAYS_LIST.some(d =>
      (entries[c.key]?.[d] ?? []).some(r => r.text.trim() !== "" && parseMinutes(r.minutes) === 0)
    )
  )

  const hasMissingPlaceholder = selectedWeekReport?.status === "MISSING"

  return (
    <div className="intern-report-page" style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Weekly Report</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Window: {DAYS[cfg.submissionDay]} {hourLabel(cfg.openHour)} → Sunday 11:59 PM WAT.
          On time: 0 pts • Sat: −{cfg.lateDeduction} pts • Sun: −{cfg.lateDeductionSunday} pts.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 24, width: "fit-content" }}>
        {(["report", "leaderboard"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t === "report" ? "My Report" : "Leaderboard"}
          </button>
        ))}
      </div>

      {tab === "report" && (<>

      {/* Week navigator */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button onClick={() => { if (!atEarliestWeek) { setWeekOffset(o => o - 1); setSubmitErr(""); setSubmitOk(false); setEntries(initEntries()); setDailyReflections({ Mon: "", Tue: "", Wed: "", Thu: "", Fri: "" }); setGeneralReflection("") } }}
          disabled={atEarliestWeek}
          title={atEarliestWeek ? "You can't view weeks before your reporting start date" : undefined}
          style={{ background: "var(--muted)", border: "none", borderRadius: 6, cursor: atEarliestWeek ? "not-allowed" : "pointer", padding: "5px 10px", fontSize: 16, opacity: atEarliestWeek ? 0.4 : 1 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {isPastWeek ? `Past: ${weekLabel}` : `Current week: ${weekLabel}`}
        </span>
        <button onClick={() => { if (weekOffset < 0) { setWeekOffset(o => o + 1); setSubmitErr(""); setSubmitOk(false); setEntries(initEntries()); setDailyReflections({ Mon: "", Tue: "", Wed: "", Thu: "", Fri: "" }); setGeneralReflection("") } }}
          disabled={weekOffset >= 0}
          style={{ background: "var(--muted)", border: "none", borderRadius: 6, cursor: weekOffset >= 0 ? "not-allowed" : "pointer", padding: "5px 10px", opacity: weekOffset >= 0 ? 0.4 : 1 }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Big live countdown — only for current week */}
      {!isPastWeek && <CountdownBanner cfg={cfg} />}

      {/* Past week notice */}
      {isPastWeek && (
        <div style={{ padding: "14px 18px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 16, color: "#92400E", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⏰</span>
          <div>
            <strong>Past week submission</strong> — a deduction of <strong>−{pastWeekDeduction} pts</strong> will be applied.
            Deductions accrue −{cfg.missingWeeklyDeduction} pts every Monday until you submit. Submit as soon as possible.
          </div>
        </div>
      )}

      {hasMissingPlaceholder && (
        <div style={{ padding: "12px 16px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, marginBottom: 16, color: "#92400E", fontSize: 12 }}>
          A "Missing" placeholder exists for this week — submitting will replace it.
        </div>
      )}

      {/* Submission Form — full width */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
        {/* Card header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{isPastWeek ? "Past Week Report" : "This Week's Report"}</h2>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{weekLabel}</span>
          </div>
          {isPastWeek ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#FEF3C7", color: "#D97706", fontSize: 11, fontWeight: 700 }}>
              <Clock size={12} /> LATE −{pastWeekDeduction}pts
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
              background: window.late ? "#FEF3C7" : window.open ? "#DCFCE7" : "#F3F4F6",
              color: window.late ? "#D97706" : window.open ? "#15803D" : "#6B7280",
              fontSize: 11, fontWeight: 700,
            }}>
              <Clock size={12} />
              {window.open ? (window.late ? "LATE" : "OPEN") : "CLOSED"}
            </div>
          )}
        </div>

        {alreadySubmitted ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <CheckCircle2 size={44} style={{ color: "#16a34a", margin: "0 auto 14px" }} />
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Report Submitted!</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your report for {weekLabel} has been submitted. Check Past Reports below for status.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 24px 0" }}>

              {/* Task table — Days as rows, Categories as columns */}
              <div style={{ overflow: "auto", maxHeight: "min(70vh, 560px)", marginBottom: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 95, position: "sticky", left: 0, top: 0, background: "var(--muted)", zIndex: 3, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>Day</th>
                      {CATEGORIES.map(cat => (
                        <th key={cat.key} style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 165, position: "sticky", top: 0, background: "var(--muted)", zIndex: 2 }}>{cat.label}</th>
                      ))}
                      <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 90, position: "sticky", right: 0, top: 0, background: "var(--muted)", zIndex: 3, boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>Daily Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_LIST.map((day, i) => {
                      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
                      const dayTotalMins = CATEGORIES.reduce((s, c) => s + cellMinutes(c.key, day), 0)
                      const dayOver = dayTotalMins > 480
                      const rowBg = i % 2 === 0 ? "var(--card)" : "var(--muted)"
                      return (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: "var(--foreground)", verticalAlign: "top", position: "sticky", left: 0, background: rowBg, zIndex: 1, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>{dayLabel}</td>
                          {CATEGORIES.map(cat => {
                            const rows = entries[cat.key]?.[day] ?? [emptyTaskRow()]
                            return (
                              <td key={cat.key} style={{ padding: "8px 8px", verticalAlign: "top" }}>
                                {rows.map((row, idx) => (
                                  <div key={idx} style={{ marginBottom: 6 }}>
                                    <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                                      <textarea
                                        value={row.text}
                                        onChange={e => setTaskRow(cat.key, day, idx, "text", e.target.value)}
                                        disabled={!window.open}
                                        placeholder="Task description…"
                                        rows={3}
                                        style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 5, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box", opacity: !window.open ? 0.6 : 1, lineHeight: 1.4 }}
                                      />
                                      {rows.length > 1 && window.open && (
                                        <button onClick={() => removeTaskRow(cat.key, day, idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 16, lineHeight: 1, padding: "4px 2px", flexShrink: 0 }}>−</button>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={row.minutes}
                                      onChange={e => setTaskRow(cat.key, day, idx, "minutes", e.target.value)}
                                      disabled={!window.open}
                                      placeholder="90 or 1h 30m"
                                      style={{ width: "100%", padding: "4px 7px", border: `1px solid ${row.text.trim() && !parseMinutes(row.minutes) ? "#FCA5A5" : "var(--border)"}`, borderRadius: 5, fontSize: 11, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", opacity: !window.open ? 0.6 : 1, marginTop: 3 }}
                                    />
                                    {parseMinutes(row.minutes) > 0 && (
                                      <div style={{ fontSize: 10, color: "var(--primary)", marginTop: 2, fontWeight: 600 }}>{fmtMinutes(parseMinutes(row.minutes))}</div>
                                    )}
                                  </div>
                                ))}
                                {window.open && (
                                  <button onClick={() => addTaskRow(cat.key, day)} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 600 }}>+ Task</button>
                                )}
                              </td>
                            )
                          })}
                          <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, fontSize: 13, color: dayOver ? "#DC2626" : "var(--primary)", verticalAlign: "top", position: "sticky", right: 0, background: rowBg, zIndex: 1, boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>
                            {dayTotalMins > 0 ? fmtMinutes(dayTotalMins) : "—"}
                            {dayOver && <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>over 8h</div>}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Category totals row */}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "var(--muted)", position: "sticky", bottom: 0, zIndex: 2 }}>
                      <td style={{ padding: "11px 14px", fontWeight: 800, fontSize: 13, position: "sticky", left: 0, background: "var(--muted)", zIndex: 3, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>Total</td>
                      {CATEGORIES.map(cat => {
                        const catMins = DAYS_LIST.reduce((s, d) => s + cellMinutes(cat.key, d), 0)
                        return (
                          <td key={cat.key} style={{ padding: "11px 8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--muted-foreground)" }}>
                            {catMins > 0 ? fmtMinutes(catMins) : "—"}
                          </td>
                        )
                      })}
                      <td style={{ padding: "11px 8px", textAlign: "center", fontWeight: 900, fontSize: 14, color: totalHours > 40 ? "#DC2626" : totalHours > 35 ? "#D97706" : "var(--primary)", position: "sticky", right: 0, background: "var(--muted)", boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>
                        {totalHours.toFixed(1)}h
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Hours cap warning */}
              {totalHours > 35 && (
                <div style={{ padding: "10px 14px", background: totalHours > 40 ? "#FEE2E2" : "#FEF3C7", border: `1px solid ${totalHours > 40 ? "#FECACA" : "#FDE68A"}`, borderRadius: 8, fontSize: 12, color: totalHours > 40 ? "#991B1B" : "#92400E", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{totalHours > 40 ? "🚫" : "⚠️"}</span>
                  {totalHours > 40
                    ? `Total hours (${totalHours.toFixed(1)}h) exceed the weekly limit of 40h. Please reduce before submitting.`
                    : `Total hours (${totalHours.toFixed(1)}h) are approaching the weekly limit of 40h.`}
                </div>
              )}

              {/* Daily Reflections */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Daily Reflections</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#FEE2E2", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>Required — all 5 days</span>
                </div>
                <div className="reflections-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {REFLECTION_DAYS.map(({ key, label }) => {
                    const empty = !dailyReflections[key] || dailyReflections[key].trim().length === 0
                    return (
                      <div key={key}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: empty ? "#DC2626" : "var(--muted-foreground)", marginBottom: 5 }}>
                          {label}
                          {empty && <span style={{ fontSize: 12 }}>*</span>}
                        </label>
                        <textarea
                          value={dailyReflections[key]}
                          onChange={e => setDailyReflections(r => ({ ...r, [key]: e.target.value }))}
                          rows={4}
                          disabled={!window.open}
                          placeholder="What did you work on, learn, or reflect on today?"
                          style={{
                            width: "100%", padding: "8px 10px",
                            border: `1.5px solid ${empty && window.open ? "#FCA5A5" : "var(--border)"}`,
                            borderRadius: 8, fontSize: 12, background: "var(--background)",
                            color: "var(--foreground)", outline: "none", resize: "vertical",
                            boxSizing: "border-box", opacity: !window.open ? 0.6 : 1,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                {window.open && missingReflectionDays.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>
                    Missing reflections for: <strong>{missingReflectionDays.join(", ")}</strong>. All 5 days are compulsory.
                  </div>
                )}
              </div>

              {/* General Reflection */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>General Reflection</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#FEE2E2", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>Required</span>
                </div>
                <textarea
                  value={generalReflection}
                  onChange={e => setGeneralReflection(e.target.value)}
                  rows={4}
                  disabled={!window.open}
                  placeholder="Summarise your week overall — what went well, what you learned, and what you'd do differently…"
                  style={{
                    width: "100%", padding: "10px 12px",
                    border: `1.5px solid ${(!generalReflection.trim() && window.open) ? "#FCA5A5" : "var(--border)"}`,
                    borderRadius: 8, fontSize: 13, background: "var(--background)",
                    color: "var(--foreground)", outline: "none", resize: "vertical",
                    boxSizing: "border-box", opacity: !window.open ? 0.6 : 1,
                  }}
                />
                {window.open && !generalReflection.trim() && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#DC2626" }}>General reflection is required.</div>
                )}
              </div>

              {/* Reviewers */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Users size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Who will review this report</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {projectLead ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#EEF2FF", fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
                      {projectLead.name}
                      <span style={{ fontSize: 10, fontWeight: 400, color: "#6366f1" }}>— primary reviewer</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#D97706", fontStyle: "italic" }}>
                      No project lead assigned — add at least one reviewer below.
                    </div>
                  )}
                  {extraReviewerIds.map(revId => {
                    const emp = allEmployees.find(e => e.id === revId)
                    if (!emp) return null
                    return (
                      <div key={revId} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
                        {emp.firstName} {emp.lastName}
                        <button onClick={() => removeReviewer(revId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted-foreground)", display: "flex" }}><X size={12} /></button>
                      </div>
                    )
                  })}
                </div>
                <div ref={reviewerRef} style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)" }}>
                    <Search size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <input
                      value={reviewerSearch}
                      onChange={e => { setReviewerSearch(e.target.value); openReviewerDrop() }}
                      onFocus={openReviewerDrop}
                      placeholder="Add another reviewer…"
                      style={{ border: "none", background: "transparent", fontSize: 12, outline: "none", flex: 1, color: "var(--foreground)" }}
                      disabled={!window.open}
                    />
                  </div>
                  {reviewerDropOpen && filteredReviewers.length > 0 && typeof document !== "undefined" && createPortal(
                    <div style={{ position: "fixed", top: reviewerDropPos.top, left: reviewerDropPos.left, width: reviewerDropPos.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 180, overflowY: "auto" }}>
                      {filteredReviewers.slice(0, 20).map(emp => (
                        <div key={emp.id} onClick={() => addReviewer(emp)}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12 }}
                          onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                          onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                          <span style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</span>
                          {emp.jobTitle && <span style={{ color: "var(--muted-foreground)", marginLeft: 6 }}>{emp.jobTitle}</span>}
                        </div>
                      ))}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {!isPastWeek && window.late && (
                <div style={{ padding: "8px 12px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#92400E", marginBottom: 12 }}>
                  Late submission — {cfg.lateDeduction} point{cfg.lateDeduction !== 1 ? "s" : ""} will be automatically deducted from your score.
                </div>
              )}

              {submitErr && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginBottom: 12 }}>
                  <AlertCircle size={14} />{submitErr}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              {(isPastWeek || window.open) && !allReflectionsFilled && (
                <span style={{ fontSize: 12, color: "#DC2626" }}>
                  Fill all 5 daily reflections to submit.
                </span>
              )}
              {(isPastWeek || window.open) && !hasReviewer && (
                <span style={{ fontSize: 12, color: "#DC2626" }}>
                  Please add at least one reviewer.
                </span>
              )}
              {(isPastWeek || window.open) && hasUntimedTasks && (
                <span style={{ fontSize: 12, color: "#DC2626" }}>
                  Enter time for each filled task.
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={(!isPastWeek && !window.open) || submitting || !allReflectionsFilled || !generalReflectionFilled || !hoursOk || !hasReviewer || hasUntimedTasks}
                title={
                  (!isPastWeek && !window.open) ? "Submission window closed"
                    : !hasReviewer ? "Add at least one reviewer before submitting"
                    : hasUntimedTasks ? "Enter time for each filled task"
                    : !allReflectionsFilled ? `Missing: ${missingReflectionDays.join(", ")}`
                    : "Submit Report"
                }
                style={{
                  padding: "10px 32px", background: isPastWeek ? "#D97706" : "var(--primary)", border: "none", borderRadius: 8,
                  cursor: ((isPastWeek || window.open) && !submitting && allReflectionsFilled && hasReviewer && !hasUntimedTasks) ? "pointer" : "not-allowed",
                  fontSize: 14, fontWeight: 700, color: "white",
                  opacity: ((!isPastWeek && !window.open) || submitting || !allReflectionsFilled || !hasReviewer || hasUntimedTasks) ? 0.5 : 1,
                }}
              >
                {submitting ? "Submitting…" : isPastWeek ? `Submit Late (−${pastWeekDeduction}pts)` : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Past Reports — below the form */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Past Reports</h2>
        </div>
        {loading ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No reports submitted yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 0 }}>
            {reports.map(r => (
              <div key={r.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {format(new Date(r.weekStart), "MMM d")} – {format(new Date(r.weekEnd), "MMM d")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <StatusBadge status={r.status} />
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{(r.totalHours ?? 0).toFixed(1)}h</span>
                    {r.totalScore !== undefined && r.productivityRating !== null ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>
                        {r.attendanceRating !== null
                          ? `${Math.round((r.totalScore / 12) * 100)}%`
                          : `PL: ${Math.round(((r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)) / 9 * 100)}% (att. pending)`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => setViewReport(r)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "5px 10px", flexShrink: 0 }}>
                  <Eye size={12} /> View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      </>)}

      {tab === "leaderboard" && (() => {
        const myEntry = leaderboard.find((row: any) => !!reports.find((r: any) => r.employeeId === row.employeeId))
        const top3 = leaderboard.filter((r: any) => r.rank !== null).slice(0, 3)
        const ringColor = (rank: number) => rank === 1 ? "#F59E0B" : rank === 2 ? "#9CA3AF" : "#CD7C2F"
        const depts = [...new Set(leaderboard.map((r: any) => r.dept).filter(Boolean))] as string[]
        const filtered = lbDeptFilter ? leaderboard.filter((r: any) => r.dept === lbDeptFilter) : leaderboard
        const totPct = (row: any) => lbMode === "week" ? row.totalScorePct : row.avgScorePct
        const isPending = (row: any) => row.attendancePending
        return (
          <div>
            {/* Hero banner */}
            <div style={{ background: "#15803D", borderRadius: 16, padding: "24px 28px", marginBottom: 16, color: "white", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
              <div>
                {myEntry ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Standing</div>
                    <div style={{ fontSize: 32, fontWeight: 900 }}>{myEntry.rank ? `#${myEntry.rank}` : "–"} <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>of {leaderboard.length}</span></div>
                    <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                      Score: {isPending(myEntry) ? "pending" : `${totPct(myEntry)}%`}
                      {myEntry.streak > 0 && <span style={{ marginLeft: 12 }}>🔥 {myEntry.streak}-week streak</span>}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.9 }}>No submission this week</div>
                )}
              </div>
              {top3.length > 0 && (() => {
                const byRank: Record<number, any> = {}
                top3.forEach((r: any) => { byRank[r.rank] = r })
                const podiumOrder = [byRank[2], byRank[1], byRank[3]].filter(Boolean)
                const cfg: Record<number, { lift: number; size: number; ribbon: string; medal: string; numCol: string }> = {
                  1: { lift: 36, size: 56, ribbon: "#FCD34D", medal: "#F59E0B", numCol: "#78350F" },
                  2: { lift: 18, size: 46, ribbon: "#CBD5E1", medal: "#94A3B8", numCol: "#1E293B" },
                  3: { lift: 0,  size: 40, ribbon: "#C97B3A", medal: "#92400E", numCol: "#FEF3C7" },
                }
                return (
                  <div style={{ display: "flex", gap: 18, alignItems: "flex-end", paddingBottom: 4 }}>
                    {podiumOrder.map((row: any) => {
                      const c = cfg[row.rank]
                      return (
                        <div key={row.employeeId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginBottom: c.lift }}>
                          <div style={{ width: c.size, height: c.size, borderRadius: "50%", background: avatarColor(row.name), border: `3px solid ${ringColor(row.rank)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(c.size * 0.3), fontWeight: 800, color: "white", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", flexShrink: 0 }}>
                            {lbInitials(row.name)}
                          </div>
                          <div style={{ width: 3, height: 14, background: c.ribbon, marginTop: 2 }} />
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: c.medal, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: c.numCol, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                            {row.rank}
                          </div>
                          <div style={{ textAlign: "center", marginTop: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name.split(" ")[0]}</div>
                            <div style={{ fontSize: 10, opacity: 0.8 }}>{isPending(row) ? "pending" : `${totPct(row)}%`}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {depts.length > 1 && (
                <select value={lbDeptFilter} onChange={e => setLbDeptFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
                  <option value="">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
                {(["week","month","alltime"] as const).map(m => (
                  <button key={m} onClick={() => { setLbMode(m); setLbWeekOffset(0) }}
                    style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: lbMode === m ? "var(--primary)" : "var(--card)", color: lbMode === m ? "white" : "var(--muted-foreground)" }}>
                    {m === "week" ? "Week" : m === "month" ? "Month" : "All Time"}
                  </button>
                ))}
              </div>
              {lbMode === "week" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px" }}>
                  <button onClick={() => setLbWeekOffset(o => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><ChevronLeft size={15} /></button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 130, textAlign: "center" }}>{lbWeekLabel}</span>
                  <button onClick={() => setLbWeekOffset(o => Math.min(o + 1, 0))} disabled={lbWeekOffset === 0} style={{ background: "none", border: "none", cursor: lbWeekOffset === 0 ? "not-allowed" : "pointer", color: lbWeekOffset === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}><ChevronRight size={15} /></button>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leaderboard data for this period.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        {["Rank", "Member", "Dept", "🔥 Streak", "Total %"].map(h => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row: any) => {
                        const isMe = !!reports.find((r: any) => r.employeeId === row.employeeId)
                        const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null
                        return (
                          <tr key={row.employeeId} style={{ borderTop: "1px solid var(--border)", background: isMe ? "rgba(22,163,74,0.06)" : "transparent" }}>
                            <td style={{ padding: "11px 14px", fontWeight: 700 }}>{medal ? <span style={{ fontSize: 15 }}>{medal}</span> : <span style={{ color: "var(--muted-foreground)" }}>{row.rank ?? "–"}</span>}</td>
                            <td style={{ padding: "11px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(row.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>{lbInitials(row.name)}</div>
                                <span style={{ fontWeight: isMe ? 700 : 500 }}>{row.name}{isMe && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: "#DCFCE7", color: "#15803D", fontWeight: 700, marginLeft: 6 }}>You</span>}</span>
                              </div>
                            </td>
                            <td style={{ padding: "11px 14px", color: "var(--muted-foreground)", fontSize: 12 }}>{row.dept}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 600 }}>{row.streak > 0 ? `${row.streak}w` : "–"}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--primary)" }}>{isPending(row) ? "–" : totPct(row) != null ? `${totPct(row)}%` : "–"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
                Total % = PL review + attendance − late deductions (max 12 pts)
              </div>
            </div>
          </div>
        )
      })()}

      {/* View Report Modal */}
      {viewReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setViewReport(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: "min(1100px, 95vw)", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                  {format(new Date(viewReport.weekStart), "MMM d")} – {format(new Date(viewReport.weekEnd), "MMM d, yyyy")}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <StatusBadge status={viewReport.status} />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{(viewReport.totalHours ?? 0).toFixed(1)} hours total</span>
                </div>
              </div>
              <button onClick={() => setViewReport(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Task breakdown — Days as rows, Categories as columns */}
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 80, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Day</th>
                      {CATEGORIES.map(cat => (
                        <th key={cat.key} style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 90 }}>{cat.label}</th>
                      ))}
                      <th style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 70, position: "sticky", right: 0, background: "var(--muted)", zIndex: 2 }}>Daily Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_LIST.map((day, i) => {
                      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
                      const td = viewReport.taskDescriptions as any
                      const getCellMins = (cat: typeof CATEGORIES[0]) => {
                        const cell = td?.[cat.key]?.[day]
                        if (!cell) return 0
                        if (Array.isArray(cell)) return cell.reduce((s: number, r: any) => s + parseMinutes(r.minutes ?? ""), 0)
                        return Math.round((parseFloat(cell.hours || "0") || 0) * 60)
                      }
                      const dayTotalMins = CATEGORIES.reduce((s, cat) => s + getCellMins(cat), 0)
                      return (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{dayLabel}</td>
                          {CATEGORIES.map(cat => {
                            const cell = td?.[cat.key]?.[day]
                            const mins = getCellMins(cat)
                            if (Array.isArray(cell)) {
                              const tasks = cell.filter((r: any) => r.text?.trim())
                              return (
                                <td key={cat.key} style={{ padding: "6px 8px", fontSize: 11, verticalAlign: "top" }}>
                                  {tasks.length > 0 ? (
                                    <>
                                      {tasks.map((r: any, idx: number) => <div key={idx} style={{ marginBottom: 2, lineHeight: 1.4 }}>{r.text}</div>)}
                                      {mins > 0 && <div style={{ fontWeight: 700, color: "var(--primary)", marginTop: 2 }}>{fmtMinutes(mins)}</div>}
                                    </>
                                  ) : <span style={{ color: "var(--border)" }}>—</span>}
                                </td>
                              )
                            }
                            return (
                              <td key={cat.key} style={{ padding: "6px 8px", fontSize: 11, verticalAlign: "top" }}>
                                {cell?.tasks && <div style={{ marginBottom: 2, color: "var(--foreground)", lineHeight: 1.4 }}>{cell.tasks}</div>}
                                {mins > 0 && <div style={{ fontWeight: 700, color: "var(--primary)" }}>{fmtMinutes(mins)}</div>}
                                {!cell?.tasks && !mins && <span style={{ color: "var(--border)" }}>—</span>}
                              </td>
                            )
                          })}
                          <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--primary)", verticalAlign: "middle", position: "sticky", right: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>
                            {dayTotalMins > 0 ? fmtMinutes(dayTotalMins) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Category totals row */}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "var(--muted)", position: "sticky", bottom: 0, zIndex: 2 }}>
                      <td style={{ padding: "8px 12px", fontWeight: 800, fontSize: 12, position: "sticky", left: 0, background: "var(--muted)", zIndex: 3 }}>Total</td>
                      {CATEGORIES.map(cat => {
                        const td = viewReport.taskDescriptions as any
                        const catTotMins = DAYS_LIST.reduce((s, d) => {
                          const cell = td?.[cat.key]?.[d]
                          if (!cell) return s
                          if (Array.isArray(cell)) return s + cell.reduce((cs: number, r: any) => cs + parseMinutes(r.minutes ?? ""), 0)
                          return s + Math.round((parseFloat(cell.hours || "0") || 0) * 60)
                        }, 0)
                        return (
                          <td key={cat.key} style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)" }}>
                            {catTotMins > 0 ? fmtMinutes(catTotMins) : "—"}
                          </td>
                        )
                      })}
                      <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 900, fontSize: 13, color: "var(--primary)", position: "sticky", right: 0, background: "var(--muted)" }}>
                        {(viewReport.totalHours ?? 0).toFixed(1)}h
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Daily Reflections (from new field) */}
              {viewReport.dailyReflections && Object.values(viewReport.dailyReflections as Record<string, string>).some(v => v) && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily Reflections</p>
                  <div className="reflections-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                    {REFLECTION_DAYS.map(({ key, label }) => {
                      const text = (viewReport.dailyReflections as Record<string, string>)[key]
                      return (
                        <div key={key} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{text || <span style={{ color: "var(--border)", fontStyle: "italic" }}>—</span>}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Legacy personal reflection */}
              {!viewReport.dailyReflections && viewReport.personalReflection && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal Reflections</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, background: "var(--muted)", borderRadius: 8, padding: "12px 14px" }}>{viewReport.personalReflection}</p>
                </div>
              )}

              {/* General Reflection */}
              {viewReport.generalReflection && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>General Reflection</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, background: "var(--muted)", borderRadius: 8, padding: "12px 14px" }}>{viewReport.generalReflection}</p>
                </div>
              )}

              {/* Reviewer Feedback */}
              {(viewReport.reviewers?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reviewer Feedback</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {viewReport.reviewers.map((rv: any) => {
                      const plScore = (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
                      const rated = rv.productivityRating !== null
                      return (
                        <div key={rv.id} style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>
                              {rv.reviewer?.firstName} {rv.reviewer?.lastName}
                            </span>
                            {rv.isPrimary && (
                              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA", fontWeight: 700 }}>Primary</span>
                            )}
                            {rated && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginLeft: "auto" }}>
                                PL Score: {Math.round((plScore / 9) * 100)}%
                              </span>
                            )}
                          </div>
                          {rated ? (
                            <div style={{ display: "flex", gap: 12, marginBottom: rv.comment ? 8 : 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                              <span>Productivity: <strong>{rv.productivityRating}/3</strong></span>
                              <span>L&D: <strong>{rv.ldRating}/3</strong></span>
                              <span>Reflections: <strong>{rv.reflectionsRating}/3</strong></span>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Awaiting feedback…</p>
                          )}
                          {rv.comment && <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{rv.comment}</p>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Attendance score */}
                  {viewReport.attendanceRating !== null && (
                    <div style={{ marginTop: 10, background: "#F0FDF4", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Attendance Score:</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: "#16A34A" }}>{Math.round((viewReport.attendanceRating / 3) * 100)}%</span>
                      {viewReport.attendanceComment && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{viewReport.attendanceComment}</span>}
                    </div>
                  )}

                  {/* Total score */}
                  {viewReport.totalScore !== undefined && viewReport.productivityRating !== null && (
                    <div style={{ marginTop: 10, background: "var(--primary)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Total Score:</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "white" }}>
                        {viewReport.attendanceRating !== null
                          ? `${Math.round((viewReport.totalScore / 12) * 100)}%`
                          : "Attendance pending"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile responsiveness for the intern-report page only */}
      <style>{`
        @media (max-width: 899px) {
          .intern-report-page { padding: 16px !important; }
          .intern-report-page .reflections-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
          }
        }
        @media (max-width: 540px) {
          .intern-report-page .reflections-grid {
            grid-template-columns: 1fr !important;
          }
          .intern-report-page .tab-bar {
            max-width: 100% !important;
            overflow-x: auto !important;
          }
        }
      `}</style>
    </div>
  )
}
