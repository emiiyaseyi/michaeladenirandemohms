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

type Settings = { submissionDay: number; openHour: number; lateHour: number; closeHour: number; lateDeduction: number }

const DEFAULTS: Settings = { submissionDay: 5, openHour: 16, lateHour: 20, closeHour: 24, lateDeduction: 2 }

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12:00 AM"
  if (h === 12) return "12:00 PM"
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

function computeWindow(cfg: Settings): { text: string; open: boolean; late: boolean } {
  const now = new Date()
  const wat = new Date(now.getTime() + 60 * 60 * 1000)
  const day = wat.getDay()
  const hours = wat.getHours()
  const minutes = wat.getMinutes()

  if (day !== cfg.submissionDay) {
    const diff = ((cfg.submissionDay - day + 7) % 7) || 7
    return { text: `Opens in ${diff} day${diff !== 1 ? "s" : ""} (${DAYS[cfg.submissionDay]} ${hourLabel(cfg.openHour)} WAT)`, open: false, late: false }
  }
  if (hours < cfg.openHour) {
    const minsLeft = (cfg.openHour - hours - 1) * 60 + (60 - minutes)
    const h = Math.floor(minsLeft / 60); const m = minsLeft % 60
    return { text: `Submission opens in ${h}h ${m}m (${hourLabel(cfg.openHour)} WAT)`, open: false, late: false }
  }
  if (cfg.closeHour < 24 && hours >= cfg.closeHour) {
    return { text: "Submission window has closed for today.", open: false, late: false }
  }
  if (hours >= cfg.lateHour) {
    return { text: `Late submission (after ${hourLabel(cfg.lateHour)} WAT) — ${cfg.lateDeduction} point${cfg.lateDeduction !== 1 ? "s" : ""} will be deducted`, open: true, late: true }
  }
  return { text: `Submission window is open (${hourLabel(cfg.openHour)} – ${hourLabel(cfg.lateHour)} WAT on ${DAYS[cfg.submissionDay]}s)`, open: true, late: false }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    DRAFT:            { label: "Draft",     bg: "#F3F4F6", color: "#6B7280" },
    SUBMITTED:        { label: "Submitted", bg: "#DBEAFE", color: "#1D4ED8" },
    LATE:             { label: "Late",      bg: "#FEF3C7", color: "#D97706" },
    REVIEWED:         { label: "Reviewed",  bg: "#DCFCE7", color: "#15803D" },
    ATTENDANCE_FILLED:{ label: "Completed", bg: "#DCFCE7", color: "#15803D" },
  }
  const s = map[status] ?? map.DRAFT
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

export default function InternReportPage() {
  const [cfg, setCfg] = useState<Settings>(DEFAULTS)
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map(c => [c.hoursKey, ""]))
  )
  const [descs, setDescs] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map(c => [c.key, ""]))
  )
  const [reflection, setReflection] = useState("")
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

  const totalHours = CATEGORIES.reduce((s, c) => s + (parseFloat(hours[c.hoursKey]) || 0), 0)

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
    const hoursPayload = Object.fromEntries(CATEGORIES.map(c => [c.hoursKey, parseFloat(hours[c.hoursKey]) || 0]))
    const taskDescriptions = Object.fromEntries(CATEGORIES.map(c => [c.key, descs[c.key].trim()]))
    const res = await fetch("/api/intern-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...hoursPayload, taskDescriptions, personalReflection: reflection, extraReviewerIds }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitErr(d.error ?? "Failed to submit"); return }
    setSubmitOk(true)
    setReports(prev => [d.report, ...prev.filter(r => r.id !== d.report.id)])
  }

  const alreadySubmitted = submitOk
    || ["SUBMITTED","LATE","REVIEWED","ATTENDANCE_FILLED"].includes(thisWeekReport?.status)

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Weekly Report</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Submit your weekly task log every {DAYS[cfg.submissionDay]} between {hourLabel(cfg.openHour)} and {hourLabel(cfg.lateHour)} WAT.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* Left: Submission Form */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
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
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your report for this week has been submitted. Check Past Reports for status.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: "16px 24px 0" }}>
                <div style={{
                  fontSize: 12, color: window.late ? "#92400E" : window.open ? "#166534" : "#4B5563",
                  padding: "8px 12px", background: window.late ? "#FEF3C7" : window.open ? "#F0FDF4" : "#F3F4F6",
                  borderRadius: 8, marginBottom: 20,
                }}>
                  {window.text}
                </div>

                {/* Task table */}
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 90px", background: "var(--muted)", padding: "10px 14px", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tasks Done This Week</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Hours</span>
                  </div>

                  {CATEGORIES.map((cat, i) => (
                    <div key={cat.key} style={{
                      display: "grid", gridTemplateColumns: "180px 1fr 90px",
                      padding: "10px 14px", gap: 12, alignItems: "center",
                      borderTop: i > 0 ? "1px solid var(--border)" : "none",
                      background: i % 2 === 0 ? "transparent" : "var(--muted)08",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{cat.label}</span>
                      <input
                        type="text"
                        value={descs[cat.key]}
                        onChange={e => setDescs(d => ({ ...d, [cat.key]: e.target.value }))}
                        disabled={!window.open}
                        placeholder="Describe tasks performed…"
                        style={{
                          width: "100%", padding: "7px 10px", border: "1.5px solid var(--border)",
                          borderRadius: 6, fontSize: 13, background: "var(--background)",
                          color: "var(--foreground)", outline: "none", boxSizing: "border-box",
                          opacity: !window.open ? 0.6 : 1,
                        }}
                      />
                      <input
                        type="number" min={0} max={40} step={0.5}
                        value={hours[cat.hoursKey]}
                        onChange={e => setHours(h => ({ ...h, [cat.hoursKey]: e.target.value }))}
                        disabled={!window.open}
                        placeholder="0"
                        style={{
                          width: "100%", padding: "7px 10px", border: "1.5px solid var(--border)",
                          borderRadius: 6, fontSize: 14, background: "var(--background)",
                          color: "var(--foreground)", outline: "none", textAlign: "center",
                          boxSizing: "border-box", opacity: !window.open ? 0.6 : 1,
                        }}
                      />
                    </div>
                  ))}

                  {/* Total row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "180px 1fr 90px",
                    padding: "12px 14px", gap: 12, alignItems: "center",
                    borderTop: "2px solid var(--border)", background: "var(--muted)",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Total Hours</span>
                    <span />
                    <span style={{ fontSize: 16, fontWeight: 900, color: "var(--primary)", textAlign: "center" }}>{totalHours.toFixed(1)}</span>
                  </div>
                </div>

                {/* Reflection */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--foreground)" }}>
                    Personal Reflections for the Week
                  </label>
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    rows={4}
                    disabled={!window.open}
                    placeholder="What went well? What challenges did you face? What did you learn this week?"
                    style={{
                      width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)",
                      borderRadius: 8, fontSize: 13, background: "var(--background)",
                      color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box",
                      opacity: !window.open ? 0.6 : 1,
                    }}
                  />
                </div>

                {/* Reviewers */}
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Users size={14} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Who will review this report</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#EEF2FF", fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
                      {projectLead?.name ?? "Your Project Lead"}
                      <span style={{ fontSize: 10, fontWeight: 400, color: "#6366f1" }}>— required</span>
                    </div>
                  </div>
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

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSubmit}
                  disabled={!window.open || submitting}
                  style={{
                    padding: "10px 32px", background: "var(--primary)", border: "none", borderRadius: 8,
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
          <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Past Reports</h2>
          </div>
          {loading ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No reports submitted yet.</div>
          ) : (
            <div>
              {reports.map(r => (
                <div key={r.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {format(new Date(r.weekStart), "MMM d")} – {format(new Date(r.weekEnd), "MMM d")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{(r.totalHours ?? 0).toFixed(1)}h</span>
                      {r.status === "REVIEWED" && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>{r.totalScore}/12</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setViewReport(r)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "5px 10px" }}>
                    <Eye size={12} /> View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Report Modal */}
      {viewReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewReport(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 680, width: "100%", maxHeight: "88vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
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
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", background: "var(--muted)", padding: "9px 14px", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Category</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Tasks</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", textAlign: "center" }}>Hrs</span>
                </div>
                {CATEGORIES.map((cat, i) => {
                  const hrs = (viewReport[cat.hoursKey] ?? 0)
                  const desc = (viewReport.taskDescriptions as any)?.[cat.key] ?? ""
                  if (!hrs && !desc) return null
                  return (
                    <div key={cat.key} style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", padding: "10px 14px", gap: 12, borderTop: i > 0 ? "1px solid var(--border)" : "none", alignItems: "start" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
                      <span style={{ fontSize: 12, color: desc ? "var(--foreground)" : "var(--muted-foreground)", fontStyle: desc ? "normal" : "italic" }}>{desc || "—"}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", color: "var(--primary)" }}>{hrs.toFixed(1)}</span>
                    </div>
                  )
                })}
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", padding: "10px 14px", gap: 12, borderTop: "2px solid var(--border)", background: "var(--muted)" }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Total</span>
                  <span />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "var(--primary)", textAlign: "center" }}>{(viewReport.totalHours ?? 0).toFixed(1)}</span>
                </div>
              </div>

              {viewReport.personalReflection && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal Reflections</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, background: "var(--muted)", borderRadius: 8, padding: "12px 14px" }}>{viewReport.personalReflection}</p>
                </div>
              )}

              {viewReport.status === "REVIEWED" && (
                <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Lead Feedback</p>
                  {[
                    ["Productivity & Time Utilization", viewReport.productivityRating],
                    ["Learning & Development", viewReport.ldRating],
                    ["Reflections & Problem Solving", viewReport.reflectionsRating],
                    ["Attendance & Punctuality", viewReport.attendanceRating],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                      <span>{label}</span>
                      <strong>{val !== null && val !== undefined ? `${val} / 3` : "–"}</strong>
                    </div>
                  ))}
                  {(viewReport.pointDeduction ?? 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: "#DC2626" }}>
                      <span>Late Deduction</span>
                      <strong>-{viewReport.pointDeduction}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, padding: "10px 0 0", marginTop: 4 }}>
                    <span>Total Score</span>
                    <span style={{ color: "var(--primary)" }}>{viewReport.totalScore} / 12</span>
                  </div>
                  {viewReport.tlComment && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4, textTransform: "uppercase" }}>Comments</p>
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
