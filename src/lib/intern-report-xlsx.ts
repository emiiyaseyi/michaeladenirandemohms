import * as XLSX from "xlsx"
import { format } from "date-fns"

const HOUR_ROWS = [
  { key: "mainProjectHours",    label: "Main Project" },
  { key: "consultingHours",     label: "Consulting" },
  { key: "specialProjectHours", label: "Special Project" },
  { key: "trainingHours",       label: "Training" },
  { key: "newBusinessHours",    label: "New Business" },
  { key: "reportingDocHours",   label: "Reporting / Documentation" },
  { key: "operationalHours",    label: "Operational Support" },
  { key: "researchHours",       label: "Research" },
  { key: "meetingsHours",       label: "Meetings" },
  { key: "communityHours",      label: "Community" },
  { key: "representationHours", label: "Representation" },
  { key: "selfDevHours",        label: "Self Development" },
]

export function generateInternReportXlsx(report: {
  weekStart: Date; weekEnd: Date;
  employee: { firstName: string; lastName: string; jobTitle?: string | null; department?: { name: string } | null };
  totalHours: number; lateFlag: boolean; status: string; personalReflection?: string | null;
  [key: string]: any
}): Buffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Hours Breakdown
  const hoursData = [
    ["Category", "Hours"],
    ...HOUR_ROWS.map(r => [r.label, +(report[r.key] ?? 0)]),
    ["TOTAL", report.totalHours ?? 0],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(hoursData)
  ws1["!cols"] = [{ wch: 30 }, { wch: 10 }]
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
