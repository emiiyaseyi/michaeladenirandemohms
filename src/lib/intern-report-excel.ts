import * as XLSX from "xlsx"
import { format } from "date-fns"

const CATEGORIES = [
  { key: "mainProject",    label: "Main Project" },
  { key: "specialProject", label: "Special Project" },
  { key: "training",       label: "Training" },
  { key: "reportingDoc",   label: "Reporting/Documentation" },
  { key: "operational",    label: "Operational support" },
  { key: "research",       label: "Research" },
  { key: "meetings",       label: "Meetings" },
  { key: "community",      label: "Community" },
  { key: "representation", label: "Representation" },
  { key: "selfDev",        label: "Self Development" },
]

const DAYS: { key: string; label: string }[] = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",  label: "Tuesday" },
  { key: "wednesday",label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday",   label: "Friday" },
]

// Reflection day keys used in dailyReflections object
const REFL_KEYS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri",
}

function parseMinutes(raw: string): number {
  if (!raw) return 0
  const s = String(raw).trim().toLowerCase()
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) return +colonMatch[1] * 60 + +colonMatch[2]
  const hm = s.match(/(\d+)\s*h(?:our|r)?s?\s*(?:(\d+)\s*m(?:in)?s?)?/)
  if (hm) return +hm[1] * 60 + (hm[2] ? +hm[2] : 0)
  const mOnly = s.match(/^(\d+)\s*m(?:in)?s?$/)
  if (mOnly) return +mOnly[1]
  const num = parseFloat(s)
  return isNaN(num) ? 0 : Math.round(num)
}

function fmtHours(totalMins: number): string {
  if (!totalMins) return ""
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h && m) return `${h}hr${h > 1 ? "s" : ""} ${m}mins`
  if (h) return `${h}hr${h > 1 ? "s" : ""}`
  return `${m}mins`
}

// Column indices (0-based): B=1, C=2, D=3 … V=21, W=22, X=23
// Col layout: [B] Day | [C,D] Cat1 task+hrs | [E,F] Cat2 | … | [U,V] Cat10 | [W] Total | [X] Reflection
const COL_DAY = 1         // B
const COL_TOTAL = 22      // W
const COL_REFL = 23       // X

function catTaskCol(catIdx: number) { return 2 + catIdx * 2 }      // C, E, G, …
function catHrsCol(catIdx: number)  { return 2 + catIdx * 2 + 1 }  // D, F, H, …

// Colours matching the template (ARGB hex for xlsx)
const CLR_TITLE   = "FF0C2340"  // dark blue bg (title row)
const CLR_NAME    = "FFD7E4F3"  // light blue bg (name row)
const CLR_TASK    = "FFFCE4D6"  // cream/tan (task cols) - approx RGB 10086143
const CLR_HRS     = "FFD9E1F2"  // light blue (hours cols) - approx RGB 14348258
const CLR_DAY     = "FFD6DCE4"  // grey (day label col) - approx RGB 14395790
const CLR_HEADER  = "FFD6DCE4"  // same grey for header row bg
const CLR_WHITE   = "FFFFFFFF"
const CLR_TITLE_FONT = "FFFFFFFF"  // white text on dark title
const CLR_DARK    = "FF000000"

function fill(fgColor: string): any {
  return { patternType: "solid", fgColor: { rgb: fgColor.replace(/^FF/, "") } }
}

function cellStyle(bgColor: string, bold = false, wrapText = true, fontSize = 10): any {
  return {
    fill: fill(bgColor),
    font: { bold, sz: fontSize, color: { rgb: bgColor === CLR_TITLE ? CLR_TITLE_FONT.replace(/^FF/, "") : CLR_DARK.replace(/^FF/, "") } },
    alignment: { wrapText, vertical: "top" },
    border: {
      top:    { style: "thin", color: { rgb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { rgb: "FFBFBFBF" } },
      left:   { style: "thin", color: { rgb: "FFBFBFBF" } },
      right:  { style: "thin", color: { rgb: "FFBFBFBF" } },
    },
  }
}

function makeCell(value: string | number, style: any): any {
  return { v: value, t: typeof value === "number" ? "n" : "s", s: style }
}

export function generateInternReportExcel(report: {
  firstName: string
  lastName: string
  weekNumber?: number | null
  weekStart: string | Date
  weekEnd: string | Date
  taskDescriptions: any
  dailyReflections: any
  generalReflection?: string | null
}): { blob: Blob; filename: string } {
  const ws_start = new Date(report.weekStart)
  const ws_end   = new Date(report.weekEnd)
  const dateRange = `${format(ws_start, "d MMM")} - ${format(ws_end, "d MMM yyyy")}`
  const weekLabel = report.weekNumber != null ? `WEEK ${report.weekNumber}` : "WEEKLY REPORT"
  const fullName  = `${report.firstName} ${report.lastName}`.toUpperCase()

  // Total columns: B(day) + 10×(task+hrs) + Total + Reflection = 1 + 20 + 1 + 1 = 23 → cols B..X
  const TOTAL_COLS = 24  // A..X

  const ws: XLSX.WorkSheet = {}
  const merges: XLSX.Range[] = []
  let row = 0  // 0-based

  function setCell(r: number, c: number, cell: XLSX.CellObject) {
    const addr = XLSX.utils.encode_cell({ r, c })
    ws[addr] = cell
  }

  function mergeRow(r: number, fromCol: number, toCol: number) {
    merges.push({ s: { r, c: fromCol }, e: { r, c: toCol } })
  }

  // ── ROW 0: Title ──────────────────────────────────────────────────────────
  const titleStyle = cellStyle(CLR_TITLE, true, false, 12)
  titleStyle.font.color = { rgb: "FFFFFF" }
  setCell(row, COL_DAY, makeCell(
    `INTERNS WEEKLY TASK REPORTING AND TRACKING - ${weekLabel}(${dateRange})`,
    titleStyle,
  ))
  // Fill rest of title row with same style (empty)
  for (let c = 0; c < TOTAL_COLS; c++) {
    if (c !== COL_DAY) setCell(row, c, makeCell("", titleStyle))
  }
  mergeRow(row, COL_DAY, COL_REFL)
  row++

  // ── ROW 1: Name ───────────────────────────────────────────────────────────
  const nameStyle = cellStyle(CLR_NAME, true, false)
  setCell(row, COL_DAY, makeCell(`Name : ${fullName}`, nameStyle))
  for (let c = 0; c < TOTAL_COLS; c++) {
    if (c !== COL_DAY) setCell(row, c, makeCell("", nameStyle))
  }
  mergeRow(row, COL_DAY, COL_REFL)
  row++

  // ── ROW 2: Headers ────────────────────────────────────────────────────────
  const hdrDay   = cellStyle(CLR_HEADER, true, false)
  const hdrTask  = cellStyle(CLR_TASK,   true, false)
  const hdrHrs   = cellStyle(CLR_HRS,    true, false)

  setCell(row, COL_DAY, makeCell("Day of the week", hdrDay))
  CATEGORIES.forEach((cat, i) => {
    setCell(row, catTaskCol(i), makeCell(cat.label, hdrTask))
    setCell(row, catHrsCol(i),  makeCell("Hours",   hdrHrs))
  })
  setCell(row, COL_TOTAL, makeCell("Total Hours",         hdrHrs))
  setCell(row, COL_REFL,  makeCell("Personal Reflections",hdrHrs))
  // Fill col A
  setCell(row, 0, makeCell("", hdrDay))
  row++

  // ── ROWS: Days ────────────────────────────────────────────────────────────
  const styDay   = cellStyle(CLR_DAY,   true,  false)
  const styTask  = cellStyle(CLR_TASK,  false, true)
  const styHrs   = cellStyle(CLR_HRS,   false, false)
  const styTotal = cellStyle(CLR_HRS,   true,  false)
  const styRefl  = cellStyle(CLR_HRS,   false, true)
  const styEmpty = cellStyle(CLR_WHITE, false, false)

  for (const day of DAYS) {
    const reflKey = REFL_KEYS[day.key]
    const reflection = (report.dailyReflections as any)?.[reflKey] ?? ""

    // Gather all tasks across all categories for this day
    // Build per-category task arrays
    const catTasks: Array<Array<{ text: string; minutes: number }>> = CATEGORIES.map(cat => {
      const cellEntries = (report.taskDescriptions as any)?.[cat.key]?.[day.key]
      if (!cellEntries) return []
      if (Array.isArray(cellEntries)) {
        return cellEntries
          .filter((t: any) => t?.text?.trim())
          .map((t: any) => ({ text: t.text, minutes: parseMinutes(String(t.minutes ?? "")) }))
      }
      // Legacy string format
      if (typeof cellEntries === "string" && cellEntries.trim()) {
        const parts = cellEntries.split("|")
        return [{ text: parts[0] ?? "", minutes: parseMinutes(parts[1] ?? "") }]
      }
      return []
    })

    // Max rows for this day = max tasks in any category, min 1
    const maxRows = Math.max(1, ...catTasks.map(t => t.length))

    // Daily total
    const dayMins = catTasks.reduce((sum, tasks) => sum + tasks.reduce((s, t) => s + t.minutes, 0), 0)

    for (let i = 0; i < maxRows; i++) {
      const isFirst = i === 0

      // Col A (unused, fill white)
      setCell(row, 0, makeCell("", styEmpty))

      // Day label - only on first row
      setCell(row, COL_DAY, isFirst ? makeCell(day.label, styDay) : makeCell("", styDay))

      // Category task + hours columns
      CATEGORIES.forEach((_, ci) => {
        const task = catTasks[ci]?.[i]
        setCell(row, catTaskCol(ci), makeCell(task?.text ?? "", styTask))
        setCell(row, catHrsCol(ci),  makeCell(task ? fmtHours(task.minutes) : "", styHrs))
      })

      // Total hours - only on first row
      setCell(row, COL_TOTAL, isFirst ? makeCell(fmtHours(dayMins), styTotal) : makeCell("", styHrs))

      // Personal reflection - only on first row
      setCell(row, COL_REFL, isFirst ? makeCell(reflection, styRefl) : makeCell("", styRefl))

      row++
    }
  }

  // ── General Reflection ────────────────────────────────────────────────────
  const styGenLabel = cellStyle(CLR_NAME, true, false)
  const styGen      = cellStyle(CLR_HRS,  false, true)

  // Label row
  setCell(row, 0,        makeCell("", styGenLabel))
  setCell(row, COL_DAY,  makeCell("General / Weekly Reflection", styGenLabel))
  for (let c = COL_DAY + 1; c <= COL_REFL; c++) setCell(row, c, makeCell("", styGenLabel))
  mergeRow(row, COL_DAY, COL_REFL)
  row++

  // Content row
  setCell(row, 0,       makeCell("", styGen))
  setCell(row, COL_DAY, makeCell(report.generalReflection ?? "", styGen))
  for (let c = COL_DAY + 1; c <= COL_REFL; c++) setCell(row, c, makeCell("", styGen))
  mergeRow(row, COL_DAY, COL_REFL)
  row++

  // ── Sheet metadata ─────────────────────────────────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: COL_REFL } })
  ws["!merges"] = merges

  // Column widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 2 },   // A (unused margin)
    { wch: 14 },  // B (day)
  ]
  for (let i = 0; i < CATEGORIES.length; i++) {
    colWidths.push({ wch: 28 })  // task col
    colWidths.push({ wch: 10 })  // hours col
  }
  colWidths.push({ wch: 12 })   // Total Hours
  colWidths.push({ wch: 40 })   // Personal Reflections
  ws["!cols"] = colWidths

  // ── Build workbook ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true })
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

  // Filename
  const safeName = `${report.firstName}_${report.lastName}`.toLowerCase().replace(/\s+/g, "_")
  const filename = report.weekNumber != null
    ? `${safeName}_weekly_report_week_${report.weekNumber}.xlsx`
    : `${safeName}_weekly_report_${format(ws_start, "MMM_dd")}_${format(ws_end, "MMM_dd_yyyy")}.xlsx`.toLowerCase()

  return { blob, filename }
}
