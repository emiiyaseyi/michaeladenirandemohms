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
type DayKey = typeof DAYS_LIST[number]

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

  const now = new Date()

  // Week mode
  const currentMonday = (() => {
    const d = new Date(now); d.setHours(0,0,0,0)
    const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff + weekOffset * 7)
    return d
  })()
  const currentFriday = new Date(currentMonday); currentFriday.setDate(currentMonday.getDate() + 4)
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

  const openReview = (id: string) => {
    const r = reports.find(r => r.id === id)
    if (r) {
      setFeedback({ productivityRating: r.productivityRating ?? null, ldRating: r.ldRating ?? null, reflectionsRating: r.reflectionsRating ?? null, tlComment: r.tlComment ?? "" })
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
                      {r.productivityRating !== null ? `${tlScore} / 9` : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.attendanceRating !== null ? `${r.attendanceRating} / 3` : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.totalScore !== undefined && r.productivityRating !== null ? (
                        <strong style={{ color: "var(--primary)" }}>{r.totalScore} / 12</strong>
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
                            style={{ padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                            Fill Feedback
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 600, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{viewingReport.employee?.firstName} {viewingReport.employee?.lastName}</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{format(new Date(viewingReport.weekStart), "MMM d")} – {format(new Date(viewingReport.weekEnd), "MMM d, yyyy")}</p>
              </div>
              <button onClick={() => setViewingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
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
                      const dayData = (viewingReport.taskDescriptions as any)?.[cat.key]
                      const hasData = DAYS_LIST.some(d => dayData?.[d]?.tasks || dayData?.[d]?.hours)
                      const weekTotal = DAYS_LIST.reduce((s, d) => s + (parseFloat(dayData?.[d]?.hours || "0") || 0), 0)
                      const isLegacy = typeof dayData === "string"
                      const legacyHrs = viewingReport[cat.hoursKey] ?? 0
                      if (!hasData && !isLegacy && !legacyHrs) return null
                      return (
                        <tr key={cat.key} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{cat.label}</td>
                          {isLegacy ? (
                            <>
                              <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--foreground)" }} colSpan={5}>{dayData}</td>
                            </>
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
              {viewingReport.personalReflection && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)" }}>PERSONAL REFLECTIONS</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>{viewingReport.personalReflection}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
