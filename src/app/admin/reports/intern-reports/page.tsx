"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardList, ChevronLeft, ChevronRight, Download, Users, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { generateInternReportExcel } from "@/lib/intern-report-excel"

const ATTENDANCE_CRITERIA: [number, string][] = [
  [3, "Present 3 days with NO lateness"],
  [2, "Present 3 days, late but with Admin/HR notification"],
  [1, "Present 2 days out of 3, late with no notification"],
  [0, "Absent and late all week with no notification"],
]

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

// Get hours for a category+day from taskDescriptions - handles both old {tasks,hours} and new [{text,minutes}] formats
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
  // Legacy format
  return { tasks: cell.tasks ? [cell.tasks] : [], totalMins: parseMinutes(cell.hours ?? "0") * 60 || (parseFloat(cell.hours ?? "0") * 60) }
}

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

export default function AdminInternReportsPage() {
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN"
  const canViewAnalytics = isSuperAdmin || !!(session?.user as any)?.permissions?.canViewAnalytics

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
  const [tab, setTab] = useState<"overview" | "reports" | "leaderboard">("reports")
  const [overview, setOverview] = useState<any>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [ovMode, setOvMode] = useState<"week" | "month" | "year" | "custom">("week")
  const [ovWeekOffset, setOvWeekOffset] = useState(0)
  const [ovMonthOffset, setOvMonthOffset] = useState(0)
  const [ovYearOffset, setOvYearOffset] = useState(0)
  const [ovCustomFrom, setOvCustomFrom] = useState("")
  const [ovCustomTo, setOvCustomTo] = useState("")
  const [lbWeekOffset, setLbWeekOffset] = useState(0)
  const [lbMode, setLbMode] = useState<"week" | "month" | "alltime">("week")
  const [lbDeptFilter, setLbDeptFilter] = useState("")
  const [lbMonthOffset, setLbMonthOffset] = useState(0)
  const [lbSearch, setLbSearch] = useState("")
  const [lbStatusFilter, setLbStatusFilter] = useState("")
  const [clearingReport, setClearingReport] = useState<{ id: string; name: string; week: string } | null>(null)
  const [clearing, setClearing] = useState(false)
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())
  const [allInterns, setAllInterns] = useState<any[]>([])
  const [creatingPlaceholder, setCreatingPlaceholder] = useState<string | null>(null)
  const [nameSearch, setNameSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const now = new Date()

  // Week mode - use UTC dates to match server weekStart storage
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
    fetch("/api/employees?search=intern&status=ACTIVE")
      .then(r => r.json())
      .then(d => {
        const interns = (d.employees ?? []).filter((e: any) =>
          (e.jobTitle ?? "").toLowerCase().includes("intern")
        )
        setAllInterns(interns)
      })
      .catch(() => {})
  }, [])

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

  const ovMonday = (() => {
    const d = new Date(now); d.setUTCHours(0,0,0,0)
    const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff + ovWeekOffset * 7)
    return d
  })()
  const ovFriday = new Date(ovMonday); ovFriday.setUTCDate(ovMonday.getUTCDate() + 4)
  const ovWeekLabel = `${format(ovMonday, "MMM d")} – ${format(ovFriday, "MMM d, yyyy")}`

  const ovTargetMonthDate = new Date(now.getFullYear(), now.getMonth() - ovMonthOffset, 1)
  const ovTargetYear = ovTargetMonthDate.getFullYear()
  const ovTargetMonth = ovTargetMonthDate.getMonth()
  const ovMonthLabel = format(ovTargetMonthDate, "MMMM yyyy")

  const ovTargetYearNum = now.getFullYear() - ovYearOffset
  const ovYearLabel = String(ovTargetYearNum)

  const ovCustomRange = (() => {
    if (!ovCustomFrom || !ovCustomTo) return null
    const from = new Date(ovCustomFrom)
    const to = new Date(ovCustomTo)
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return null
    return { from, to }
  })()

  const getOvPeriodLabel = () => {
    if (ovMode === "week") return ovWeekLabel
    if (ovMode === "month") return ovMonthLabel
    if (ovMode === "year") return ovYearLabel
    if (ovCustomRange) return `${format(ovCustomRange.from, "MMM d, yyyy")} – ${format(ovCustomRange.to, "MMM d, yyyy")}`
    return "Select a date range"
  }

  const buildOvFetchParams = (): URLSearchParams | null => {
    if (ovMode === "week") return new URLSearchParams({ week: ovMonday.toISOString() })
    if (ovMode === "month") {
      const from = firstMondayOfMonth(ovTargetYear, ovTargetMonth)
      const to = lastDayOfMonth(ovTargetYear, ovTargetMonth)
      return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    }
    if (ovMode === "year") {
      const from = new Date(ovTargetYearNum, 0, 1)
      const to = new Date(ovTargetYearNum, 11, 31)
      return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    }
    if (!ovCustomRange) return null
    return new URLSearchParams({ from: ovCustomRange.from.toISOString(), to: ovCustomRange.to.toISOString() })
  }

  useEffect(() => {
    if (!canViewAnalytics) return
    const params = buildOvFetchParams()
    if (!params) { setOverview(null); setOverviewLoading(false); return }
    setOverviewLoading(true)
    fetch(`/api/intern-reports/overview?${params}`)
      .then(r => r.json())
      .then(d => setOverview(d))
      .finally(() => setOverviewLoading(false))
  }, [ovMode, ovWeekOffset, ovMonthOffset, ovYearOffset, ovCustomFrom, ovCustomTo, canViewAnalytics])

  const departments =[...new Set(reports.map(r => r.employee?.department?.name).filter(Boolean))]
  const filtered = reports.filter(r => {
    if (deptFilter && r.employee?.department?.name !== deptFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    if (nameSearch) {
      const q = nameSearch.toLowerCase()
      const name = `${r.employee?.firstName ?? ""} ${r.employee?.lastName ?? ""}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })

  // In week mode: extend filtered with interns who have no report for the week
  const reportedEmpIds = new Set(reports.map(r => r.employee?.id).filter(Boolean))
  const internsWithoutReport = (mode === "week" && !statusFilter)
    ? allInterns.filter((e: any) => {
        if (reportedEmpIds.has(e.id)) return false
        if (deptFilter && e.department?.name !== deptFilter) return false
        if (nameSearch) {
          const q = nameSearch.toLowerCase()
          if (!`${e.firstName} ${e.lastName}`.toLowerCase().includes(q)) return false
        }
        return true
      })
    : []

  const openAttendance = (id: string) => {
    const r = reports.find(r => r.id === id)
    if (r) {
      setAttForm({ attendanceRating: r.attendanceRating ?? null, attendanceComment: r.attendanceComment ?? "" })
      setAttendanceId(id)
      setSaveErr("")
    }
  }

  const createPlaceholderAndOpenAttendance = async (emp: any) => {
    setCreatingPlaceholder(emp.id)
    // Create a MISSING placeholder via the cron-like route or directly via a new endpoint
    // We'll use the intern-reports DELETE inverse - we need to create a MISSING report
    // Since there's no direct admin-create endpoint, we'll create the MISSING record server-side
    // by calling a special admin endpoint. For now, use the cron payload pattern.
    // Actually: just open the attendance modal - we'll handle the "no report" case in the API
    // by creating the placeholder there when status check is relaxed.
    // But the current API requires an existing report ID. So we do need to create one first.

    // Create MISSING placeholder via intern-reports API (admin creates on behalf of intern)
    const weekIso = currentMonday.toISOString()
    const res = await fetch("/api/intern-reports/admin-placeholder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: emp.id, weekStart: weekIso }),
    })
    const d = await res.json()
    setCreatingPlaceholder(null)
    if (res.ok && d.report) {
      // Reload reports and open attendance for the new placeholder
      await loadReports()
      setAttForm({ attendanceRating: null, attendanceComment: "" })
      setAttendanceId(d.report.id)
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
    const headers = ["Intern", "Dept", "Hours", "PL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
    const rows = [headers, ...getExportRows()]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `intern-reports-${getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")}.csv`
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
    doc.text("DATA SCIENCE NIGERIA - HRMS", 14, 11)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Intern Reports", 14, 25)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(getPeriodLabel(), W - 14, 18, { align: "right" })
    doc.text(`Generated: ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, W - 14, 26, { align: "right" })

    const headers = ["Intern", "Dept", "Hours", "PL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
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
      doc.text("Confidential - Data Science Nigeria HRMS", 12, H - 5)
      doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 5, { align: "center" })
    }

    doc.save(`intern-reports-${getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")}.pdf`)
  }

  const downloadSingleReport = (r: any) => {
    const { blob, filename } = generateInternReportExcel({
      firstName: r.employee?.firstName ?? "",
      lastName:  r.employee?.lastName  ?? "",
      weekNumber: r.weekNumber,
      weekStart: r.weekStart,
      weekEnd:   r.weekEnd,
      taskDescriptions: r.taskDescriptions,
      dailyReflections: r.dailyReflections,
      generalReflection: r.generalReflection,
    })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  const exportAllZip = async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    const label = getPeriodLabel().replace(/[^a-zA-Z0-9]/g, "-")

    // 1. Individual intern Excel reports
    for (const r of reports) {
      if (!["SUBMITTED","LATE","REVIEWED"].includes(r.status)) continue
      const { blob, filename } = generateInternReportExcel({
        firstName: r.employee?.firstName ?? "",
        lastName:  r.employee?.lastName  ?? "",
        weekNumber: r.weekNumber,
        weekStart: r.weekStart,
        weekEnd:   r.weekEnd,
        taskDescriptions: r.taskDescriptions,
        dailyReflections: r.dailyReflections,
        generalReflection: r.generalReflection,
      })
      zip.file(`reports/${filename}`, await blob.arrayBuffer())
    }

    // 2. Table summary CSV (all reports, unfiltered)
    const tableHeaders = ["Intern", "Dept", "Hours", "PL Score", "Attendance", "Deduction", "Total Score", "Status", "Late"]
    const tableRows = reports.map(r => [
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
    const csv = [tableHeaders, ...tableRows].map(row => row.map(c => `"${c}"`).join(",")).join("\n")
    zip.file(`intern-reports-${label}.csv`, csv)

    // 3. Table summary PDF (all reports, unfiltered)
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const W = doc.internal.pageSize.width
    const H = doc.internal.pageSize.height
    const green: [number, number, number] = [22, 163, 74]
    const white: [number, number, number] = [255, 255, 255]
    const lightGreen: [number, number, number] = [240, 253, 244]
    const HEADER_H = 36
    doc.setFillColor(...green); doc.rect(0, 0, W, HEADER_H, "F")
    doc.setTextColor(...white); doc.setFontSize(8); doc.setFont("helvetica", "normal")
    doc.text("DATA SCIENCE NIGERIA - HRMS", 14, 11)
    doc.setFontSize(18); doc.setFont("helvetica", "bold")
    doc.text("Intern Reports", 14, 25)
    doc.setFontSize(8); doc.setFont("helvetica", "normal")
    doc.text(getPeriodLabel(), W - 14, 18, { align: "right" })
    doc.text(`Generated: ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, W - 14, 26, { align: "right" })
    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows.map(r => r.map(v => String(v ?? ""))),
      startY: HEADER_H + 6,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, overflow: "linebreak", valign: "middle", lineColor: [220, 220, 220] as [number,number,number], lineWidth: 0.1 },
      headStyles: { fillColor: green, textColor: white, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: lightGreen },
      margin: { top: HEADER_H + 6, right: 12, bottom: 18, left: 12 },
    })
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i); doc.setFillColor(248, 250, 248); doc.rect(0, H - 12, W, 12, "F")
      doc.setFontSize(7); doc.setTextColor(80, 80, 80)
      doc.text("Confidential - Data Science Nigeria HRMS", 12, H - 5)
      doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 5, { align: "center" })
    }
    zip.file(`intern-reports-${label}.pdf`, doc.output("arraybuffer"))

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(zipBlob)
    a.download = `intern-reports-${label}.zip`
    a.click()
  }

  const ovFilenameStem = () => {
    if (!overview) return "intern-report-overview"
    const from = format(new Date(overview.rangeStart), "MMM-d-yyyy")
    const to = format(new Date(overview.rangeEnd), "MMM-d-yyyy")
    return `intern-report-overview-${from}-to-${to}`.replace(/[^a-zA-Z0-9-]+/g, "-")
  }

  const exportOverviewCSV = () => {
    if (!overview) return
    const ov = overview
    const periodFrom = format(new Date(ov.rangeStart), "MMM d, yyyy")
    const periodTo = format(new Date(ov.rangeEnd), "MMM d, yyyy")
    const lines: string[] = []
    lines.push(`"Intern Report Overview for ${periodFrom} to ${periodTo}"`)
    lines.push("")
    lines.push('"Metric","Value"')
    const metricRows: [string, string | number][] = [
      [ovMode === "week" ? "Active Interns" : "Expected Reports", ov.totalInterns],
      ["On Time", ov.onTime],
      ["Late", ov.late],
      ["Missing", ov.missing],
      ["Avg TL Score", ov.avgTLPct != null ? `${ov.avgTLPct}%` : "–"],
      ["Avg Attendance Score", ov.avgAttPct != null ? `${ov.avgAttPct}%` : "–"],
      ["Avg Total Score", ov.avgTotalPct != null ? `${ov.avgTotalPct}%` : "–"],
      ["Total Deductions", `-${ov.totalDeductions}`],
      ["Pending PL/TL Reviews", ov.pendingReviews],
      ["Pending Attendance", ov.pendingAttendance],
    ]
    for (const [k, v] of metricRows) lines.push(`"${k}","${v}"`)
    lines.push("")
    lines.push('"Score Distribution"')
    lines.push('"Band","Count"')
    for (const d of ov.distribution) lines.push(`"${d.label}","${d.count}"`)
    lines.push("")
    lines.push('"Team Lead Review Activity"')
    lines.push('"Team Lead","Assigned","Reviewed","Overdue","Avg Score Given"')
    for (const t of ov.teamLeads) {
      lines.push(`"${t.name}","${t.assigned}","${t.reviewed}","${t.overdue}","${t.avgScoreGivenPct != null ? t.avgScoreGivenPct + "%" : "–"}"`)
    }
    const csv = lines.join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${ovFilenameStem()}.csv`
    a.click()
  }

  const exportOverviewPDF = async () => {
    if (!overview) return
    const ov = overview
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const W = doc.internal.pageSize.width
    const H = doc.internal.pageSize.height
    const green: [number, number, number] = [22, 163, 74]
    const white: [number, number, number] = [255, 255, 255]
    const lightGreen: [number, number, number] = [240, 253, 244]
    const HEADER_H = 36
    const periodFrom = format(new Date(ov.rangeStart), "MMM d, yyyy")
    const periodTo = format(new Date(ov.rangeEnd), "MMM d, yyyy")

    doc.setFillColor(...green)
    doc.rect(0, 0, W, HEADER_H, "F")
    doc.setTextColor(...white)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("DATA SCIENCE NIGERIA - HRMS", 14, 11)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Intern Report Overview", 14, 25)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`${periodFrom} – ${periodTo}`, W - 14, 18, { align: "right" })
    doc.text(`Generated: ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, W - 14, 26, { align: "right" })

    autoTable(doc, {
      head: [["Metric", "Value"]],
      body: [
        [ovMode === "week" ? "Active Interns" : "Expected Reports", String(ov.totalInterns)],
        ["On Time", String(ov.onTime)],
        ["Late", String(ov.late)],
        ["Missing", String(ov.missing)],
        ["Avg TL Score", ov.avgTLPct != null ? `${ov.avgTLPct}%` : "–"],
        ["Avg Attendance Score", ov.avgAttPct != null ? `${ov.avgAttPct}%` : "–"],
        ["Avg Total Score", ov.avgTotalPct != null ? `${ov.avgTotalPct}%` : "–"],
        ["Total Deductions", `-${ov.totalDeductions}`],
        ["Pending PL/TL Reviews", String(ov.pendingReviews)],
        ["Pending Attendance", String(ov.pendingAttendance)],
      ],
      startY: HEADER_H + 6,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
      headStyles: { fillColor: green, textColor: white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightGreen },
      margin: { left: 12, right: 12 },
    })

    autoTable(doc, {
      head: [["Score Distribution", "Count"]],
      body: ov.distribution.map((d: any) => [d.label, String(d.count)]),
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
      headStyles: { fillColor: green, textColor: white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightGreen },
      margin: { left: 12, right: 12 },
    })

    autoTable(doc, {
      head: [["Team Lead", "Assigned", "Reviewed", "Overdue", "Avg Score Given"]],
      body: ov.teamLeads.map((t: any) => [t.name, String(t.assigned), String(t.reviewed), String(t.overdue), t.avgScoreGivenPct != null ? `${t.avgScoreGivenPct}%` : "–"]),
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
      headStyles: { fillColor: green, textColor: white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightGreen },
      margin: { left: 12, right: 12 },
    })

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(248, 250, 248)
      doc.rect(0, H - 12, W, 12, "F")
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text("Confidential - Data Science Nigeria HRMS", 12, H - 5)
      doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 5, { align: "center" })
    }

    doc.save(`${ovFilenameStem()}.pdf`)
  }

  const viewingReport = viewingId ? reports.find(r => r.id === viewingId) : null

  return (
    <div className="admin-intern-reports-page" style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <ClipboardList size={22} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Intern Weekly Reports</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>View all intern reports, fill attendance ratings, and track weekly performance.</p>
        </div>
        {tab === "reports" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> CSV
            </button>
            <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> PDF
            </button>
            <div style={{ width: 1, height: 28, background: "var(--border)" }} />
            <button onClick={exportAllZip} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white" }}>
              <Download size={14} /> All Reports (.zip)
            </button>
          </div>
        )}
        {tab === "overview" && canViewAnalytics && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={exportOverviewCSV} disabled={!overview} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: overview ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: overview ? 1 : 0.5 }}>
              <Download size={14} /> CSV
            </button>
            <button onClick={exportOverviewPDF} disabled={!overview} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: overview ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: overview ? 1 : 0.5 }}>
              <Download size={14} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 24, width: "fit-content" }}>
        {(canViewAnalytics ? (["overview", "reports", "leaderboard"] as const) : (["reports", "leaderboard"] as const)).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (() => {
        const ov = overview
        const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }
        const caption: React.CSSProperties = { fontSize: 11, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }
        const StatCard = ({ label, value, note }: { label: string; value: React.ReactNode; note: string }) => (
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{value}</div>
            <div style={caption}>{note}</div>
          </div>
        )
        const ovPeriodPhrase = ovMode === "week" ? "this week" : "this period"
        const ovStatLabel = ovMode === "week" ? "Active Interns" : "Expected Reports"
        return (
          <div>
            {/* Period selector + navigator */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2 }}>
                {(["week", "month", "year", "custom"] as const).map(m => (
                  <button key={m} onClick={() => setOvMode(m)}
                    style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: ovMode === m ? "var(--card)" : "transparent", color: ovMode === m ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: ovMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {ovMode === "custom" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px" }}>
                  <input type="date" value={ovCustomFrom} onChange={e => setOvCustomFrom(e.target.value)}
                    style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
                  <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>to</span>
                  <input type="date" value={ovCustomTo} onChange={e => setOvCustomTo(e.target.value)}
                    style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 16px" }}>
                  <button onClick={() => {
                    if (ovMode === "week") setOvWeekOffset(o => o - 1)
                    else if (ovMode === "month") setOvMonthOffset(o => o + 1)
                    else setOvYearOffset(o => o + 1)
                  }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: "min(200px, 40vw)", textAlign: "center" }}>{getOvPeriodLabel()}</span>
                  <button
                    onClick={() => {
                      if (ovMode === "week") setOvWeekOffset(o => Math.min(o + 1, 0))
                      else if (ovMode === "month") setOvMonthOffset(o => Math.max(o - 1, 0))
                      else setOvYearOffset(o => Math.max(o - 1, 0))
                    }}
                    disabled={(ovMode === "week" && ovWeekOffset === 0) || (ovMode === "month" && ovMonthOffset === 0) || (ovMode === "year" && ovYearOffset === 0)}
                    style={{ background: "none", border: "none", cursor: ((ovMode === "week" && ovWeekOffset === 0) || (ovMode === "month" && ovMonthOffset === 0) || (ovMode === "year" && ovYearOffset === 0)) ? "not-allowed" : "pointer", color: ((ovMode === "week" && ovWeekOffset === 0) || (ovMode === "month" && ovMonthOffset === 0) || (ovMode === "year" && ovYearOffset === 0)) ? "var(--border)" : "var(--muted-foreground)", display: "flex" }}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {ovMode === "custom" && !ovCustomRange ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Select a start and end date to view this period.</div>
            ) : overviewLoading || !ov ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading overview…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Compliance */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>
                  <StatCard label={ovStatLabel} value={ov.totalInterns}
                    note={ovMode === "week"
                      ? "Count of ACTIVE employees with “intern” in their job title, eligible for this week (their intern report start date, if set, is on or before this week)."
                      : `Sum of eligible intern report-slots across every week in ${getOvPeriodLabel()} - each active intern is counted once per week they were eligible.`} />
                  <StatCard label="On Time" value={ov.onTime}
                    note={`Reports submitted by the deadline ${ovPeriodPhrase} - status is Submitted/Late/Reviewed and the lateFlag on the report is false.`} />
                  <StatCard label="Late" value={ov.late}
                    note="Reports with lateFlag = true - submitted after the late threshold but still counted (same-day, Saturday, or Sunday tiers)." />
                  <StatCard label="Missing" value={ov.missing} note={`${ovStatLabel} minus reports actually submitted ${ovPeriodPhrase} - covers both auto-created MISSING placeholders and interns with no row at all yet.`} />
                </div>

                {/* Scores */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>
                  <StatCard label="Avg TL Score" value={ov.avgTLPct != null ? `${ov.avgTLPct}%` : "–"}
                    note="Average of (productivity + L&D + reflections ratings) ÷ 9, across reports a Team Lead has already rated. Reports awaiting review are excluded, not counted as 0." />
                  <StatCard label="Avg Attendance Score" value={ov.avgAttPct != null ? `${ov.avgAttPct}%` : "–"}
                    note="Average attendance rating ÷ 3, across reports that have an attendance rating filled in by an admin." />
                  <StatCard label="Avg Total Score" value={ov.avgTotalPct != null ? `${ov.avgTotalPct}%` : "–"}
                    note="Average of (TL score + attendance score − deductions) ÷ 12, only for reports that have both a TL rating and an attendance rating." />
                  <StatCard label="Total Deductions" value={`-${ov.totalDeductions}`}
                    note={`Sum of pointDeduction across every report ${ovPeriodPhrase}, including late submissions and the flat weekly penalty on MISSING placeholders.`} />
                </div>

                {/* Review backlog */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>
                  <StatCard label="Pending PL/TL Reviews" value={ov.pendingReviews}
                    note="Submitted reports where at least one assigned reviewer has not yet filled their rating (reviewedAt is still null)." />
                  <StatCard label="Pending Attendance" value={ov.pendingAttendance}
                    note="Submitted reports where no admin has filled an attendance rating yet." />
                </div>

                {/* Score distribution */}
                <div style={card}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Score Distribution</div>
                  <div style={caption}>Buckets the Total Score % (see “Avg Total Score” above) of every fully-scored report {ovPeriodPhrase} into bands.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                    {ov.distribution.map((d: { label: string; count: number }) => {
                      const max = Math.max(1, ...ov.distribution.map((x: { count: number }) => x.count))
                      return (
                        <div key={d.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                            <span>{d.label}</span>
                            <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{d.count}</span>
                          </div>
                          <div style={{ height: 10, background: "var(--muted)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(d.count / max) * 100}%`, background: "var(--primary)", borderRadius: 999 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Per-TL review breakdown */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    <Users size={16} color="var(--primary)" /> Team Lead Review Activity
                  </div>
                  <div style={caption}>One row per person assigned as a reviewer on any report {ovPeriodPhrase}. “Overdue” counts reports they still haven't rated, past the reviewer deadline configured in Settings.</div>
                  {ov.teamLeads.length === 0 ? (
                    <div style={{ marginTop: 14, fontSize: 13, color: "var(--muted-foreground)" }}>No reviewers assigned {ovPeriodPhrase}.</div>
                  ) : (
                    <div style={{ overflowX: "auto", marginTop: 14 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "var(--muted)" }}>
                            {["Team Lead", "Assigned", "Reviewed", "Overdue", "Avg Score Given"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ov.teamLeads.map((t: any) => (
                            <tr key={t.employeeId} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{t.name}</td>
                              <td style={{ padding: "10px 14px" }}>{t.assigned}</td>
                              <td style={{ padding: "10px 14px" }}>{t.reviewed}</td>
                              <td style={{ padding: "10px 14px" }}>
                                {t.overdue > 0 ? <span style={{ color: "#DC2626", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={13} />{t.overdue}</span> : <span style={{ color: "var(--muted-foreground)" }}>0</span>}
                              </td>
                              <td style={{ padding: "10px 14px" }}>{t.avgScoreGivenPct != null ? `${t.avgScoreGivenPct}%` : "–"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ ...caption, marginTop: 10 }}>“Avg Score Given” is each Team Lead's own ratings only (productivity + L&D + reflections ÷ 9) - kept separate from the report-level average so a TL who always rates very high or very low stands out.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

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
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: "min(200px, 40vw)", textAlign: "center" }}>{getPeriodLabel()}</span>
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none" }}>
          <option value="">All</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="LATE">Late</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="MISSING">Missed</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--background)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-foreground)", flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={nameSearch} onChange={e => setNameSearch(e.target.value)} placeholder="Search intern name…"
            style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", color: "var(--foreground)", width: 160 }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Intern", "Department", "Hours", "Status", "Late", "PL Score", "Attendance", "Deduction", "Total Score"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", whiteSpace: "nowrap", position: "sticky", right: 0, background: "var(--muted)", zIndex: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : filtered.length === 0 && internsWithoutReport.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>No intern reports for this period.</td></tr>
              ) : (<>
              {filtered.map(r => {
                const plScore = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {r.employee?.firstName} {r.employee?.lastName}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{r.employee?.department?.name ?? "–"}</td>
                    <td style={{ padding: "12px 16px" }}>{(r.totalHours ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <StatusBadge status={r.status} />
                        {(r.status === "SUBMITTED" || r.status === "LATE") && r.reviewers?.some((rv: any) => !rv.reviewedAt) && (
                          <ReviewDeadlineBadge weekStart={r.weekStart} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.lateFlag ? <span style={{ color: "#D97706", fontWeight: 700 }}>Yes</span> : <span style={{ color: "var(--muted-foreground)" }}>No</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.productivityRating !== null ? `${Math.round((plScore / 9) * 100)}%` : "–"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.attendanceRating !== null ? `${r.attendanceRating}/3` : <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>Pending</span>}
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
                    <td style={{ padding: "12px 16px", position: "sticky", right: 0, background: "var(--background)", zIndex: 1, borderLeft: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {r.status !== "MISSING" && (
                          <button onClick={() => setViewingId(r.id)}
                            style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                            View
                          </button>
                        )}
                        {["SUBMITTED","LATE","REVIEWED"].includes(r.status) && (
                          <button onClick={() => downloadSingleReport(r)}
                            style={{ padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <Download size={12} /> Download
                          </button>
                        )}
                        {(r.status === "REVIEWED" || r.status === "MISSING" || r.status === "SUBMITTED" || r.status === "LATE") && (
                          <button onClick={() => openAttendance(r.id)}
                            style={{ padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                            {r.attendanceRating !== null ? "Edit Attendance" : "Fill Attendance"}
                          </button>
                        )}
                        {r.status === "MISSING" && (
                          <button
                            onClick={() => setClearingReport({
                              id: r.id,
                              name: `${r.employee?.firstName} ${r.employee?.lastName}`,
                              week: `${format(new Date(r.weekStart), "MMM d")} – ${format(new Date(r.weekEnd), "MMM d, yyyy")}`,
                            })}
                            style={{ padding: "5px 12px", background: "#DC2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
                            Clear missed record
                          </button>
                        )}
                        {(r.status === "SUBMITTED" || r.status === "LATE") && (
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>Awaiting review</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {internsWithoutReport.map((emp: any) => (
                <tr key={`no-report-${emp.id}`} style={{ borderTop: "1px solid var(--border)", opacity: 0.7 }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{emp.firstName} {emp.lastName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{emp.department?.name ?? "–"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>-</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#F3F4F6", color: "#6B7280" }}>No report</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>-</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>-</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontStyle: "italic" }}>Pending</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>-</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>-</td>
                  <td style={{ padding: "12px 16px", position: "sticky", right: 0, background: "var(--background)", zIndex: 1, borderLeft: "1px solid var(--border)" }}>
                    <button
                      onClick={() => createPlaceholderAndOpenAttendance(emp)}
                      disabled={creatingPlaceholder === emp.id}
                      style={{ padding: "5px 12px", background: "var(--primary)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white", opacity: creatingPlaceholder === emp.id ? 0.6 : 1 }}>
                      {creatingPlaceholder === emp.id ? "…" : "Fill Attendance"}
                    </button>
                  </td>
                </tr>
              ))}
              </>)}
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
        const attRaw = (row: any) => lbMode === "week"
          ? (row.attendanceRating != null ? `${row.attendanceRating}/3` : null)
          : (row.avgAttScore != null ? `${(row.avgAttScore as number).toFixed(1)}/3` : null)
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
            {/* Hero banner - top 3 only for admin */}
            {top3.length > 0 && (
              <div style={{ background: "#15803D", borderRadius: 16, padding: "24px 28px", marginBottom: 16, color: "white", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Top Performers</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>{leaderboard.length} intern{leaderboard.length !== 1 ? "s" : ""} · {lbMode === "week" ? curLbLabel : lbMode === "month" ? lbMonthLabel : "All Time"}</div>
                </div>
                {/* Podium: #2 left · #1 center+highest · #3 right */}
                {(() => {
                  // Positional podium: array order decides 1st/2nd/3rd regardless of tied ranks.
                  // Display order: silver (left), gold (center), bronze (right).
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
                <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                  <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
                    {(["", "SUBMITTED", "LATE", "REVIEWED", "MISSING"] as const).map(s => (
                      <button key={s} onClick={() => setLbStatusFilter(s)}
                        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: lbStatusFilter === s ? "var(--primary)" : "var(--card)", color: lbStatusFilter === s ? "white" : "var(--muted-foreground)" }}>
                        {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
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
                        {["Rank", "Member", "Dept", "🔥 Streak", "PL %", "Att", "Deduction", "Total %"].map(h => (
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
                            <td style={{ padding: "11px 14px", color: isPending(row) ? "var(--muted-foreground)" : "inherit" }}>{isPending(row) ? "Pending" : attRaw(row) ?? "–"}</td>
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

      {/* Attendance Modal */}
      {attendanceId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setAttendanceId(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
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

      {/* Clear Missed Record Confirmation Modal */}
      {clearingReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => !clearing && setClearingReport(null)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 440, width: "100%", padding: "28px 28px 24px", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🗑️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>Clear Missed Record?</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 4 }}>
              <strong>{clearingReport.name}</strong> - {clearingReport.week}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 20 }}>
              This will delete the "Missing" placeholder. The intern will be able to submit their report retroactively.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setClearingReport(null)} disabled={clearing}
                style={{ padding: "9px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setClearing(true)
                  const res = await fetch(`/api/intern-reports/${clearingReport.id}`, { method: "DELETE" })
                  setClearing(false)
                  if (res.ok) {
                    setReports(prev => prev.filter(x => x.id !== clearingReport.id))
                    setClearingReport(null)
                  }
                }}
                disabled={clearing}
                style={{ padding: "9px 24px", background: "#DC2626", border: "none", borderRadius: 8, cursor: clearing ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: clearing ? 0.7 : 1 }}>
                {clearing ? "Clearing…" : "Clear Record"}
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
                            const cellKey = `${day}-${cat.key}`
                            const isExpanded = expandedCells.has(cellKey)
                            const MAX_TASKS = 2
                            const visibleTasks = isExpanded ? tasks : tasks.slice(0, MAX_TASKS)
                            return (
                              <td key={cat.key} style={{ padding: "8px 10px", fontSize: 12, verticalAlign: "top" }}>
                                {tasks.length > 0 ? (
                                  <>
                                    {visibleTasks.map((t, idx) => (
                                      <div key={idx} style={{ marginBottom: 3, color: "var(--foreground)", lineHeight: 1.5 }}>{t}</div>
                                    ))}
                                    {tasks.length > MAX_TASKS && (
                                      <button onClick={() => setExpandedCells(s => {
                                        const next = new Set(s)
                                        isExpanded ? next.delete(cellKey) : next.add(cellKey)
                                        return next
                                      })} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                                        {isExpanded ? "Less" : `+${tasks.length - MAX_TASKS} more`}
                                      </button>
                                    )}
                                    {totalMins > 0 && <div style={{ fontWeight: 700, color: "var(--primary)", marginTop: 3, fontSize: 11 }}>{fmtMinutes(totalMins)}</div>}
                                  </>
                                ) : (
                                  <span style={{ color: "var(--border)" }}>-</span>
                                )}
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

              {/* All Reviewer Feedback */}
              {(viewingReport.reviewers?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reviewer Feedback</p>
                  {viewingReport.reviewers.map((rv: any) => {
                    const plScore = (rv.productivityRating ?? 0) + (rv.ldRating ?? 0) + (rv.reflectionsRating ?? 0)
                    return (
                      <div key={rv.id} style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{rv.reviewer?.firstName} {rv.reviewer?.lastName}</span>
                          {rv.isPrimary && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA", fontWeight: 700 }}>Primary</span>}
                          {rv.productivityRating !== null && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginLeft: "auto" }}>PL: {Math.round((plScore / 9) * 100)}%</span>}
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
        </div>
      )}
      <style>{`
        @media (max-width: 899px) {
          .admin-intern-reports-page { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}
