"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardList, ChevronLeft, ChevronRight, Star, Send } from "lucide-react"
import { format, startOfWeek, addDays, subDays } from "date-fns"

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

export default function PLInternReportsPage() {
  const { data: session } = useSession()
  const currentEmployeeId = (session?.user as any)?.employeeId ?? ""

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState({ productivityRating: null as number | null, ldRating: null as number | null, reflectionsRating: null as number | null, tlComment: "" })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")

  const now = new Date()
  const currentMonday = (() => {
    const d = new Date(now); d.setHours(0,0,0,0)
    const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff + weekOffset * 7)
    return d
  })()
  const currentFriday = new Date(currentMonday); currentFriday.setDate(currentMonday.getDate() + 4)
  const weekLabel = `${format(currentMonday, "MMM d")} – ${format(currentFriday, "MMM d, yyyy")}`

  const loadReports = async () => {
    setLoading(true)
    const params = new URLSearchParams({ week: currentMonday.toISOString() })
    const d = await fetch(`/api/intern-reports?${params}`).then(r => r.json())
    setReports(d.reports ?? [])
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [weekOffset])

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

      {/* Week selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 20px", width: "fit-content" }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 200, textAlign: "center" }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset === 0} style={{ background: "none", border: "none", cursor: weekOffset === 0 ? "not-allowed" : "pointer", color: weekOffset === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}>
          <ChevronRight size={18} />
        </button>
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
                <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>No reports for this week.</td></tr>
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
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{viewingReport.employee?.firstName} {viewingReport.employee?.lastName}</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{format(new Date(viewingReport.weekStart), "MMM d")} – {format(new Date(viewingReport.weekEnd), "MMM d, yyyy")}</p>
              </div>
              <button onClick={() => setViewingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {HOUR_ROWS.map(row => (
                <div key={row.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span>{row.label}</span>
                  <strong>{(viewingReport[row.key] ?? 0).toFixed(1)}h</strong>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 700, fontSize: 14 }}>
                <span>Total Hours</span>
                <span style={{ color: "var(--primary)" }}>{(viewingReport.totalHours ?? 0).toFixed(1)}h</span>
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
