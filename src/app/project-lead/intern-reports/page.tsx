"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardList, ChevronLeft, ChevronRight, Send } from "lucide-react"
import { format } from "date-fns"

const CATEGORIES = [
  { key: "mainProject",    hoursKey: "mainProjectHours",    label: "Main Project" },
  { key: "specialProject", hoursKey: "specialProjectHours", label: "Special Project" },
  { key: "training",       hoursKey: "trainingHours",       label: "Training" },
  { key: "reportingDoc",   hoursKey: "reportingDocHours",   label: "Reporting / Documentation" },
  { key: "operational",    hoursKey: "operationalHours",    label: "Operational Support" },
  { key: "research",       hoursKey: "researchHours",       label: "Research" },
  { key: "meetings",       hoursKey: "meetingsHours",       label: "Meetings" },
  { key: "community",      hoursKey: "communityHours",      label: "Community" },
  { key: "representation", hoursKey: "representationHours", label: "Representation" },
  { key: "selfDev",        hoursKey: "selfDevHours",        label: "Self Development" },
]

function parseMinutes(raw: string): number {
  const s = (raw ?? "").trim().toLowerCase()
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
function getCellData(td: any, catKey: string, day: string): { tasks: string[]; totalMins: number } {
  const cell = td?.[catKey]?.[day]
  if (!cell) return { tasks: [], totalMins: 0 }
  if (Array.isArray(cell)) {
    const rows = cell as { text?: string; minutes?: string }[]
    return {
      tasks: rows.map(r => r.text?.trim()).filter(Boolean) as string[],
      totalMins: rows.reduce((s, r) => s + (r.text?.trim() ? parseMinutes(r.minutes ?? "") : 0), 0),
    }
  }
  return { tasks: cell.tasks ? [cell.tasks] : [], totalMins: parseFloat(cell.hours ?? "0") * 60 || 0 }
}

const DAYS_LIST = ["monday","tuesday","wednesday","thursday","friday"] as const

const RATING_CRITERIA: Record<string, { label: string; criteria: [number, string][] }> = {
  productivityRating: {
    label: "Productivity & Time Utilization",
    criteria: [
      [3, "30–40 Hours/Units (High Efficiency)"],
      [2, "20–30 Hours/Units (Standard)"],
      [1, "10–20 Hours/Units (Underutilized)"],
      [0, "0–10 Hours/Units (Critical Gap)"],
    ],
  },
  ldRating: {
    label: "Learning & Development",
    criteria: [
      [3, "Completed Learning Plan; clear impact on the business"],
      [2, "Good progress on Learning Plan; showing skill growth"],
      [1, "Minimum progress/effort on the Learning Plan"],
      [0, "No engagement with the Learning Plan"],
    ],
  },
  reflectionsRating: {
    label: "Reflections & Problem Solving",
    criteria: [
      [3, "Identified challenges and implemented effective solutions"],
      [2, "Identified challenges and proposed solutions (needed guidance)"],
      [1, "Mentioned challenges but offered no solutions"],
      [0, "No reflection or analysis provided"],
    ],
  },
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SUBMITTED: { label: "Submitted",  bg: "#DBEAFE", color: "#1D4ED8" },
    LATE:      { label: "Late",       bg: "#FEF3C7", color: "#D97706" },
    REVIEWED:  { label: "Reviewed",   bg: "#DCFCE7", color: "#15803D" },
    DRAFT:     { label: "Draft",      bg: "#F3F4F6", color: "#6B7280" },
    MISSING:   { label: "Missed",     bg: "#FEE2E2", color: "#DC2626" },
  }
  const s = map[status] ?? map.DRAFT
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

const getReviewDeadline = (weekStart: string | Date) => {
  const d = new Date(weekStart)
  return new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000)
}

function ReviewDeadlineBadge({ weekStart }: { weekStart: string }) {
  const deadline = getReviewDeadline(weekStart)
  const isOverdue = deadline < new Date()
  const dateStr = deadline.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: isOverdue ? "var(--danger-bg)" : "var(--warning-bg)",
      color: isOverdue ? "var(--accent)" : "var(--warning)",
      whiteSpace: "nowrap",
    }}>
      {isOverdue ? "OVERDUE" : `Due ${dateStr}`}
    </span>
  )
}

function RatingSelector({ value, onChange, disabled }: { value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2, 3].map(n => (
        <button key={n} type="button" onClick={() => !disabled && onChange(n)}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: `2px solid ${value === n ? "var(--primary)" : "var(--border)"}`,
            background: value === n ? "var(--primary)" : "var(--background)", color: value === n ? "white" : "var(--foreground)",
            fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
          }}>
          {n}
        </button>
      ))}
    </div>
  )
}

function firstMondayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month, 1)
  const day = d.getDay()
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  d.setDate(d.getDate() + diff)
  return d
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

const AVATAR_COLORS = ["#E11D48","#7C3AED","#1D4ED8","#0369A1","#0F766E","#15803D","#92400E","#B45309"]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function lbInitials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() }

export default function PLInternReportsPage() {
  const { data: session } = useSession()
  const currentEmployeeId = (session?.user as any)?.employeeId ?? ""

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"week" | "month" | "year">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState({ productivityRating: null as number | null, ldRating: null as number | null, reflectionsRating: null as number | null, plComment: "" })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [tab, setTab] = useState<"reports" | "leaderboard">("reports")
  const [lbWeekOffset, setLbWeekOffset] = useState(0)
  const [lbMode, setLbMode] = useState<"week" | "month" | "alltime">("week")
  const [lbDeptFilter, setLbDeptFilter] = useState("")
  const [lbMonthOffset, setLbMonthOffset] = useState(0)
  const [lbSearch, setLbSearch] = useState("")
  const [lbStatusFilter, setLbStatusFilter] = useState("")
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())

  const now = new Date()

  // Week mode - use UTC dates to match how weekStart is stored on the server (getWeekBounds uses UTC)
  const currentMonday = (() => {
    const d = new Date(now); d.setUTCHours(0,0,0,0)
    const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff + weekOffset * 7)
    return d
  })()
  const currentFriday = new Date(currentMonday); currentFriday.setUTCDate(currentMonday.getUTCDate() + 4)
  const weekLabel = `${format(currentMonday, "MMM d")} – ${format(currentFriday, "MMM d, yyyy")}`

  // Month mode
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const targetYear = targetMonthDate.getFullYear()
  const targetMonth = targetMonthDate.getMonth()
  const monthLabel = format(targetMonthDate, "MMMM yyyy")

  // Year mode
  const targetYearNum = now.getFullYear() - yearOffset
  const yearLabel = String(targetYearNum)

  const getPeriodLabel = () => {
    if (mode === "week") return weekLabel
    if (mode === "month") return monthLabel
    return yearLabel
  }

  const lbMonday = (() => {
    const d = new Date(now); d.setUTCHours(0,0,0,0)
    const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff + lbWeekOffset * 7)
    return d
  })()
  const lbFriday = new Date(lbMonday); lbFriday.setUTCDate(lbMonday.getUTCDate() + 4)
  const lbWeekLabel = `${format(lbMonday, "MMM d")} – ${format(lbFriday, "MMM d, yyyy")}`

  const buildFetchParams = (): URLSearchParams => {
    if (mode === "week") {
      return new URLSearchParams({ week: currentMonday.toISOString() })
    }
    if (mode === "month") {
      const from = firstMondayOfMonth(targetYear, targetMonth)
      const to = lastDayOfMonth(targetYear, targetMonth)
      return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    }
    // year
    const from = new Date(targetYearNum, 0, 1)
    const to = new Date(targetYearNum, 11, 31)
    return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  }

  const loadReports = async () => {
    setLoading(true)
    const params = buildFetchParams()
    const d = await fetch(`/api/intern-reports?${params}`).then(r => r.json())
    setReports(d.reports ?? [])
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [mode, weekOffset, monthOffset, yearOffset])

  useEffect(() => {
    let url = "/api/intern-reports/leaderboard"
    if (lbMode === "week") {
      const d = new Date(now); d.setUTCHours(0,0,0,0)
      const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day
      d.setUTCDate(d.getUTCDate() + diff + lbWeekOffset * 7)
      url += `?week=${encodeURIComponent(d.toISOString())}`
    } else if (lbMode === "month") {
      const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0)
      d.setMonth(d.getMonth() + lbMonthOffset)
      url += `?mode=month&from=${encodeURIComponent(d.toISOString())}`
    } else {
      url += `?mode=${lbMode}`
    }
    fetch(url).then(r => r.json()).then(d => setLeaderboard(d.leaderboard ?? [])).catch(() => {})
  }, [lbWeekOffset, lbMode, lbMonthOffset])

  const openReview = (id: string) => {
    const r = reports.find(r => r.id === id)
    if (r) {
      // Load this reviewer's own ratings if they exist (from their InternReportReviewer row)
      const myRecord = r.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
      setFeedback({
        productivityRating: myRecord?.productivityRating ?? r.productivityRating ?? null,
        ldRating: myRecord?.ldRating ?? r.ldRating ?? null,
        reflectionsRating: myRecord?.reflectionsRating ?? r.reflectionsRating ?? null,
        plComment: myRecord?.comment ?? r.plComment ?? "",
      })
      setReviewingId(id)
      setSaveErr("")
    }
  }

  const submitFeedback = async () => {
    if (!reviewingId) return
    if (feedback.productivityRating === null || feedback.ldRating === null || feedback.reflectionsRating === null) {
      setSaveErr("Please provide all three ratings before submitting."); return
    }
    setSaving(true); setSaveErr("")
    const res = await fetch(`/api/intern-reports/${reviewingId}/pl-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveErr(d.error ?? "Failed to save"); return }
    setReviewingId(null)
    loadReports()
  }

  const viewingReport = viewingId ? reports.find(r => r.id === viewingId) : null

  return (
    <div className="pl-intern-reports-page" style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Intern Weekly Reports</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Review and provide feedback on your interns' weekly reports.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 24, width: "fit-content" }}>
        {(["reports", "leaderboard"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "reports" && (<>

      {/* Mode selector + navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Mode buttons */}
        <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2 }}>
          {(["week", "month", "year"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === m ? "var(--card)" : "transparent", color: mode === m ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 20px" }}>
          <button onClick={() => {
            if (mode === "week") setWeekOffset(o => o - 1)
            else if (mode === "month") setMonthOffset(o => o + 1)
            else setYearOffset(o => o + 1)
          }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: "min(200px, 40vw)", textAlign: "center" }}>{getPeriodLabel()}</span>
          <button
            onClick={() => {
              if (mode === "week") setWeekOffset(o => Math.min(o + 1, 0))
              else if (mode === "month") setMonthOffset(o => Math.max(o - 1, 0))
              else setYearOffset(o => Math.max(o - 1, 0))
            }}
            disabled={(mode === "week" && weekOffset === 0) || (mode === "month" && monthOffset === 0) || (mode === "year" && yearOffset === 0)}
            style={{ background: "none", border: "none", cursor: ((mode === "week" && weekOffset === 0) || (mode === "month" && monthOffset === 0) || (mode === "year" && yearOffset === 0)) ? "not-allowed" : "pointer", color: ((mode === "week" && weekOffset === 0) || (mode === "month" && monthOffset === 0) || (mode === "year" && yearOffset === 0)) ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Intern", "Job Title", "Total Hours", "Status", "Reviews", "PL Score", "Attendance", "Total Score", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>No reports for this period.</td></tr>
              ) : reports.map(r => {
                const plScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
                const reviewers: any[] = r.reviewers ?? []
                const total = reviewers.length
                const done = reviewers.filter((rv: any) => rv.reviewedAt).length
                const myRecord = reviewers.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
                const iHaveReviewed = !!myRecord?.reviewedAt
                const canFillFeedback = (r.status === "SUBMITTED" || r.status === "LATE" || r.status === "REVIEWED") &&
                  (total === 0 || !!myRecord) && !iHaveReviewed
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {r.employee?.firstName} {r.employee?.lastName}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{r.employee?.jobTitle}</td>
                    <td style={{ padding: "12px 16px" }}>{(r.totalHours ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <StatusBadge status={r.status} />
                        {!iHaveReviewed && (r.status === "SUBMITTED" || r.status === "LATE") && (total === 0 || !!myRecord) && (
                          <ReviewDeadlineBadge weekStart={r.weekStart} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {total > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: done === total ? "#15803d" : "var(--muted-foreground)" }}>
                          {done}/{total}
                        </span>
                      ) : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.productivityRating !== null ? `${Math.round((plScore / 9) * 100)}%` : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.attendanceRating !== null ? `${Math.round((r.attendanceRating / 3) * 100)}%` : <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Pending</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.totalScore !== undefined && r.productivityRating !== null ? (
                        <strong style={{ color: "var(--primary)" }}>
                          {r.attendanceRating !== null ? `${Math.round((r.totalScore / 12) * 100)}%` : "Att. pending"}
                        </strong>
                      ) : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={() => setViewingId(r.id)}
                          style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          View
                        </button>
                        {iHaveReviewed ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Reviewed ✓</span>
                        ) : canFillFeedback ? (
                          <button onClick={() => openReview(r.id)}
                            style={{ padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 5 }}>
                            Fill Feedback
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: "rgba(255,255,255,0.25)", fontWeight: 700 }}>Required</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      {tab === "leaderboard" && (() => {
        const top3 = leaderboard.filter((r: any) => r.rank !== null).slice(0, 3)
        const ringColor = (rank: number) => rank === 1 ? "#F59E0B" : rank === 2 ? "#9CA3AF" : "#CD7C2F"
        const depts = [...new Set(leaderboard.map((r: any) => r.dept).filter(Boolean))] as string[]
        const lbMonthLabel = (() => { const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() + lbMonthOffset); return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) })()
        const filtered = leaderboard.filter((r: any) => {
          if (lbDeptFilter && r.dept !== lbDeptFilter) return false
          if (lbSearch && !r.name.toLowerCase().includes(lbSearch.toLowerCase())) return false
          if (lbStatusFilter && lbMode === "week" && r.status !== lbStatusFilter) return false
          return true
        })
        const tlPct = (row: any) => lbMode === "week" ? row.plScorePct : row.avgPlPct
        const attPct = (row: any) => lbMode === "week" ? row.attendanceScorePct : row.avgAttPct
        const totPct = (row: any) => lbMode === "week" ? row.totalScorePct : row.avgScorePct
        const isPending = (row: any) => row.attendancePending
        const curLbMonday = (() => {
          const d = new Date(now); d.setUTCHours(0,0,0,0)
          const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day
          d.setUTCDate(d.getUTCDate() + diff + lbWeekOffset * 7)
          return d
        })()
        const curLbFriday = new Date(curLbMonday); curLbFriday.setUTCDate(curLbMonday.getUTCDate() + 4)
        const curLbLabel = `${format(curLbMonday, "MMM d")} – ${format(curLbFriday, "MMM d, yyyy")}`
        return (
          <div>
            {/* Hero banner */}
            {top3.length > 0 && (
              <div style={{ background: "#15803D", borderRadius: 16, padding: "24px 28px", marginBottom: 16, color: "white", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Top Performers</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>{leaderboard.length} intern{leaderboard.length !== 1 ? "s" : ""} · {lbMode === "week" ? curLbLabel : lbMode === "month" ? lbMonthLabel : "All Time"}</div>
                </div>
                {(() => {
                  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
                  const visualCfg = [
                    { lift: 18, size: 46, ribbon: "#CBD5E1", medal: "#94A3B8", numCol: "#1E293B", pos: 2 },
                    { lift: 36, size: 56, ribbon: "#FCD34D", medal: "#F59E0B", numCol: "#78350F", pos: 1 },
                    { lift: 0,  size: 40, ribbon: "#C97B3A", medal: "#92400E", numCol: "#FEF3C7", pos: 3 },
                  ]
                  const ringCol = ["#9CA3AF", "#F59E0B", "#CD7C2F"]
                  return (
                    <div style={{ display: "flex", gap: 18, alignItems: "flex-end", paddingBottom: 4 }}>
                      {podiumOrder.map((row: any, vi: number) => {
                        const c = visualCfg[vi]
                        return (
                          <div key={row.employeeId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginBottom: c.lift }}>
                            <div style={{ width: c.size, height: c.size, borderRadius: "50%", background: avatarColor(row.name), border: `3px solid ${ringCol[vi]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(c.size * 0.3), fontWeight: 800, color: "white", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", flexShrink: 0 }}>
                              {lbInitials(row.name)}
                            </div>
                            <div style={{ width: 3, height: 14, background: c.ribbon, marginTop: 2 }} />
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: c.medal, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: c.numCol, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                              {c.pos}
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
            )}

            {/* Filter bar */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <input type="text" placeholder="Search intern..." value={lbSearch} onChange={e => setLbSearch(e.target.value)}
                style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--foreground)", outline: "none", minWidth: 160 }} />
              {depts.length > 1 && (
                <select value={lbDeptFilter} onChange={e => setLbDeptFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
                  <option value="">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
                {(["week","month","alltime"] as const).map(m => (
                  <button key={m} onClick={() => { setLbMode(m); setLbWeekOffset(0); setLbMonthOffset(0); setLbStatusFilter("") }}
                    style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: lbMode === m ? "var(--primary)" : "var(--card)", color: lbMode === m ? "white" : "var(--muted-foreground)" }}>
                    {m === "week" ? "Week" : m === "month" ? "Month" : "All Time"}
                  </button>
                ))}
              </div>
              {lbMode === "week" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px" }}>
                  <button onClick={() => setLbWeekOffset(o => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><ChevronLeft size={15} /></button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 130, textAlign: "center" }}>{curLbLabel}</span>
                  <button onClick={() => setLbWeekOffset(o => Math.min(o + 1, 0))} disabled={lbWeekOffset === 0} style={{ background: "none", border: "none", cursor: lbWeekOffset === 0 ? "not-allowed" : "pointer", color: lbWeekOffset === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}><ChevronRight size={15} /></button>
                </div>
              )}
              {lbMode === "month" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px" }}>
                  <button onClick={() => setLbMonthOffset(o => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><ChevronLeft size={15} /></button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 100, textAlign: "center" }}>{lbMonthLabel}</span>
                  <button onClick={() => setLbMonthOffset(o => Math.min(o + 1, 0))} disabled={lbMonthOffset === 0} style={{ background: "none", border: "none", cursor: lbMonthOffset === 0 ? "not-allowed" : "pointer", color: lbMonthOffset === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}><ChevronRight size={15} /></button>
                </div>
              )}
              {lbMode === "week" && (
                <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
                  {(["", "SUBMITTED", "LATE", "REVIEWED", "MISSING"] as const).map(s => (
                    <button key={s} onClick={() => setLbStatusFilter(s)}
                      style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: lbStatusFilter === s ? "var(--primary)" : "var(--card)", color: lbStatusFilter === s ? "white" : "var(--muted-foreground)" }}>
                      {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
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
                        {["Rank", "Member", "Dept", "🔥 Streak", "PL %", "Att %", "Deduction", "Total %"].map(h => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row: any) => {
                        const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null
                        return (
                          <tr key={row.employeeId} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={{ padding: "11px 14px", fontWeight: 700 }}>{medal ? <span style={{ fontSize: 15 }}>{medal}</span> : <span style={{ color: "var(--muted-foreground)" }}>{row.rank ?? "–"}</span>}</td>
                            <td style={{ padding: "11px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(row.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>{lbInitials(row.name)}</div>
                                <span style={{ fontWeight: 500 }}>{row.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: "11px 14px", color: "var(--muted-foreground)", fontSize: 12 }}>{row.dept}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 600 }}>{row.streak > 0 ? `${row.streak}w` : "–"}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 600 }}>{tlPct(row) != null ? `${tlPct(row)}%` : "–"}</td>
                            <td style={{ padding: "11px 14px", color: isPending(row) ? "var(--muted-foreground)" : "inherit" }}>{isPending(row) ? "Pending" : attPct(row) != null ? `${attPct(row)}%` : "–"}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 600, color: (lbMode === "week" ? row.pointDeduction : row.totalDeductions) > 0 ? "#DC2626" : "var(--muted-foreground)" }}>
                              {lbMode === "week"
                                ? (row.pointDeduction > 0 ? `-${row.pointDeduction}` : "0")
                                : (row.totalDeductions > 0 ? `-${row.totalDeductions}` : "0")}
                            </td>
                            <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--primary)" }}>{isPending(row) ? "–" : totPct(row) != null ? `${totPct(row)}%` : "–"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
                Scoring: PL Score (max 9 pts) + Attendance (max 3 pts) − Late deductions
              </div>
            </div>
          </div>
        )
      })()}

      {/* Review Modal */}
      {reviewingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setReviewingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Project Lead Feedback</h3>
              <button onClick={() => setReviewingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {Object.entries(RATING_CRITERIA).map(([key, { label, criteria }]) => (
                <div key={key} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</p>
                  <div style={{ marginBottom: 10 }}>
                    {criteria.map(([pts, desc]) => (
                      <div key={pts} style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 3 }}>
                        <strong>{pts} pts:</strong> {desc}
                      </div>
                    ))}
                  </div>
                  <RatingSelector
                    value={(feedback as any)[key]}
                    onChange={v => setFeedback(f => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Overall Comments and Feedback</label>
                <textarea
                  value={feedback.plComment}
                  onChange={e => setFeedback(f => ({ ...f, plComment: e.target.value }))}
                  rows={4}
                  placeholder="Write your overall feedback for the intern this week…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              {saveErr && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{saveErr}</div>}
            </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button onClick={() => setReviewingId(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitFeedback} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                <Send size={13} />{saving ? "Saving…" : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setViewingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: "min(1100px, 95vw)", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{viewingReport.employee?.firstName} {viewingReport.employee?.lastName}</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{format(new Date(viewingReport.weekStart), "MMM d")} – {format(new Date(viewingReport.weekEnd), "MMM d, yyyy")}</p>
              </div>
              <button onClick={() => setViewingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {/* Task breakdown - Days as rows, Categories as columns */}
              <div style={{ overflow: "auto", maxHeight: "min(55vh, 440px)", marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 95, position: "sticky", left: 0, top: 0, background: "var(--muted)", zIndex: 3, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>Day</th>
                      {CATEGORIES.map(cat => (
                        <th key={cat.key} style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 130, position: "sticky", top: 0, background: "var(--muted)", zIndex: 2 }}>{cat.label}</th>
                      ))}
                      <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 90, position: "sticky", right: 0, top: 0, background: "var(--muted)", zIndex: 3, boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>Daily Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_LIST.map((day, i) => {
                      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
                      const td = viewingReport.taskDescriptions as any
                      const dayTotalMins = CATEGORIES.reduce((s, cat) => s + getCellData(td, cat.key, day).totalMins, 0)
                      const rowBg = i % 2 === 0 ? "var(--card)" : "var(--muted)"
                      return (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, verticalAlign: "top", position: "sticky", left: 0, background: rowBg, zIndex: 1, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>{dayLabel}</td>
                          {CATEGORIES.map(cat => {
                            const { tasks, totalMins } = getCellData(td, cat.key, day)
                            const cellKey = `${cat.key}-${day}`
                            const isExpanded = expandedCells.has(cellKey)
                            const MAX_TASKS = 2
                            const visibleTasks = isExpanded ? tasks : tasks.slice(0, MAX_TASKS)
                            return (
                              <td key={cat.key} style={{ padding: "8px 10px", fontSize: 12, verticalAlign: "top" }}>
                                {tasks.length > 0 ? (
                                  <>
                                    {visibleTasks.map((t, idx) => <div key={idx} style={{ marginBottom: 3, lineHeight: 1.5 }}>{t}</div>)}
                                    {tasks.length > MAX_TASKS && (
                                      <button onClick={() => setExpandedCells(s => { const next = new Set(s); isExpanded ? next.delete(cellKey) : next.add(cellKey); return next })} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                                        {isExpanded ? "Less" : `+${tasks.length - MAX_TASKS} more`}
                                      </button>
                                    )}
                                    {totalMins > 0 && <div style={{ fontWeight: 700, color: "var(--primary)", marginTop: 3, fontSize: 11 }}>{fmtMinutes(totalMins)}</div>}
                                  </>
                                ) : <span style={{ color: "var(--border)" }}>-</span>}
                              </td>
                            )
                          })}
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 13, color: "var(--primary)", verticalAlign: "top", position: "sticky", right: 0, background: rowBg, zIndex: 1, boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>
                            {dayTotalMins > 0 ? fmtMinutes(dayTotalMins) : "-"}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "var(--muted)", position: "sticky", bottom: 0, zIndex: 2 }}>
                      <td style={{ padding: "10px 14px", fontWeight: 800, fontSize: 13, position: "sticky", left: 0, background: "var(--muted)", zIndex: 3, boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>Total</td>
                      {CATEGORIES.map(cat => {
                        const td = viewingReport.taskDescriptions as any
                        const catMins = DAYS_LIST.reduce((s, d) => s + getCellData(td, cat.key, d).totalMins, 0)
                        return <td key={cat.key} style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--muted-foreground)" }}>{catMins > 0 ? fmtMinutes(catMins) : "-"}</td>
                      })}
                      <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 900, fontSize: 13, color: "var(--primary)", position: "sticky", right: 0, background: "var(--muted)", boxShadow: "-2px 0 4px rgba(0,0,0,0.06)" }}>{(viewingReport.totalHours ?? 0).toFixed(1)}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Daily Reflections */}
              {viewingReport.dailyReflections && Object.values(viewingReport.dailyReflections as Record<string, string>).some(v => v) && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily Reflections</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                    {[{ key: "Mon", label: "Monday" }, { key: "Tue", label: "Tuesday" }, { key: "Wed", label: "Wednesday" }, { key: "Thu", label: "Thursday" }, { key: "Fri", label: "Friday" }].map(({ key, label }) => {
                      const text = (viewingReport.dailyReflections as Record<string, string>)[key]
                      return (
                        <div key={key} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{text || <span style={{ color: "var(--border)", fontStyle: "italic" }}>-</span>}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* General Reflection */}
              {viewingReport.generalReflection && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>General Reflection</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, background: "var(--muted)", borderRadius: 8, padding: "12px 14px" }}>{viewingReport.generalReflection}</p>
                </div>
              )}

              {/* Reviewer Feedback */}
              {(viewingReport.reviewers?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>All Reviewer Feedback</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {viewingReport.reviewers.map((rv: any) => {
                      const plScore = (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
                      const rated = rv.productivityRating !== null
                      const isMe = rv.reviewerEmployeeId === currentEmployeeId
                      return (
                        <div key={rv.id} style={{ background: isMe ? "rgba(22,163,74,0.05)" : "var(--muted)", borderRadius: 10, padding: "12px 14px", border: isMe ? "1px solid rgba(22,163,74,0.2)" : "1px solid transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{rv.reviewer?.firstName} {rv.reviewer?.lastName}</span>
                            {rv.isPrimary && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA", fontWeight: 700 }}>Primary</span>}
                            {isMe && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>You</span>}
                            {rated && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginLeft: "auto" }}>PL: {Math.round((plScore / 9) * 100)}%</span>}
                          </div>
                          {rated ? (
                            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--muted-foreground)", marginBottom: rv.comment ? 8 : 0 }}>
                              <span>Productivity: <strong>{rv.productivityRating}/3</strong></span>
                              <span>L&D: <strong>{rv.ldRating}/3</strong></span>
                              <span>Reflections: <strong>{rv.reflectionsRating}/3</strong></span>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>Awaiting feedback…</p>
                          )}
                          {rv.comment && <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{rv.comment}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 899px) {
          .pl-intern-reports-page { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}
