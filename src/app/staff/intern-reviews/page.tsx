"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardCheck, Send, MessageSquare } from "lucide-react"
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

const DAYS_LIST = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SUBMITTED: { label: "Submitted", bg: "#DBEAFE", color: "#1D4ED8" },
    LATE:      { label: "Late",      bg: "#FEF3C7", color: "#D97706" },
    REVIEWED:  { label: "Reviewed",  bg: "#DCFCE7", color: "#15803D" },
    DRAFT:     { label: "Draft",     bg: "#F3F4F6", color: "#6B7280" },
  }
  const s = map[status] ?? map.DRAFT
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

export default function StaffInternReviewsPage() {
  const { data: session } = useSession()
  const currentEmployeeId = (session?.user as any)?.employeeId ?? ""

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")

  const loadReports = async () => {
    setLoading(true)
    const d = await fetch("/api/intern-reports?asReviewer=1").then(r => r.json())
    setReports(d.reports ?? [])
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [])

  const openComment = (id: string) => {
    const r = reports.find(r => r.id === id)
    const myRecord = r?.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
    setComment(myRecord?.comment ?? "")
    setCommentingId(id)
    setSaveErr("")
  }

  const submitComment = async () => {
    if (!commentingId) return
    setSaving(true); setSaveErr("")
    const res = await fetch(`/api/intern-reports/${commentingId}/tl-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveErr(d.error ?? "Failed to save"); return }
    setCommentingId(null)
    loadReports()
  }

  const viewingReport = viewingId ? reports.find(r => r.id === viewingId) : null

  const pending = reports.filter(r => {
    const myRecord = r.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
    return !myRecord?.reviewedAt
  })
  const reviewed = reports.filter(r => {
    const myRecord = r.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
    return !!myRecord?.reviewedAt
  })

  const renderRow = (r: any) => {
    const myRecord = r.reviewers?.find((rv: any) => rv.reviewerEmployeeId === currentEmployeeId)
    const iHaveReviewed = !!myRecord?.reviewedAt
    const canComment = !iHaveReviewed && (r.status === "SUBMITTED" || r.status === "LATE" || r.status === "REVIEWED")
    return (
      <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
          {r.employee?.firstName} {r.employee?.lastName}
        </td>
        <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>
          {r.employee?.jobTitle}
        </td>
        <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: 12 }}>
          {format(new Date(r.weekStart), "MMM d")} – {format(new Date(r.weekEnd), "MMM d, yyyy")}
        </td>
        <td style={{ padding: "12px 16px" }}>{(r.totalHours ?? 0).toFixed(1)}</td>
        <td style={{ padding: "12px 16px" }}><StatusBadge status={r.status} /></td>
        <td style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setViewingId(r.id)}
              style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              View
            </button>
            {iHaveReviewed ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Commented ✓</span>
            ) : canComment ? (
              <button onClick={() => openComment(r.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                <MessageSquare size={12} />Leave Comment
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardCheck size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Intern Reviews</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Reports you have been asked to review by interns.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
          <ClipboardCheck size={32} style={{ color: "var(--border)", marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No assigned reviews</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>When an intern adds you as a reviewer on their weekly report, it will appear here.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--foreground)" }}>
                Pending Review
                <span style={{ marginLeft: 8, padding: "2px 8px", background: "#FEF3C7", color: "#D97706", borderRadius: 20, fontSize: 11 }}>{pending.length}</span>
              </h2>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        {["Intern", "Job Title", "Week", "Total Hours", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{pending.map(renderRow)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--muted-foreground)" }}>
                Reviewed
                <span style={{ marginLeft: 8, padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 20, fontSize: 11 }}>{reviewed.length}</span>
              </h2>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", opacity: 0.85 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        {["Intern", "Job Title", "Week", "Total Hours", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{reviewed.map(renderRow)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Comment Modal */}
      {commentingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setCommentingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 500, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>Leave Your Comment</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {(() => { const r = reports.find(x => x.id === commentingId); return r ? `${r.employee?.firstName} ${r.employee?.lastName} — ${format(new Date(r.weekStart), "MMM d")} – ${format(new Date(r.weekEnd), "MMM d, yyyy")}` : "" })()}
                </p>
              </div>
              <button onClick={() => setCommentingId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Your Feedback</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={5}
                placeholder="Write your feedback and observations for this intern's weekly report…"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
              {saveErr && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginTop: 10 }}>{saveErr}</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCommentingId(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitComment} disabled={saving || !comment.trim()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: (saving || !comment.trim()) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: (saving || !comment.trim()) ? 0.6 : 1 }}>
                <Send size={13} />{saving ? "Saving…" : "Submit Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewingId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 700, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
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
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 130, position: "sticky", left: 0, background: "var(--muted)", zIndex: 1 }}>Category</th>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => (
                        <th key={d} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 130 }}>{d}</th>
                      ))}
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 55 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat, i) => {
                      const dayData = (viewingReport.taskDescriptions as any)?.[cat.key]
                      const isLegacy = typeof dayData === "string"
                      const legacyHrs = viewingReport[cat.hoursKey] ?? 0
                      const weekTotal = isLegacy ? legacyHrs : DAYS_LIST.reduce((s, d) => s + (parseFloat(dayData?.[d]?.hours || "0") || 0), 0)
                      const hasData = isLegacy ? legacyHrs > 0 : DAYS_LIST.some(d => dayData?.[d]?.tasks || dayData?.[d]?.hours)
                      if (!hasData) return null
                      return (
                        <tr key={cat.key} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{cat.label}</td>
                          {isLegacy ? (
                            <>
                              <td colSpan={5} style={{ padding: "8px 12px", color: "var(--muted-foreground)", fontStyle: "italic" }}>{dayData || "—"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{legacyHrs}</td>
                            </>
                          ) : (
                            <>
                              {DAYS_LIST.map(d => {
                                const cell = dayData?.[d]
                                return (
                                  <td key={d} style={{ padding: "8px 12px", verticalAlign: "top" }}>
                                    {cell?.tasks ? <div style={{ fontSize: 12, marginBottom: 3 }}>{cell.tasks}</div> : null}
                                    {cell?.hours ? <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{cell.hours}h</div> : <div style={{ fontSize: 11, color: "var(--border)" }}>—</div>}
                                  </td>
                                )
                              })}
                              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, verticalAlign: "top" }}>{weekTotal > 0 ? weekTotal.toFixed(1) : "—"}</td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Personal Reflection */}
              {viewingReport.personalReflection && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Personal Reflection</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, background: "var(--muted)", padding: "10px 14px", borderRadius: 8 }}>{viewingReport.personalReflection}</p>
                </div>
              )}

              {/* Total hours */}
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 18px" }}>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700 }}>Total Hours</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{(viewingReport.totalHours ?? 0).toFixed(1)}</p>
                </div>
                {viewingReport.lateFlag && (
                  <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "10px 18px" }}>
                    <p style={{ fontSize: 11, color: "#D97706", fontWeight: 700 }}>Late Submission</p>
                    <p style={{ fontSize: 13, color: "#D97706" }}>Submitted after window</p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingId(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
