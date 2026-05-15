"use client"
import { useState, useEffect, useRef } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import {
  Users, CalendarDays, TrendingUp, FileText, Download, X, Loader2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportCategory {
  id: string
  label: string
  icon: React.ElementType
  reports: string[]
}

interface ReportData {
  title: string
  subtitle: string
  headers: string[]
  rows: (string | number | null)[][]
  filename: string
  generatedAt: string
  rowCount: number
}

interface HistoryEntry {
  id: string
  name: string
  date: string
  format: "CSV" | "Excel" | "PDF"
  rowCount: number
  params: {
    category: string; reportType: string; dateFrom: string; dateTo: string
    departmentId: string; empType: string; status: string; employeeId: string
    selectedFields?: string[]
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: ReportCategory[] = [
  { id: "employee",    label: "Employee Reports",    icon: Users,         reports: ["Headcount Report", "Employee Roster", "New Hires Report", "Turnover Report"] },
  { id: "leave",       label: "Leave Reports",       icon: CalendarDays,  reports: ["Leave Requests", "Leave Balances", "Leave Utilization"] },
  { id: "performance", label: "Performance Reports", icon: TrendingUp,    reports: ["KPI Summary", "Appraisals Report"] },
  { id: "custom",      label: "Custom Report",       icon: FileText,      reports: ["Build Your Own"] },
]

const CUSTOM_FIELDS = [
  { key: "employeeId",     label: "Employee ID" },
  { key: "firstName",      label: "First Name" },
  { key: "lastName",       label: "Last Name" },
  { key: "email",          label: "Email" },
  { key: "phone",          label: "Phone" },
  { key: "department",     label: "Department" },
  { key: "jobTitle",       label: "Job Title" },
  { key: "employmentType", label: "Employment Type" },
  { key: "status",         label: "Status" },
  { key: "hireDate",       label: "Hire Date" },
  { key: "dob",            label: "Date of Birth" },
  { key: "gender",         label: "Gender" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }
const fmtColor: Record<string, { bg: string; color: string }> = {
  CSV:   { bg: "#E6F4EA", color: "#1A7336" },
  Excel: { bg: "#E8F5E9", color: "#2E7D32" },
  PDF:   { bg: "#FDECEA", color: "#C0392B" },
}

const HIST_KEY = "dsn_report_history"

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]") } catch { return [] }
}
function saveHistory(h: HistoryEntry[]) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30))) } catch {}
}

// ─── Format generators ────────────────────────────────────────────────────────

function generateCSV(data: ReportData) {
  const csv = [
    data.headers.join(","),
    ...data.rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n")
  const blob = new Blob(["﻿" + csv, ""], { type: "text/csv;charset=utf-8;" })
  triggerDownload(blob, data.filename)
}

async function generateExcel(data: ReportData) {
  const { utils, write } = await import("xlsx")
  const wsData = [data.headers, ...data.rows.map(r => r.map(v => v ?? ""))]
  const ws = utils.aoa_to_sheet(wsData)
  ws["!cols"] = data.headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...data.rows.map(r => String(r[i] ?? "").length))
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) }
  })
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, data.title.slice(0, 31))
  const buf = write(wb, { bookType: "xlsx", type: "array" })
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), data.filename.replace(".csv", ".xlsx"))
}

async function generatePDF(data: ReportData, _dateFrom: string, _dateTo: string) {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const isLandscape = data.headers.length > 7
  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.width
  const H = doc.internal.pageSize.height
  const green: [number, number, number] = [22, 163, 74]
  const darkGreen: [number, number, number] = [15, 120, 55]
  const white: [number, number, number] = [255, 255, 255]
  const lightGreen: [number, number, number] = [240, 253, 244]
  const HEADER_H = 42

  doc.setFillColor(...green)
  doc.rect(0, 0, W, HEADER_H, "F")
  doc.setFillColor(...darkGreen)
  doc.triangle(W - 60, 0, W, 0, W, HEADER_H, "F")
  doc.setTextColor(...white)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("DATA SCIENCE NIGERIA — HRMS", 14, 12)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(data.title, 14, 27)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  if (data.subtitle) doc.text(data.subtitle, W - 16, 16, { align: "right" })
  doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, W - 16, 23, { align: "right" })
  doc.text(`${data.rowCount} record${data.rowCount !== 1 ? "s" : ""}`, W - 16, 30, { align: "right" })
  doc.setDrawColor(...white)
  doc.setLineWidth(0.2)
  doc.line(14, HEADER_H - 3, W - 14, HEADER_H - 3)

  autoTable(doc, {
    head: [data.headers],
    body: data.rows.map(r => r.map(v => (v == null ? "" : String(v)))),
    startY: HEADER_H + 6,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, overflow: "linebreak", valign: "middle", lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: green, textColor: white, fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
    alternateRowStyles: { fillColor: lightGreen },
    columnStyles: data.headers.reduce((acc: Record<number, any>, h, i) => {
      if (h.toLowerCase().includes("id")) acc[i] = { cellWidth: 22 }
      else if (h.toLowerCase().includes("date")) acc[i] = { cellWidth: 24 }
      else if (h.toLowerCase().includes("name")) acc[i] = { cellWidth: 32 }
      return acc
    }, {}),
    margin: { top: HEADER_H + 6, right: 12, bottom: 18, left: 12 },
    didDrawPage: () => {
      const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
      if (pageNum > 1) {
        doc.setFillColor(...green)
        doc.rect(0, 0, W, 14, "F")
        doc.setTextColor(...white)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text(data.title, 12, 9)
        doc.setFont("helvetica", "normal")
        doc.text("DSN HRMS", W - 12, 9, { align: "right" })
      }
    },
  })

  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 250, 248)
    doc.rect(0, H - 14, W, 14, "F")
    doc.setDrawColor(...green)
    doc.setLineWidth(0.4)
    doc.line(0, H - 14, W, H - 14)
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.setFont("helvetica", "normal")
    doc.text("Confidential — Data Science Nigeria HRMS", 12, H - 7)
    doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 7, { align: "center" })
    doc.text(new Date().toLocaleDateString("en-NG", { dateStyle: "medium" }), W - 12, H - 7, { align: "right" })
  }

  doc.save(data.filename.replace(".csv", ".pdf"))
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(CATEGORIES[0])
  const [selectedReport, setSelectedReport] = useState<string>(CATEGORIES[0].reports[0])
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [department, setDepartment] = useState("all")
  const [empType, setEmpType] = useState("all")
  const [status, setStatus] = useState("all")
  const [employeeId, setEmployeeId] = useState("all")
  const [empSearch, setEmpSearch] = useState("")
  const [empDropOpen, setEmpDropOpen] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedFormat, setSelectedFormat] = useState<"CSV" | "Excel" | "PDF">("PDF")
  const [generating, setGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>(CUSTOM_FIELDS.map(f => f.key))
  const empRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/settings/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? [])).catch(() => {})
    fetch("/api/employees?status=ALL&limit=500").then(r => r.json()).then(d => setEmployees(d.employees ?? [])).catch(() => {})
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!empRef.current?.contains(e.target as Node)) setEmpDropOpen(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [])

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 5000)
  }

  const selectedEmp = employees.find(e => e.id === employeeId)
  const filteredEmps = employees.filter(e => {
    const q = empSearch.toLowerCase()
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || (e.employeeId ?? "").toLowerCase().includes(q)
  })

  const buildParams = () => ({
    category: selectedCategory.id,
    reportType: selectedReport,
    dateFrom, dateTo,
    departmentId: department,
    empType, status, employeeId,
    ...(selectedCategory.id === "custom" ? { selectedFields } : {}),
  })

  const fetchAndDownload = async (params: ReturnType<typeof buildParams>, fmt: "CSV" | "Excel" | "PDF"): Promise<ReportData | null> => {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showToast(d.error ?? "Failed to generate report", false)
      return null
    }
    const data: ReportData = await res.json()
    if (fmt === "PDF") await generatePDF(data, params.dateFrom, params.dateTo)
    else if (fmt === "Excel") await generateExcel(data)
    else generateCSV(data)
    return data
  }

  const handleGenerate = async () => {
    if (selectedCategory.id === "custom" && selectedFields.length === 0) {
      showToast("Please select at least one column", false)
      return
    }
    setGenerating(true)
    try {
      const params = buildParams()
      const data = await fetchAndDownload(params, selectedFormat)
      if (!data) return
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        name: `${data.title}${dateFrom ? ` — ${new Date(dateFrom).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}` : ""}`,
        date: new Date().toISOString().split("T")[0],
        format: selectedFormat,
        rowCount: data.rowCount,
        params,
      }
      const newHistory = [entry, ...history]
      setHistory(newHistory)
      saveHistory(newHistory)
      showToast(`${data.title} downloaded (${data.rowCount} rows)`, true)
    } catch {
      showToast("Failed to generate report. Please try again.", false)
    } finally {
      setGenerating(false)
    }
  }

  const handleHistoryDownload = async (entry: HistoryEntry) => {
    setDownloadingId(entry.id)
    try {
      await fetchAndDownload(entry.params, entry.format)
    } catch {
      showToast("Failed to re-download report", false)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Reports</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Generate and export reports</p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ── Left sidebar ── */}
        <div style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 240 }}>
          <Card style={{ padding: 8 }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = selectedCategory.id === cat.id
              return (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat); setSelectedReport(cat.reports[0]) }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "var(--primary-50, #EBF3FF)" : "transparent", color: active ? "var(--primary)" : "var(--muted-foreground)", fontWeight: active ? 700 : 400, fontSize: 13, textAlign: "left", marginBottom: 2 }}>
                  <Icon size={15} /> {cat.label}
                </button>
              )
            })}
          </Card>
        </div>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Filter card */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>{selectedCategory.label}</h2>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Configure filters and export format</p>
              </div>
            </div>

            {/* Report sub-type */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Report Type</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedCategory.reports.map(r => (
                  <button key={r} onClick={() => setSelectedReport(r)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", background: selectedReport === r ? "var(--primary)" : "transparent", color: selectedReport === r ? "#fff" : "var(--foreground)", borderColor: selectedReport === r ? "var(--primary)" : "var(--border)" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Column picker — custom report only */}
            {selectedCategory.id === "custom" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Select Columns</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSelectedFields(CUSTOM_FIELDS.map(f => f.key))} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Select all</button>
                    <span style={{ color: "var(--border)" }}>·</span>
                    <button onClick={() => setSelectedFields([])} style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Clear</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CUSTOM_FIELDS.map(f => {
                    const checked = selectedFields.includes(f.key)
                    return (
                      <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", padding: "5px 12px", borderRadius: 8, border: "1px solid", borderColor: checked ? "var(--primary)" : "var(--border)", background: checked ? "var(--primary-50, #EBF3FF)" : "transparent", color: checked ? "var(--primary)" : "var(--foreground)", fontWeight: checked ? 600 : 400, userSelect: "none" }}>
                        <input type="checkbox" checked={checked} onChange={() => setSelectedFields(prev => checked ? prev.filter(k => k !== f.key) : [...prev, f.key])} style={{ margin: 0, accentColor: "var(--primary)" }} />
                        {f.label}
                      </label>
                    )
                  })}
                </div>
                {selectedFields.length === 0 && (
                  <p style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>Select at least one column to generate a report.</p>
                )}
              </div>
            )}

            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={inp}>
                  <option value="all">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Employee Type</label>
                <select value={empType} onChange={e => setEmpType(e.target.value)} style={inp}>
                  <option value="all">All</option>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                  <option value="NYSC">NYSC</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                  <option value="all">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="RESIGNED">Resigned</option>
                </select>
              </div>
              <div ref={empRef} style={{ position: "relative" }}>
                <label style={labelStyle}>Single Employee</label>
                {selectedEmp ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)", fontSize: 13 }}>
                    <span style={{ flex: 1, fontWeight: 600 }}>{selectedEmp.firstName} {selectedEmp.lastName} <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>· {selectedEmp.employeeId}</span></span>
                    <button onClick={() => { setEmployeeId("all"); setEmpSearch("") }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted-foreground)" }}><X size={13} /></button>
                  </div>
                ) : (
                  <input value={empSearch} onChange={e => { setEmpSearch(e.target.value); setEmpDropOpen(true) }} onFocus={() => setEmpDropOpen(true)} placeholder="All employees" style={inp} />
                )}
                {empDropOpen && !selectedEmp && filteredEmps.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 50, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {filteredEmps.slice(0, 30).map(e => (
                      <div key={e.id} onClick={() => { setEmployeeId(e.id); setEmpDropOpen(false); setEmpSearch("") }}
                        style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13 }}
                        onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                        onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
                        <span style={{ fontWeight: 600 }}>{e.firstName} {e.lastName}</span>
                        <span style={{ color: "var(--muted-foreground)", marginLeft: 8, fontSize: 11 }}>{e.employeeId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Format + generate */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Format:</span>
                {(["CSV", "Excel", "PDF"] as const).map(fmt => (
                  <button key={fmt} onClick={() => setSelectedFormat(fmt)}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 700, cursor: "pointer", background: selectedFormat === fmt ? fmtColor[fmt].bg : "transparent", color: selectedFormat === fmt ? fmtColor[fmt].color : "var(--muted-foreground)", borderColor: selectedFormat === fmt ? fmtColor[fmt].color : "var(--border)" }}>
                    {fmt}
                  </button>
                ))}
              </div>
              <Button loading={generating} onClick={handleGenerate}>
                <Download size={14} /> Generate & Download
              </Button>
            </div>
          </Card>

          {/* ── Report History ── */}
          <Card>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Report History</h3>
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); saveHistory([]) }}
                  style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                  Clear history
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                No reports generated yet. Use the filters above to generate your first report.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Report Name", "Date", "Records", "Format"].map(h => (
                        <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                      <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", position: "sticky", right: 0, background: "var(--card)", boxShadow: "-2px 0 6px rgba(0,0,0,0.06)", minWidth: 120 }}>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(entry => {
                      const isBusy = downloadingId === entry.id
                      return (
                        <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "13px 20px" }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{entry.params.reportType}</div>
                          </td>
                          <td style={{ padding: "13px 20px", fontSize: 13, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                            {new Date(entry.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td style={{ padding: "13px 20px", fontSize: 13 }}>{entry.rowCount} rows</td>
                          <td style={{ padding: "13px 20px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px", background: fmtColor[entry.format].bg, color: fmtColor[entry.format].color }}>{entry.format}</span>
                          </td>
                          <td style={{ padding: "13px 20px", position: "sticky", right: 0, background: "var(--card)", boxShadow: "-2px 0 6px rgba(0,0,0,0.06)" }}>
                            <button onClick={() => handleHistoryDownload(entry)} disabled={isBusy}
                              style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: isBusy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600, opacity: isBusy ? 0.6 : 1 }}>
                              {isBusy ? <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> : <Download size={12} />}
                              {isBusy ? "…" : "Download"}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#DCFCE7" : "#FEE2E2", color: toast.ok ? "#15803d" : "#DC2626", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: 420, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1 }}>{toast.text}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}><X size={14} /></button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
