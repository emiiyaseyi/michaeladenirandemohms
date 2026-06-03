"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardList, ChevronLeft, ChevronRight, Send } from "lucide-react"
import { format } from "date-fns"

const CATEGORIES = [
  { key: "mainProject",    hoursKey: "mainProjectHours",    label: "Main Project" },
  { key: "consulting",     hoursKey: "consultingHours",     label: "Consulting" },
  { key: "specialProject", hoursKey: "specialProjectHours", label: "Special Project" },
  { key: "training",       hoursKey: "trainingHours",       label: "Training" },
  { key: "newBusiness",    hoursKey: "newBusinessHours",    label: "New Business" },
  { key: "reportingDoc",   hoursKey: "reportingDocHours",   label: "Reporting / Documentation" },
  { key: "operational",    hoursKey: "operationalHours",    label: "Operational Support" },
  { key: "research",       hoursKey: "researchHours",       label: "Research" },
  { key: "meetings",       hoursKey: "meetingsHours",       label: "Meetings" },
  { key: "community",      hoursKey: "communityHours",      label: "Community" },
  { key: "representation", hoursKey: "representationHours", label: "Representation" },
  { key: "selfDev",        hoursKey: "selfDevHours",        label: "Self Development" },
]

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
  const [feedback, setFeedback] = useState({ productivityRating: null as number | null, ldRating: null as number | null, reflectionsRating: null as number | null, tlComment: "" })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const now = new Date()

  // Week mode — use UTC dates to match how weekStart is stored on the server (getWeekBounds uses UTC)
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
    if (mode === "week") {
      const weekParam = currentMonday.toISOString()
      fetch(`/api/intern-reports/leaderboard?week=${encodeURIComponent(weekParam)}`)
        .then(r => r.json()).then(d => setLeaderboard(d.leaderboard ?? [])).catch(() => {})
    }
  }, [mode, weekOffset])

  const openReview = (id: string) => {
    const r = reports.find(r => r.id === id)
    if (r) {
      // Load this reviewer's own ratings if they exist (from their InternReportReviewer row)
      const myRecord = r.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
      setFeedback({
        productivityRating: myRecord?.productivityRating ?? r.productivityRating ?? null,
        ldRating: myRecord?.ldRating ?? r.ldRating ?? null,
        reflectionsRating: myRecord?.reflectionsRating ?? r.reflectionsRating ?? null,
        tlComment: myRecord?.comment ?? r.tlComment ?? "",
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
    const res = await fetch(`/api/intern-reports/${reviewingId}/tl-review`, {
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
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Intern Weekly Reports</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Review and provide feedback on your interns' weekly reports.</p>
      </div>

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
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 200, textAlign: "center" }}>{getPeriodLabel()}</span>
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
                {["Intern", "Job Title", "Total Hours", "Status", "Reviews", "TL Score", "Attendance", "Total Score", "Actions"].map(h => (
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
                const tlScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
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
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      {total > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: done === total ? "#15803d" : "var(--muted-foreground)" }}>
                          {done}/{total}
                        </span>
                      ) : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.productivityRating !== null ? `${Math.round((tlScore / 9) * 100)}%` : "–"}
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

      {/* Leaderboard panel (week mode only) */}
      {mode === "week" && leaderboard.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Weekly Leaderboard — {weekLabel}</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  {["Rank", "Intern", "Dept", "Hours", "TL Score", "Attendance", "Deduction", "Total"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row: any) => (
                  <tr key={row.employeeId} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: row.rank === 1 ? "#D97706" : "var(--muted-foreground)" }}>{row.rank ?? "–"}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "10px 14px", color: "var(--muted-foreground)" }}>{row.dept}</td>
                    <td style={{ padding: "10px 14px" }}>{row.totalHours?.toFixed(1)}h</td>
                    <td style={{ padding: "10px 14px" }}>{row.tlScorePct}%</td>
                    <td style={{ padding: "10px 14px", color: row.attendancePending ? "var(--muted-foreground)" : "inherit" }}>
                      {row.attendancePending ? "Pending" : `${row.attendanceScorePct}%`}
                    </td>
                    <td style={{ padding: "10px 14px", color: row.pointDeduction > 0 ? "#DC2626" : "var(--muted-foreground)" }}>
                      {row.pointDeduction > 0 ? `-${row.pointDeduction}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--primary)" }}>
                      {row.attendancePending ? "–" : `${row.totalScorePct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setReviewingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Team Lead Feedback</h3>
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
                  value={feedback.tlComment}
                  onChange={e => setFeedback(f => ({ ...f, tlComment: e.target.value }))}
                  rows={4}
                  placeholder="Write your overall feedback for the intern this week…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              {saveErr && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{saveErr}</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: "min(1100px, 95vw)", width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{viewingReport.employee?.firstName} {viewingReport.employee?.lastName}</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{format(new Date(viewingReport.weekStart), "MMM d")} – {format(new Date(viewingReport.weekEnd), "MMM d, yyyy")}</p>
              </div>
              <button onClick={() => setViewingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
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
                      <th style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 70 }}>Daily Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_LIST.map((day, i) => {
                      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
                      const td = viewingReport.taskDescriptions as any
                      const isLegacy = typeof td?.[CATEGORIES[0]?.key] === "string"
                      const dayTotal = CATEGORIES.reduce((s, cat) => s + (parseFloat(td?.[cat.key]?.[day]?.hours || "0") || 0), 0)
                      return (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{dayLabel}</td>
                          {CATEGORIES.map(cat => {
                            const cell = isLegacy ? null : td?.[cat.key]?.[day]
                            return (
                              <td key={cat.key} style={{ padding: "6px 8px", fontSize: 11, verticalAlign: "top" }}>
                                {cell?.tasks && <div style={{ marginBottom: 2, color: "var(--foreground)", lineHeight: 1.4 }}>{cell.tasks}</div>}
                                {cell?.hours && parseFloat(cell.hours) > 0 && <div style={{ fontWeight: 700, color: "var(--primary)" }}>{parseFloat(cell.hours).toFixed(1)}h</div>}
                                {!cell?.tasks && !cell?.hours && <span style={{ color: "var(--border)" }}>—</span>}
                              </td>
                            )
                          })}
                          <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--primary)", verticalAlign: "middle" }}>
                            {dayTotal > 0 ? dayTotal.toFixed(1) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "var(--muted)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 800, fontSize: 12, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Total</td>
                      {CATEGORIES.map(cat => {
                        const td = viewingReport.taskDescriptions as any
                        const catTot = DAYS_LIST.reduce((s, d) => s + (parseFloat(td?.[cat.key]?.[d]?.hours || "0") || 0), 0)
                        return (
                          <td key={cat.key} style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)" }}>
                            {catTot > 0 ? catTot.toFixed(1) : "—"}
                          </td>
                        )
                      })}
                      <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 900, fontSize: 13, color: "var(--primary)" }}>{(viewingReport.totalHours ?? 0).toFixed(1)}h</td>
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
                          <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{text || <span style={{ color: "var(--border)", fontStyle: "italic" }}>—</span>}</p>
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
                      const tlScore = (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
                      const rated = rv.productivityRating !== null
                      const isMe = rv.reviewerEmployeeId === currentEmployeeId
                      return (
                        <div key={rv.id} style={{ background: isMe ? "rgba(22,163,74,0.05)" : "var(--muted)", borderRadius: 10, padding: "12px 14px", border: isMe ? "1px solid rgba(22,163,74,0.2)" : "1px solid transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{rv.reviewer?.firstName} {rv.reviewer?.lastName}</span>
                            {rv.isPrimary && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA", fontWeight: 700 }}>Primary</span>}
                            {isMe && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>You</span>}
                            {rated && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginLeft: "auto" }}>TL: {Math.round((tlScore / 9) * 100)}%</span>}
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
      )}
    </div>
  )
}
