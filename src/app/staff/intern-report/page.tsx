"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { ClipboardList, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Eye, X, Search, Users } from "lucide-react"
import { format, startOfWeek, addDays } from "date-fns"

const HOUR_ROWS = [
  { key: "mainProjectHours", label: "Main Project" },
  { key: "consultingHours", label: "Consulting" },
  { key: "specialProjectHours", label: "Special Project" },
  { key: "trainingHours", label: "Training" },
  { key: "newBusinessHours", label: "New Business" },
  { key: "reportingDocHours", label: "Reporting / Documentation" },
  { key: "operationalHours", label: "Operational Support" },
  { key: "researchHours", label: "Research" },
  { key: "meetingsHours", label: "Meetings" },
  { key: "communityHours", label: "Community" },
  { key: "representationHours", label: "Representation" },
  { key: "selfDevHours", label: "Self Development" },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    DRAFT:     { label: "Draft",     bg: "#F3F4F6", color: "#6B7280" },
    SUBMITTED: { label: "Submitted", bg: "#DBEAFE", color: "#1D4ED8" },
    LATE:      { label: "Late",      bg: "#FEF3C7", color: "#D97706" },
    REVIEWED:  { label: "Reviewed",  bg: "#DCFCE7", color: "#15803D" },
  }
  const s = map[status] ?? map.DRAFT
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

function countdownTo4pm(): { text: string; open: boolean; late: boolean } {
  const now = new Date()
  // Simulate WAT = UTC+1
  const wat = new Date(now.getTime() + 60 * 60 * 1000)
  const day = wat.getDay()
  const hours = wat.getHours()
  const minutes = wat.getMinutes()

  if (day !== 5) {
    const daysUntilFriday = (5 - day + 7) % 7 || 7
    return { text: `Opens in ${daysUntilFriday} day${daysUntilFriday !== 1 ? "s" : ""} (Friday 4:00 PM WAT)`, open: false, late: false }
  }
  if (hours < 16) {
    const minsLeft = (16 - hours - 1) * 60 + (60 - minutes)
    const h = Math.floor(minsLeft / 60); const m = minsLeft % 60
    return { text: `Submission opens in ${h}h ${m}m`, open: false, late: false }
  }
  if (hours >= 20) {
    return { text: "Late submission (after 8:00 PM WAT) — 2 points will be deducted", open: true, late: true }
  }
  return { text: "Submission window is open (4:00 PM – 8:00 PM WAT)", open: true, late: false }
}

export default function InternReportPage() {
  const [hours, setHours] = useState<Record<string, string>>(Object.fromEntries(HOUR_ROWS.map(r => [r.key, ""])))
  const [reflection, setReflection] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState("")
  const [submitOk, setSubmitOk] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewReport, setViewReport] = useState<any | null>(null)
  const [window, setWindow] = useState(countdownTo4pm())

  // Reviewer state
  const [projectLead, setProjectLead] = useState<{ id: string; name: string } | null>(null)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [extraReviewerIds, setExtraReviewerIds] = useState<string[]>([])
  const [reviewerSearch, setReviewerSearch] = useState("")
  const [reviewerDropOpen, setReviewerDropOpen] = useState(false)
  const reviewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/intern-reports").then(r => r.json()).then(d => setReports(d.reports ?? [])).finally(() => setLoading(false))
    // Fetch profile for PL info
    fetch("/api/self-service/profile").then(r => r.json()).then(d => {
      const emp = d.employee
      if (emp?.projectLead) {
        setProjectLead({ id: emp.projectLead.id, name: emp.projectLead.name ?? `${emp.projectLead.firstName ?? ""} ${emp.projectLead.lastName ?? ""}`.trim() })
      }
    }).catch(() => {})
    // Fetch all reviewable employees
    fetch("/api/intern-reports/reviewers").then(r => r.json()).then(d => setAllEmployees(d.employees ?? [])).catch(() => {})
    const t = setInterval(() => setWindow(countdownTo4pm()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!reviewerRef.current?.contains(e.target as Node)) setReviewerDropOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const addReviewer = (emp: any) => {
    if (extraReviewerIds.includes(emp.id)) return
    setExtraReviewerIds(ids => [...ids, emp.id])
    setReviewerSearch("")
    setReviewerDropOpen(false)
  }

  const removeReviewer = (id: string) => setExtraReviewerIds(ids => ids.filter(i => i !== id))

  const filteredReviewers = allEmployees.filter(e => {
    if (extraReviewerIds.includes(e.id)) return false
    if (projectLead && e.id === projectLead.id) return false
    const q = reviewerSearch.toLowerCase()
    return !q || `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""} ${e.department?.name ?? ""}`.toLowerCase().includes(q)
  })

  const totalHours = HOUR_ROWS.reduce((s, r) => s + (parseFloat(hours[r.key]) || 0), 0)

  // Current week
  const now = new Date()
  const wat = new Date(now.getTime() + 60 * 60 * 1000)
  const day = wat.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const weekMon = new Date(wat); weekMon.setDate(wat.getDate() + diffToMonday); weekMon.setHours(0,0,0,0)
  const weekFri = new Date(weekMon); weekFri.setDate(weekMon.getDate() + 4)
  const weekLabel = `${format(weekMon, "MMM d")} – ${format(weekFri, "MMM d, yyyy")}`

  // Check if already submitted this week
  const thisWeekReport = reports.find(r => {
    const ws = new Date(r.weekStart); ws.setHours(0,0,0,0)
    const wm = new Date(weekMon); wm.setHours(0,0,0,0)
    return ws.getTime() === wm.getTime()
  })

  const handleSubmit = async () => {
    if (!window.open) return
    setSubmitting(true); setSubmitErr("")
    const payload = Object.fromEntries(HOUR_ROWS.map(r => [r.key, parseFloat(hours[r.key]) || 0]))
    const res = await fetch("/api/intern-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, personalReflection: reflection, extraReviewerIds }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitErr(d.error ?? "Failed to submit"); return }
    setSubmitOk(true)
    setReports(prev => [d.report, ...prev.filter(r => r.id !== d.report.id)])
  }

  const fi: React.CSSProperties = {
    width: 80, padding: "7px 10px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", textAlign: "center" as const,
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Weekly Report</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Submit your weekly hours and reflections every Friday between 4:00 PM and 8:00 PM WAT.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: Submission Form */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>This Week&apos;s Report</h2>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{weekLabel}</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              background: window.late ? "#FEF3C7" : window.open ? "#DCFCE7" : "#F3F4F6",
              color: window.late ? "#D97706" : window.open ? "#15803D" : "#6B7280",
              fontSize: 11, fontWeight: 700,
            }}>
              <Clock size={12} />
              {window.open ? (window.late ? "LATE" : "OPEN") : "CLOSED"}
            </div>
          </div>

          {submitOk || thisWeekReport?.status === "SUBMITTED" || thisWeekReport?.status === "LATE" || thisWeekReport?.status === "REVIEWED" ? (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <CheckCircle2 size={40} style={{ color: "#16a34a", margin: "0 auto 12px" }} />
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Report Submitted!</p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your report for this week has been submitted. Check the Past Reports panel for status.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, padding: "8px 12px", background: window.late ? "#FEF3C7" : window.open ? "#DCFCE7" : "#F3F4F6", borderRadius: 8 }}>
                  {window.text}
                </p>

                <div style={{ marginBottom: 20 }}>
                  {HOUR_ROWS.map(row => (
                    <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13 }}>{row.label}</span>
                      <input
                        type="number" min={0} max={40} step={0.5}
                        value={hours[row.key]}
                        onChange={e => setHours(h => ({ ...h, [row.key]: e.target.value }))}
                        style={fi}
                        disabled={!window.open}
                        placeholder="0"
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", fontWeight: 700 }}>
                    <span style={{ fontSize: 13 }}>Total Hours</span>
                    <span style={{ fontSize: 15, color: "var(--primary)" }}>{totalHours.toFixed(1)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Personal Reflections for the Week</label>
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    rows={4}
                    disabled={!window.open}
                    placeholder="What went well? What challenges did you face? What did you learn?"
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>

                {submitErr && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginBottom: 12 }}>
                    <AlertCircle size={14} />{submitErr}
                  </div>
                )}

                {window.late && (
                  <div style={{ padding: "8px 12px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#92400E", marginBottom: 12 }}>
                    Late submission detected. 2 points will be automatically deducted from your score.
                  </div>
                )}

                {/* Report Recipients Panel */}
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Users size={14} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Who will review this report</span>
                  </div>

                  {/* Project Lead (auto, non-removable) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#EEF2FF", fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
                      {projectLead?.name ?? "Your Project Lead"}
                      <span style={{ fontSize: 10, fontWeight: 400, color: "#6366f1" }}>— required</span>
                    </div>
                  </div>

                  {/* Selected extra reviewers */}
                  {extraReviewerIds.map(revId => {
                    const emp = allEmployees.find(e => e.id === revId)
                    if (!emp) return null
                    return (
                      <div key={revId} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "var(--muted)", fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6 }}>
                        {emp.firstName} {emp.lastName}
                        <button onClick={() => removeReviewer(revId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted-foreground)", display: "flex" }}><X size={12} /></button>
                      </div>
                    )
                  })}

                  {/* Search/add reviewer */}
                  <div ref={reviewerRef} style={{ position: "relative", marginTop: 8 }}>
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
              </div>
              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSubmit}
                  disabled={!window.open || submitting}
                  style={{
                    padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8,
                    cursor: window.open && !submitting ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 700, color: "white",
                    opacity: !window.open || submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? "Submitting…" : "Submit Report"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Past Reports */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Past Reports</h2>
          </div>
          {loading ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No reports submitted yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--muted)" }}>
                    {["Week", "Status", "Hours", "Score", ""].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        {format(new Date(r.weekStart), "MMM d")} – {format(new Date(r.weekEnd), "MMM d")}
                      </td>
                      <td style={{ padding: "10px 16px" }}><StatusBadge status={r.status} /></td>
                      <td style={{ padding: "10px 16px" }}>{r.totalHours.toFixed(1)}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {r.status === "REVIEWED" ? <strong style={{ color: "var(--primary)" }}>{r.totalScore} / 12</strong> : "–"}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <button onClick={() => setViewReport(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Report Modal */}
      {viewReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewReport(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>
                Report: {format(new Date(viewReport.weekStart), "MMM d")} – {format(new Date(viewReport.weekEnd), "MMM d, yyyy")}
              </h3>
              <button onClick={() => setViewReport(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 20 }}>
                {HOUR_ROWS.map(row => (
                  <div key={row.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span>{row.label}</span>
                    <strong>{(viewReport[row.key] ?? 0).toFixed(1)}h</strong>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 700, fontSize: 14 }}>
                  <span>Total Hours</span>
                  <span style={{ color: "var(--primary)" }}>{(viewReport.totalHours ?? 0).toFixed(1)}h</span>
                </div>
              </div>
              {viewReport.personalReflection && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)" }}>PERSONAL REFLECTIONS</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>{viewReport.personalReflection}</p>
                </div>
              )}
              {viewReport.status === "REVIEWED" && (
                <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)" }}>TEAM LEAD FEEDBACK</p>
                  {[
                    ["Productivity & Time Utilization", viewReport.productivityRating],
                    ["Learning & Development", viewReport.ldRating],
                    ["Reflections & Problem Solving", viewReport.reflectionsRating],
                    ["Attendance & Punctuality", viewReport.attendanceRating],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                      <span>{label}</span>
                      <strong>{val !== null && val !== undefined ? `${val} / 3` : "–"}</strong>
                    </div>
                  ))}
                  {viewReport.pointDeduction > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#DC2626" }}>
                      <span>Late Deduction</span>
                      <strong>-{viewReport.pointDeduction}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, padding: "8px 0 0", borderTop: "1px solid var(--border)", marginTop: 6 }}>
                    <span>Total Score</span>
                    <span style={{ color: "var(--primary)" }}>{viewReport.totalScore} / 12</span>
                  </div>
                  {viewReport.tlComment && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>COMMENTS</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>{viewReport.tlComment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
