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

export function generateInternReportXlsx(report: {
  weekStart: Date; weekEnd: Date;
  employee: { firstName: string; lastName: string; jobTitle?: string | null; department?: { name: string } | null };
  totalHours: number; lateFlag: boolean; status: string; personalReflection?: string | null;
  taskDescriptions?: Record<string, string> | null;
  [key: string]: any
}): Buffer {
  const wb = XLSX.utils.book_new()
  const descs: Record<string, string> = (report.taskDescriptions as any) ?? {}

  // Sheet 1: Hours Breakdown
  const hoursData = [
    ["Category", "Tasks Done This Week", "Hours"],
    ...CATEGORIES.map(r => [r.label, descs[r.key] || "", +(report[r.hoursKey] ?? 0)]),
    ["TOTAL", "", report.totalHours ?? 0],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(hoursData)
  ws1["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 10 }]
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
