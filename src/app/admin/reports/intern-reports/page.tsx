"use client"
import { useState, useEffect } from "react"
import { ClipboardList, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { format } from "date-fns"

const ATTENDANCE_CRITERIA: [number, string][] = [
  [3, "Present 3 days with NO lateness"],
  [2, "Present 3 days, late but with Admin/HR notification"],
  [1, "Present 2 days out of 3, late with no notification"],
  [0, "Absent and late all week with no notification"],
]

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

export default function AdminInternReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"week" | "month" | "year">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)
  const [deptFilter, setDeptFilter] = useState("")
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [attForm, setAttForm] = useState({ attendanceRating: null as number | null, attendanceComment: "" })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [tab, setTab] = useState<"reports" | "leaderboard">("reports")
  const [lbWeekOffset, setLbWeekOffset] = useState(0)

  const now = new Date()

  // Week mode — use UTC dates to match server weekStart storage
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
    fetch(`/api/intern-reports/leaderboard?week=${encodeURIComponent(lbMonday.toISOString())}`)
      .then(r => r.json()).then(d => setLeaderboard(d.leaderboard ?? [])).catch(() => {})
  }, [lbWeekOffset])

  const departments =[...new Set(reports.map(r => r.employee?.department?.name).filter(Boolean))]
  const filtered = deptFilter ? reports.filter(r => r.employee?.department?.name === deptFilter) : reports

  const openAttendance = (id: string) => {
    const r = reports.find(r => r.id === id)
    if (r) {
      setAttForm({ attendanceRating: r.attendanceRating ?? null, attendanceComment: r.attendanceComment ?? "" })
      setAttendanceId(id)
      setSaveErr("")
    }
  }

  const submitAttendance = async () => {
    if (!attendanceId) return
    if (attForm.attendanceRating === null) { setSaveErr("Please select an attendance rating."); return }
    setSaving(true); setSaveErr("")
    const res = await fetch(`/api/intern-reports/${attendanceId}/attendance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attForm),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveErr(d.error ?? "Failed to save"); return }
    setAttendanceId(null)
    loadReports()
  }

  const getExportRows = () => filtered.map(r => [
    `${r.employee?.firstName} ${r.employee?.lastName}`,
    r.employee?.department?.name ?? "",
    (r.totalHours ?? 0).toFixed(1),
    (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0),
    r.attendanceRating ?? "",
    r.pointDeduction ?? 0,
    r.totalScore ?? "",
    r.status,
    r.lateFlag ? "Yes" : "No",
  ])

  const exportCSV = () => {
    const headers = ["Intern", "Dept", "Hours", "TL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
    const rows = [headers, ...getExportRows()]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `intern-reports-${getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")}.csv`
    a.click()
  }

  const exportExcel = async () => {
    const { utils, write } = await import("xlsx")
    const headers = ["Intern", "Dept", "Hours", "TL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
    const wsData = [headers, ...getExportRows()]
    const ws = utils.aoa_to_sheet(wsData)
    ws["!cols"] = headers.map(() => ({ wch: 18 }))
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Intern Reports")
    const buf = write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `intern-reports-${getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`
    a.click()
  }

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const W = doc.internal.pageSize.width
    const H = doc.internal.pageSize.height
    const green: [number, number, number] = [22, 163, 74]
    const white: [number, number, number] = [255, 255, 255]
    const lightGreen: [number, number, number] = [240, 253, 244]
    const HEADER_H = 36

    doc.setFillColor(...green)
    doc.rect(0, 0, W, HEADER_H, "F")
    doc.setTextColor(...white)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("DATA SCIENCE NIGERIA — HRMS", 14, 11)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Intern Reports", 14, 25)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(getPeriodLabel(), W - 14, 18, { align: "right" })
    doc.text(`Generated: ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, W - 14, 26, { align: "right" })

    const headers = ["Intern", "Dept", "Hours", "TL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
    autoTable(doc, {
      head: [headers],
      body: getExportRows().map(r => r.map(v => String(v ?? ""))),
      startY: HEADER_H + 6,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, overflow: "linebreak", valign: "middle", lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: green, textColor: white, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: lightGreen },
      margin: { top: HEADER_H + 6, right: 12, bottom: 18, left: 12 },
    })

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(248, 250, 248)
      doc.rect(0, H - 12, W, 12, "F")
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text("Confidential — Data Science Nigeria HRMS", 12, H - 5)
      doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 5, { align: "center" })
    }

    doc.save(`intern-reports-${getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")}.pdf`)
  }

  const viewingReport = viewingId ? reports.find(r => r.id === viewingId) : null

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <ClipboardList size={22} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Intern Weekly Reports</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>View all intern reports, fill attendance ratings, and track weekly performance.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> Excel
          </button>
          <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> PDF
          </button>
        </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 16px" }}>
          <button onClick={() => {
            if (mode === "week") setWeekOffset(o => o - 1)
            else if (mode === "month") setMonthOffset(o => o + 1)
            else setYearOffset(o => o + 1)
          }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 200, textAlign: "center" }}>{getPeriodLabel()}</span>
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

        {departments.length > 0 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Intern", "Department", "Hours", "Status", "Late", "TL Score", "Attendance", "Deduction", "Total Score", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>No intern reports for this period.</td></tr>
              ) : filtered.map(r => {
                const tlScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {r.employee?.firstName} {r.employee?.lastName}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{r.employee?.department?.name ?? "–"}</td>
                    <td style={{ padding: "12px 16px" }}>{(r.totalHours ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.lateFlag ? <span style={{ color: "#D97706", fontWeight: 700 }}>Yes</span> : <span style={{ color: "var(--muted-foreground)" }}>No</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.productivityRating !== null ? `${Math.round((tlScore / 9) * 100)}%` : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.attendanceRating !== null ? `${Math.round((r.attendanceRating / 3) * 100)}%` : <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>Pending</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.pointDeduction > 0 ? <span style={{ color: "#DC2626", fontWeight: 700 }}>-{r.pointDeduction}</span> : "0"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.totalScore !== undefined && r.productivityRating !== null ? (
                        <strong style={{ color: "var(--primary)" }}>
                          {r.attendanceRating !== null ? `${Math.round((r.totalScore / 12) * 100)}%` : "Att. pending"}
                        </strong>
                      ) : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {r.status !== "MISSING" && (
                          <button onClick={() => setViewingId(r.id)}
                            style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                            View
                          </button>
                        )}
                        {r.status === "REVIEWED" && (
                          <button onClick={() => openAttendance(r.id)}
                            style={{ padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                            {r.attendanceRating !== null ? "Edit Attendance" : "Fill Attendance"}
                          </button>
                        )}
                        {(r.status === "SUBMITTED" || r.status === "LATE") && (
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>Awaiting review</span>
                        )}
                        {r.status === "MISSING" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Clear the missed-report record for ${r.employee?.firstName} ${r.employee?.lastName}? They will be able to submit retroactively.`)) return
                              const res = await fetch(`/api/intern-reports/${r.id}`, { method: "DELETE" })
                              if (!res.ok) { alert("Failed to clear record"); return }
                              setReports(prev => prev.filter(x => x.id !== r.id))
                            }}
                            style={{ padding: "5px 12px", background: "#DC2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                            Clear missed record
                          </button>
                        )}
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

      {tab === "leaderboard" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 20px" }}>
              <button onClick={() => setLbWeekOffset(o => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 200, textAlign: "center" }}>{lbWeekLabel}</span>
              <button onClick={() => setLbWeekOffset(o => Math.min(o + 1, 0))} disabled={lbWeekOffset === 0}
                style={{ background: "none", border: "none", cursor: lbWeekOffset === 0 ? "not-allowed" : "pointer", color: lbWeekOffset === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leaderboard data for this week.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      {["Rank", "Intern", "Dept", "Hours", "Status", "TL Score", "Attendance", "Deduction", "Total"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row: any) => {
                      const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null
                      const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                        SUBMITTED: { label: "Submitted", bg: "#DBEAFE", color: "#1D4ED8" },
                        LATE:      { label: "Late",      bg: "#FEF3C7", color: "#D97706" },
                        REVIEWED:  { label: "Reviewed",  bg: "#DCFCE7", color: "#15803D" },
                        MISSING:   { label: "Missed",    bg: "#FEE2E2", color: "#DC2626" },
                      }
                      const s = statusMap[row.status] ?? { label: row.status ?? "–", bg: "#F3F4F6", color: "#6B7280" }
                      return (
                        <tr key={row.employeeId} style={{ borderTop: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            {medal ? <span style={{ fontSize: 16 }}>{medal}</span> : <span style={{ color: "var(--muted-foreground)" }}>{row.rank}</span>}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{row.name}</td>
                          <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{row.dept}</td>
                          <td style={{ padding: "12px 16px" }}>{row.totalHours?.toFixed(1)}h</td>
                          <td style={{ padding: "12px 16px" }}>
                            {row.status && <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{row.tlScorePct}%</td>
                          <td style={{ padding: "12px 16px", color: row.attendancePending ? "var(--muted-foreground)" : "inherit" }}>
                            {row.attendancePending ? "Pending" : `${row.attendanceScorePct}%`}
                          </td>
                          <td style={{ padding: "12px 16px", color: row.pointDeduction > 0 ? "#DC2626" : "var(--muted-foreground)" }}>
                            {row.pointDeduction > 0 ? `-${row.pointDeduction}` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--primary)" }}>
                            {row.attendancePending ? "–" : `${row.totalScorePct}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setAttendanceId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 500, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Attendance & Punctuality</h3>
              <button onClick={() => setAttendanceId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted-foreground)" }}>
                RATING CRITERIA <span style={{ fontWeight: 400 }}>(Requirement: 3 days physical presence + Admin check)</span>
              </p>
              <div style={{ marginBottom: 16 }}>
                {ATTENDANCE_CRITERIA.map(([pts, desc]) => (
                  <div key={pts} style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    <strong>{pts} pts:</strong> {desc}
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Select Rating</label>
                <RatingSelector
                  value={attForm.attendanceRating}
                  onChange={v => setAttForm(f => ({ ...f, attendanceRating: v }))}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Comment (optional)</label>
                <textarea
                  value={attForm.attendanceComment}
                  onChange={e => setAttForm(f => ({ ...f, attendanceComment: e.target.value }))}
                  rows={3}
                  placeholder="Any notes about attendance this week…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              {saveErr && <div style={{ padding: "8px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626", marginTop: 12 }}>{saveErr}</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setAttendanceId(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitAttendance} disabled={saving}
                style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Attendance"}
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
                      const dayTotal = CATEGORIES.reduce((s, cat) => s + (parseFloat(td?.[cat.key]?.[day]?.hours || "0") || 0), 0)
                      return (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, verticalAlign: "top", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--card)" : "var(--muted)", zIndex: 1 }}>{dayLabel}</td>
                          {CATEGORIES.map(cat => {
                            const cell = td?.[cat.key]?.[day]
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
                        return <td key={cat.key} style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)" }}>{catTot > 0 ? catTot.toFixed(1) : "—"}</td>
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

              {/* All Reviewer Feedback */}
              {(viewingReport.reviewers?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reviewer Feedback</p>
                  {viewingReport.reviewers.map((rv: any) => {
                    const tlScore = (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
                    return (
                      <div key={rv.id} style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{rv.reviewer?.firstName} {rv.reviewer?.lastName}</span>
                          {rv.isPrimary && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA", fontWeight: 700 }}>Primary</span>}
                          {rv.productivityRating !== null && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginLeft: "auto" }}>TL: {Math.round((tlScore / 9) * 100)}%</span>}
                        </div>
                        {rv.productivityRating !== null ? (
                          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--muted-foreground)", marginBottom: rv.comment ? 8 : 0 }}>
                            <span>Productivity: <strong>{rv.productivityRating}/3</strong></span>
                            <span>L&D: <strong>{rv.ldRating}/3</strong></span>
                            <span>Reflections: <strong>{rv.reflectionsRating}/3</strong></span>
                          </div>
                        ) : <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", margin: "0 0 4px" }}>Awaiting feedback…</p>}
                        {rv.comment && <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>{rv.comment}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
