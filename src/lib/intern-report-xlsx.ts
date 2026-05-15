import * as XLSX from "xlsx"
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

export function generateInternReportXlsx(report: {
  weekStart: Date; weekEnd: Date;
  employee: { firstName: string; lastName: string; jobTitle?: string | null; department?: { name: string } | null };
  totalHours: number; lateFlag: boolean; status: string; personalReflection?: string | null;
  taskDescriptions?: Record<string, any> | null;
  [key: string]: any
}): Buffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Daily breakdown
  const rows: any[][] = []
  rows.push(["Category", "Monday", "", "Tuesday", "", "Wednesday", "", "Thursday", "", "Friday", "", "Weekly Total"])
  rows.push(["", "Tasks", "Hours", "Tasks", "Hours", "Tasks", "Hours", "Tasks", "Hours", "Tasks", "Hours", ""])
  for (const cat of CATEGORIES) {
    const dayData = (report.taskDescriptions as any)?.[cat.key]
    if (typeof dayData === "string") {
      // Legacy format: single row
      rows.push([cat.label, dayData, report[cat.hoursKey] ?? 0, "", "", "", "", "", "", "", "", report[cat.hoursKey] ?? 0])
    } else {
      const weekTotal = DAYS_LIST.reduce((s, d) => s + (parseFloat(dayData?.[d]?.hours || "0") || 0), 0)
      rows.push([
        cat.label,
        dayData?.monday?.tasks ?? "", parseFloat(dayData?.monday?.hours || "0") || "",
        dayData?.tuesday?.tasks ?? "", parseFloat(dayData?.tuesday?.hours || "0") || "",
        dayData?.wednesday?.tasks ?? "", parseFloat(dayData?.wednesday?.hours || "0") || "",
        dayData?.thursday?.tasks ?? "", parseFloat(dayData?.thursday?.hours || "0") || "",
        dayData?.friday?.tasks ?? "", parseFloat(dayData?.friday?.hours || "0") || "",
        weekTotal > 0 ? weekTotal : ""
      ])
    }
  }
  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 8 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws1, "Hours Breakdown")

  // Sheet 2: Details
  const detailsData = [
    ["Field", "Value"],
    ["Intern Name", `${report.employee.firstName} ${report.employee.lastName}`],
    ["Job Title", report.employee.jobTitle ?? ""],
    ["Department", report.employee.department?.name ?? ""],
    ["Week", `${format(new Date(report.weekStart), "MMM d")} – ${format(new Date(report.weekEnd), "MMM d, yyyy")}`],
    ["Status", report.status],
    ["Late Submission", report.lateFlag ? "Yes" : "No"],
    ["Total Hours", report.totalHours ?? 0],
    ["Personal Reflection", report.personalReflection ?? ""],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(detailsData)
  ws2["!cols"] = [{ wch: 22 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws2, "Details")

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}
