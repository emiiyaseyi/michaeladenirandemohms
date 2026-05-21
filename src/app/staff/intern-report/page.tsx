"use client"
import { useState, useEffect, useRef } from "react"
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Eye, X, Search, Users } from "lucide-react"
import { format } from "date-fns"

const CATEGORIES = [
  { key: "mainProject",     hoursKey: "mainProjectHours",    label: "Main Project" },
  { key: "consulting",      hoursKey: "consultingHours",     label: "Consulting" },
  { key: "specialProject",  hoursKey: "specialProjectHours", label: "Special Project" },
  { key: "training",        hoursKey: "trainingHours",       label: "Training" },
  { key: "newBusiness",     hoursKey: "newBusinessHours",    label: "New Business" },
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

const initEntries = (): Record<string, Record<DayKey, {tasks: string, hours: string}>> =>
  Object.fromEntries(CATEGORIES.map(c => [
    c.key,
    Object.fromEntries(DAYS_LIST.map(d => [d, { tasks: "", hours: "" }])) as Record<DayKey, {tasks: string, hours: string}>
  ]))

type Settings = {
  submissionDay: number; openHour: number; lateHour: number; closeHour: number;
  lateDeduction: number; lateDeductionSunday: number; warningThresholdMinutes: number;
}

const DEFAULTS: Settings = {
  submissionDay: 5, openHour: 16, lateHour: 20, closeHour: 24,
  lateDeduction: 2, lateDeductionSunday: 3, warningThresholdMinutes: 15,
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
const TESTING_ALWAYS_OPEN = true

function computePhase(cfg: Settings, nowWat: Date): Phase {
  if (TESTING_ALWAYS_OPEN) {
    // Fake an "ontime" phase with a far-future late marker so the countdown
    // shows a big positive number and nothing in the UI thinks we're closed.
    const fakeLate = new Date(nowWat.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { kind: "ontime", ms: fakeLate.getTime() - nowWat.getTime(), label: "Testing — window always open" }
  }
  // nowWat is a Date shifted by +1hr from UTC so that getUTC* methods return WAT values
  const day = nowWat.getUTCDay() // 0=Sun … 5=Fri … 6=Sat
  const FRI = cfg.submissionDay
  const SAT = (FRI + 1) % 7
  const SUN = (FRI + 2) % 7

  // Build a Date in WAT-shifted space for today at HH:00 WAT
  const todayAt = (h: number) => {
    const d = new Date(nowWat)
    d.setUTCHours(h, 0, 0, 0)
    return d
  }
  const msTo = (target: Date) => target.getTime() - nowWat.getTime()

  if (day === FRI) {
    const openAt = todayAt(cfg.openHour)
    const lateAt = todayAt(cfg.lateHour)
    const closeFridayAt = todayAt(24)
    if (nowWat < openAt) {
      return { kind: "closed_before", ms: msTo(openAt), label: `Opens at ${hourLabel(cfg.openHour)} WAT` }
    }
    const warningStart = new Date(lateAt.getTime() - cfg.warningThresholdMinutes * 60 * 1000)
    if (nowWat < warningStart) return { kind: "ontime",  ms: msTo(lateAt), label: "On-time" }
    if (nowWat < lateAt)        return { kind: "warning", ms: msTo(lateAt), label: `Last ${cfg.warningThresholdMinutes} min!` }
    return { kind: "late_friday", ms: msTo(closeFridayAt) }
  }

  if (day === SAT) {
    const tomorrowMidnight = todayAt(24)
    return { kind: "late_saturday", ms: msTo(tomorrowMidnight) }
  }

  if (day === SUN) {
    const tomorrowMidnight = todayAt(24)
    return { kind: "late_sunday", ms: msTo(tomorrowMidnight) }
  }

  // Mon-Thu — next Friday at openHour
  const daysUntilFri = ((FRI - day + 7) % 7) || 7
  const next = new Date(nowWat)
  next.setUTCDate(nowWat.getUTCDate() + daysUntilFri)
  next.setUTCHours(cfg.openHour, 0, 0, 0)
  return { kind: "closed_before", ms: msTo(next), label: `Next window: ${DAYS[FRI]} ${hourLabel(cfg.openHour)} WAT` }
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
      subtitle = `Opens in ${fmtRemaining(phase.ms)}`
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
      title = "LATE — submit before midnight"
      subtitle = `${fmtRemaining(phase.ms)} left (no deduction yet)`
      break
    case "late_saturday":
      bg = "#FEE2E2"; color = "#DC2626"; icon = "⏰"
      title = `Saturday — −${cfg.lateDeduction} pts`
      subtitle = `Window closes Sunday midnight • ${fmtRemaining(phase.ms)} left today`
      break
    case "late_sunday":
      bg = "#FEE2E2"; color = "#DC2626"; icon = "🔥"
      title = `Sunday — −${cfg.lateDeductionSunday} pts • FINAL DAY`
      subtitle = `${fmtRemaining(phase.ms)} until window closes`
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
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
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
      {phase.kind !== "closed_after" && (
        <div style={{
          fontSize: 38, fontWeight: 900, color, fontVariantNumeric: "tabular-nums",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "0.02em",
        }}>
          {phase.kind === "closed_before" ? fmtRemaining(phase.ms)
            : fmtRemaining(phase.ms)}
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

export default function InternReportPage() {
  const [cfg, setCfg] = useState<Settings>(DEFAULTS)
  const [entries, setEntries] = useState<Record<string, Record<DayKey, {tasks: string, hours: string}>>>(initEntries())
  const [dailyReflections, setDailyReflections] = useState<Record<string, string>>({ Mon: "", Tue: "", Wed: "", Thu: "", Fri: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState("")
  const [submitOk, setSubmitOk] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewReport, setViewReport] = useState<any | null>(null)
  const [window, setWindow] = useState(() => computeWindow(DEFAULTS))

  const [projectLead, setProjectLead] = useState<{ id: string; name: string } | null>(null)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [extraReviewerIds, setExtraReviewerIds] = useState<string[]>([])
  const [reviewerSearch, setReviewerSearch] = useState("")
  const [reviewerDropOpen, setReviewerDropOpen] = useState(false)
  const reviewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/settings/intern-reports")
      .then(r => r.json())
      .then(d => { setCfg(d); setWindow(computeWindow(d)) })
      .catch(() => {})
    fetch("/api/intern-reports").then(r => r.json()).then(d => setReports(d.reports ?? [])).finally(() => setLoading(false))
    fetch("/api/self-service/profile").then(r => r.json()).then(d => {
      const pl = d.profile?.projectLead
      if (pl) setProjectLead({ id: pl.id, name: pl.name })
    }).catch(() => {})
    fetch("/api/intern-reports/reviewers").then(r => r.json()).then(d => setAllEmployees(d.employees ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => setWindow(computeWindow(cfg)), 30_000)
    return () => clearInterval(t)
  }, [cfg])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!reviewerRef.current?.contains(e.target as Node)) setReviewerDropOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const setEntry = (catKey: string, day: DayKey, field: "tasks"|"hours", val: string) =>
    setEntries(e => ({ ...e, [catKey]: { ...e[catKey], [day]: { ...e[catKey][day], [field]: val } } }))

  const catTotal = (catKey: string) =>
    DAYS_LIST.reduce((s, d) => s + (parseFloat(entries[catKey]?.[d]?.hours || "0") || 0), 0)

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

  const wat = new Date(new Date().getTime() + 60 * 60 * 1000)
  const day = wat.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const weekMon = new Date(wat); weekMon.setDate(wat.getDate() + diffToMonday); weekMon.setHours(0,0,0,0)
  const weekFri = new Date(weekMon); weekFri.setDate(weekMon.getDate() + 4)
  const weekLabel = `${format(weekMon, "MMM d")} – ${format(weekFri, "MMM d, yyyy")}`

  const thisWeekReport = reports.find(r => {
    const ws = new Date(r.weekStart); ws.setHours(0,0,0,0)
    const wm = new Date(weekMon); wm.setHours(0,0,0,0)
    return ws.getTime() === wm.getTime()
  })

  const handleSubmit = async () => {
    if (!window.open) return
    setSubmitting(true); setSubmitErr("")
    const hoursPayload = Object.fromEntries(CATEGORIES.map(c => [c.hoursKey, catTotal(c.key)]))
    const taskDescriptions = Object.fromEntries(CATEGORIES.map(c => [c.key, entries[c.key]]))
    const res = await fetch("/api/intern-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...hoursPayload, taskDescriptions, dailyReflections, extraReviewerIds }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitErr(d.error ?? "Failed to submit"); return }
    setSubmitOk(true)
    setReports(prev => [d.report, ...prev.filter(r => r.id !== d.report.id)])
  }

  const alreadySubmitted = submitOk
    || ["SUBMITTED","LATE","REVIEWED","ATTENDANCE_FILLED"].includes(thisWeekReport?.status)

  // Compulsory: every Mon-Fri daily reflection must be non-empty after trim
  const missingReflectionDays = REFLECTION_DAYS
    .filter(d => !dailyReflections[d.key] || dailyReflections[d.key].trim().length === 0)
    .map(d => d.label)
  const allReflectionsFilled = missingReflectionDays.length === 0

  const hasMissingPlaceholder = thisWeekReport?.status === "MISSING"

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

      {/* Big live countdown — phase + colour change as Friday → Sat → Sun progresses */}
      <CountdownBanner cfg={cfg} />

      {hasMissingPlaceholder && (
        <div style={{ padding: "14px 18px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, marginBottom: 20, color: "#991B1B", fontSize: 13 }}>
          <strong>Missed week record on file.</strong> A "Missing" placeholder was auto-created for this week (−3 pts). Ask an admin to clear it before you can submit retroactively.
        </div>
      )}

      {/* Submission Form — full width */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
        {/* Card header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>This Week's Report</h2>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{weekLabel}</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
            background: window.late ? "#FEF3C7" : window.open ? "#DCFCE7" : "#F3F4F6",
            color: window.late ? "#D97706" : window.open ? "#15803D" : "#6B7280",
            fontSize: 11, fontWeight: 700,
          }}>
            <Clock size={12} />
            {window.open ? (window.late ? "LATE" : "OPEN") : "CLOSED"}
          </div>
        </div>

        {alreadySubmitted ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <CheckCircle2 size={44} style={{ color: "#16a34a", margin: "0 auto 14px" }} />
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Report Submitted!</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your report for this week has been submitted. Check Past Reports below for status.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 24px 0" }}>

              {/* Task table */}
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 150, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Category</th>
                      {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => (
                        <th key={d} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 160 }}>{d}</th>
                      ))}
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 70 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat, i) => (
                      <tr key={cat.key} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, color: "var(--foreground)", verticalAlign: "middle", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{cat.label}</td>
                        {DAYS_LIST.map(day => (
                          <td key={day} style={{ padding: "6px 8px", verticalAlign: "top" }}>
                            <textarea
                              value={entries[cat.key][day].tasks}
                              onChange={e => setEntry(cat.key, day, "tasks", e.target.value)}
                              disabled={!window.open}
                              placeholder="Tasks…"
                              rows={2}
                              style={{ width: "100%", padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "none", boxSizing: "border-box", opacity: !window.open ? 0.6 : 1, marginBottom: 4 }}
                            />
                            <input
                              type="number" min={0} max={24} step={0.25}
                              value={entries[cat.key][day].hours}
                              onChange={e => setEntry(cat.key, day, "hours", e.target.value)}
                              disabled={!window.open}
                              placeholder="Hrs"
                              style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", opacity: !window.open ? 0.6 : 1, textAlign: "center" }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, fontSize: 13, color: "var(--primary)", verticalAlign: "middle" }}>
                          {catTotal(cat.key).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "var(--muted)" }}>
                      <td style={{ padding: "12px", fontWeight: 800, fontSize: 13, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Total Hours</td>
                      {DAYS_LIST.map(day => {
                        const dayTotal = CATEGORIES.reduce((s, c) => s + (parseFloat(entries[c.key][day].hours || "0") || 0), 0)
                        return <td key={day} style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 13, color: "var(--muted-foreground)" }}>{dayTotal > 0 ? dayTotal.toFixed(1) : "—"}</td>
                      })}
                      <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 900, fontSize: 16, color: "var(--primary)" }}>{totalHours.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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

              {/* Reviewers */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Users size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Who will review this report</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#EEF2FF", fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
                    {projectLead?.name ?? "Your Project Lead"}
                    <span style={{ fontSize: 10, fontWeight: 400, color: "#6366f1" }}>— required</span>
                  </div>
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
                      onChange={e => { setReviewerSearch(e.target.value); setReviewerDropOpen(true) }}
                      onFocus={() => setReviewerDropOpen(true)}
                      placeholder="Add another reviewer…"
                      style={{ border: "none", background: "transparent", fontSize: 12, outline: "none", flex: 1, color: "var(--foreground)" }}
                      disabled={!window.open}
                    />
                  </div>
                  {reviewerDropOpen && filteredReviewers.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
                      {filteredReviewers.slice(0, 20).map(emp => (
                        <div key={emp.id} onClick={() => addReviewer(emp)}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12 }}
                          onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                          onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                          <span style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</span>
                          {emp.jobTitle && <span style={{ color: "var(--muted-foreground)", marginLeft: 6 }}>{emp.jobTitle}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {window.late && (
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

            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
              {window.open && !allReflectionsFilled && (
                <span style={{ fontSize: 12, color: "#DC2626" }}>
                  Fill all 5 daily reflections to submit.
                </span>
              )}
              {window.open && hasMissingPlaceholder && (
                <span style={{ fontSize: 12, color: "#DC2626" }}>
                  Admin must clear the missing-report record first.
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={!window.open || submitting || !allReflectionsFilled || hasMissingPlaceholder}
                title={
                  !window.open ? "Submission window closed"
                    : hasMissingPlaceholder ? "Ask an admin to clear the missing-report record first"
                    : !allReflectionsFilled ? `Missing: ${missingReflectionDays.join(", ")}`
                    : "Submit Report"
                }
                style={{
                  padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8,
                  cursor: (window.open && !submitting && allReflectionsFilled && !hasMissingPlaceholder) ? "pointer" : "not-allowed",
                  fontSize: 14, fontWeight: 700, color: "white",
                  opacity: (!window.open || submitting || !allReflectionsFilled || hasMissingPlaceholder) ? 0.5 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit Report"}
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

      {/* View Report Modal */}
      {viewReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewReport(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 720, width: "100%", maxHeight: "88vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
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
              {/* Task breakdown table */}
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 130, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Category</th>
                      {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => (
                        <th key={d} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 140 }}>{d}</th>
                      ))}
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 60 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat, i) => {
                      const dayData = (viewReport.taskDescriptions as any)?.[cat.key]
                      const hasData = DAYS_LIST.some(d => dayData?.[d]?.tasks || dayData?.[d]?.hours)
                      const weekTotal = DAYS_LIST.reduce((s, d) => s + (parseFloat(dayData?.[d]?.hours || "0") || 0), 0)
                      const isLegacy = typeof dayData === "string"
                      const legacyHrs = viewReport[cat.hoursKey] ?? 0
                      if (!hasData && !isLegacy && !legacyHrs) return null
                      return (
                        <tr key={cat.key} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{cat.label}</td>
                          {isLegacy ? (
                            <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--foreground)" }} colSpan={5}>{dayData}</td>
                          ) : (
                            DAYS_LIST.map(day => {
                              const cell = dayData?.[day]
                              return (
                                <td key={day} style={{ padding: "8px 12px", fontSize: 11, verticalAlign: "top" }}>
                                  {cell?.tasks && <div style={{ marginBottom: 2, color: "var(--foreground)" }}>{cell.tasks}</div>}
                                  {cell?.hours && parseFloat(cell.hours) > 0 && <div style={{ fontWeight: 700, color: "var(--primary)" }}>{parseFloat(cell.hours).toFixed(1)}h</div>}
                                  {!cell?.tasks && !cell?.hours && <span style={{ color: "var(--border)" }}>—</span>}
                                </td>
                              )
                            })
                          )}
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--primary)", verticalAlign: "top" }}>
                            {isLegacy ? legacyHrs.toFixed(1) : weekTotal > 0 ? weekTotal.toFixed(1) : "—"}
                          </td>
                        </tr>
                      )
                    })}
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
        }
      `}</style>
    </div>
  )
}
