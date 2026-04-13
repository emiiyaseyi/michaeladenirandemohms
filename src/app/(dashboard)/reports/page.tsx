"use client"
import { useState, useRef } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import {
  BarChart2, Users, CalendarDays, TrendingUp, DollarSign, Clock,
  FileText, Download, Plus, Calendar, ChevronRight, Mail,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportCategory {
  id: string
  label: string
  icon: React.ElementType
  reports: string[]
}

interface HistoryEntry {
  id: string
  name: string
  generatedBy: string
  date: string
  format: "CSV" | "Excel" | "PDF"
  size: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: ReportCategory[] = [
  {
    id: "employee",
    label: "Employee Reports",
    icon: Users,
    reports: ["Headcount Report", "Employee Roster", "New Hires Report", "Turnover Report"],
  },
  {
    id: "leave",
    label: "Leave Reports",
    icon: CalendarDays,
    reports: ["Leave Requests", "Leave Balances", "Leave Utilization"],
  },
  {
    id: "performance",
    label: "Performance Reports",
    icon: TrendingUp,
    reports: ["KPI Summary", "Appraisals Report"],
  },
  {
    id: "payroll",
    label: "Payroll Reports",
    icon: DollarSign,
    reports: ["Payslips Summary", "Salary Analysis"],
  },
  {
    id: "attendance",
    label: "Attendance Reports",
    icon: Clock,
    reports: ["Daily Attendance", "Monthly Attendance", "Late Arrivals"],
  },
  {
    id: "custom",
    label: "Custom Report",
    icon: FileText,
    reports: ["Build Your Own"],
  },
]

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "1", name: "Headcount Report - March 2026", generatedBy: "Amaka Okonkwo", date: "2026-04-01", format: "PDF", size: "245 KB" },
  { id: "2", name: "Leave Utilization - Q1 2026", generatedBy: "Tunde Adeyemi", date: "2026-03-31", format: "Excel", size: "512 KB" },
  { id: "3", name: "Employee Roster", generatedBy: "Ngozi Eze", date: "2026-03-28", format: "CSV", size: "88 KB" },
  { id: "4", name: "Salary Analysis - March 2026", generatedBy: "Chidi Obi", date: "2026-03-25", format: "PDF", size: "310 KB" },
  { id: "5", name: "New Hires Report - Q1 2026", generatedBy: "Amaka Okonkwo", date: "2026-03-20", format: "Excel", size: "196 KB" },
]

// ─── Style helpers ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

const formatColor: Record<string, { bg: string; color: string }> = {
  CSV: { bg: "#E6F4EA", color: "#1A7336" },
  Excel: { bg: "#E8F5E9", color: "#2E7D32" },
  PDF: { bg: "#FDECEA", color: "#C0392B" },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(CATEGORIES[0])
  const [selectedReport, setSelectedReport] = useState<string>(CATEGORIES[0].reports[0])
  const [dateFrom, setDateFrom] = useState("2026-01-01")
  const [dateTo, setDateTo] = useState("2026-03-31")
  const [department, setDepartment] = useState("all")
  const [empType, setEmpType] = useState("all")
  const [status, setStatus] = useState("active")
  const [selectedFormat, setSelectedFormat] = useState<"CSV" | "Excel" | "PDF">("PDF")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Schedule form
  const [schedFreq, setSchedFreq] = useState("monthly")
  const [schedTime, setSchedTime] = useState("08:00")
  const [schedRecipients, setSchedRecipients] = useState("")

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => setGenerating(false), 1400)
  }

  const handleScheduleSave = () => {
    setScheduleOpen(false)
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Reports</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Generate, schedule and export reports</p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Left sidebar: categories ── */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <Card style={{ padding: 8 }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = selectedCategory.id === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat); setSelectedReport(cat.reports[0]) }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: active ? "var(--primary-50, #EBF3FF)" : "transparent",
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                    fontWeight: active ? 700 : 400, fontSize: 13, textAlign: "left",
                    marginBottom: 2,
                  }}
                >
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
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Configure filters and export options</p>
              </div>
            </div>

            {/* Report sub-type */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Report Type</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedCategory.reports.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedReport(r)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, border: "1px solid",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: selectedReport === r ? "var(--primary)" : "transparent",
                      color: selectedReport === r ? "#fff" : "var(--foreground)",
                      borderColor: selectedReport === r ? "var(--primary)" : "var(--border)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
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
                  <option value="engineering">Engineering</option>
                  <option value="hr">Human Resources</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Employee Type</label>
                <select value={empType} onChange={e => setEmpType(e.target.value)} style={inp}>
                  <option value="all">All</option>
                  <option value="technical">Technical</option>
                  <option value="non-technical">Non-Technical</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Format + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Format:</span>
                {(["CSV", "Excel", "PDF"] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    style={{
                      padding: "6px 16px", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                      background: selectedFormat === fmt ? formatColor[fmt].bg : "transparent",
                      color: selectedFormat === fmt ? formatColor[fmt].color : "var(--muted-foreground)",
                      borderColor: selectedFormat === fmt ? formatColor[fmt].color : "var(--border)",
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => setScheduleOpen(true)}>
                  <Calendar size={14} /> Schedule Report
                </Button>
                <Button loading={generating} onClick={handleGenerate}>
                  <Download size={14} /> Generate Report
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Report History ── */}
          <Card>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Report History</h3>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Recent exports</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Report Name", "Generated By", "Date", "Format", "Download"].map(h => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HISTORY.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{entry.size}</div>
                      </td>
                      <td style={{ padding: "13px 20px", fontSize: 13 }}>{entry.generatedBy}</td>
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>
                        {new Date(entry.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px",
                          background: formatColor[entry.format].bg,
                          color: formatColor[entry.format].color,
                        }}>
                          {entry.format}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <button style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}>
                          <Download size={12} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Schedule Report Modal ── */}
      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule Report" width={480}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--primary-50, #EBF3FF)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--primary)" }}>
            Scheduling: <strong>{selectedReport}</strong> ({selectedCategory.label})
          </div>
          <div>
            <label style={labelStyle}>Frequency</label>
            <select value={schedFreq} onChange={e => setSchedFreq(e.target.value)} style={inp}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Time</label>
            <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={labelStyle}>Recipients (comma-separated emails)</label>
            <input
              type="text"
              placeholder="e.g. hr@company.com, ceo@company.com"
              value={schedRecipients}
              onChange={e => setSchedRecipients(e.target.value)}
              style={inp}
            />
          </div>
          <div>
            <label style={labelStyle}>Format</label>
            <select defaultValue={selectedFormat} style={inp}>
              <option value="PDF">PDF</option>
              <option value="Excel">Excel</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button>
          <Button onClick={handleScheduleSave}><Calendar size={14} /> Save Schedule</Button>
        </div>
      </Modal>
    </div>
  )
}
