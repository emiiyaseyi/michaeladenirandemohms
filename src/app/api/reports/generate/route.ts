import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { format } from "date-fns"

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n")
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canViewAllEmployees"]) return forbidden()

  const body = await req.json()
  const { category, reportType, dateFrom, dateTo, departmentId, empType, status, employeeId } = body

  const dateFilter: any = {}
  if (dateFrom) dateFilter.gte = new Date(dateFrom)
  if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); dateFilter.lte = d }

  let csv = ""
  let filename = "report.csv"

  try {
    if (category === "employee") {
      const where: any = {}
      if (status && status !== "all") where.employeeStatus = status
      if (departmentId && departmentId !== "all") where.departmentId = departmentId
      if (empType && empType !== "all") where.category = empType
      if (employeeId && employeeId !== "all") where.id = employeeId

      const employees = await prisma.employee.findMany({
        where,
        include: { department: true, user: { select: { email: true } } },
        orderBy: { firstName: "asc" },
      })

      if (reportType === "Headcount Report") {
        filename = "headcount_report.csv"
        const byDept = new Map<string, number>()
        for (const e of employees) {
          const d = (e.department as any)?.name ?? "No Department"
          byDept.set(d, (byDept.get(d) ?? 0) + 1)
        }
        csv = toCSV(["Department", "Headcount"], [...byDept.entries()].map(([dept, count]) => [dept, count]))
      } else if (reportType === "New Hires Report") {
        filename = "new_hires_report.csv"
        const filtered = employees.filter(e => {
          if (!e.hireDate) return false
          if (dateFrom && e.hireDate < new Date(dateFrom)) return false
          if (dateTo && e.hireDate > new Date(dateTo)) return false
          return true
        })
        csv = toCSV(
          ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Hire Date", "Status"],
          filtered.map(e => [e.employeeId, e.firstName, e.lastName, (e.user as any)?.email ?? "", e.jobTitle ?? "", (e.department as any)?.name ?? "", e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : "", e.employeeStatus])
        )
      } else if (reportType === "Turnover Report") {
        filename = "turnover_report.csv"
        const exited = employees.filter(e => (e.employeeStatus as string) === "EXITED" || (e.employeeStatus as string) === "RESIGNED" || (e.employeeStatus as string) === "TERMINATED")
        csv = toCSV(
          ["Employee ID", "First Name", "Last Name", "Job Title", "Department", "End Date", "Status"],
          exited.map(e => [e.employeeId, e.firstName, e.lastName, e.jobTitle ?? "", (e.department as any)?.name ?? "", e.endDate ? format(e.endDate as Date, "yyyy-MM-dd") : "", e.employeeStatus])
        )
      } else {
        filename = "employee_roster.csv"
        csv = toCSV(
          ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Employment Type", "Category", "Status", "Hire Date"],
          employees.map(e => [e.employeeId, e.firstName, e.lastName, (e.user as any)?.email ?? "", e.jobTitle ?? "", (e.department as any)?.name ?? "", e.employmentType, e.category, e.employeeStatus, e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : ""])
        )
      }
    } else if (category === "leave") {
      const leaveWhere: any = {}
      if (Object.keys(dateFilter).length > 0) leaveWhere.createdAt = dateFilter
      if (departmentId && departmentId !== "all") leaveWhere.departmentId = departmentId
      if (employeeId && employeeId !== "all") leaveWhere.employeeId = employeeId

      if (reportType === "Leave Requests") {
        filename = "leave_requests.csv"
        const requests = await prisma.leaveRequest.findMany({
          where: leaveWhere,
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true } },
            leaveType: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        csv = toCSV(
          ["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Status", "Submitted"],
          requests.map(r => [
            (r.employee as any)?.employeeId ?? "",
            `${(r.employee as any)?.firstName ?? ""} ${(r.employee as any)?.lastName ?? ""}`.trim(),
            (r.leaveType as any)?.name ?? "",
            format(r.startDate, "yyyy-MM-dd"),
            format(r.endDate, "yyyy-MM-dd"),
            r.days,
            r.status,
            format(r.createdAt, "yyyy-MM-dd"),
          ])
        )
      } else if (reportType === "Leave Balances") {
        filename = "leave_balances.csv"
        const year = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear()
        const balances = await prisma.leaveBalance.findMany({
          where: { year, ...(employeeId && employeeId !== "all" ? { employeeId } : {}) },
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true } },
            leaveType: { select: { name: true } },
          },
        })
        csv = toCSV(
          ["Employee ID", "Employee Name", "Leave Type", "Year", "Allocated", "Used", "Pending", "Remaining"],
          balances.map(b => [
            (b.employee as any)?.employeeId ?? "",
            `${(b.employee as any)?.firstName ?? ""} ${(b.employee as any)?.lastName ?? ""}`.trim(),
            (b.leaveType as any)?.name ?? "",
            b.year,
            b.allocated,
            b.used,
            b.pending,
            Math.max(0, b.allocated - b.used - b.pending),
          ])
        )
      } else {
        filename = "leave_utilization.csv"
        const requests = await prisma.leaveRequest.findMany({
          where: { ...leaveWhere, status: "APPROVED" },
          include: { leaveType: { select: { name: true } } },
        })
        const byType = new Map<string, number>()
        for (const r of requests) {
          const t = (r.leaveType as any)?.name ?? "Unknown"
          byType.set(t, (byType.get(t) ?? 0) + r.days)
        }
        csv = toCSV(["Leave Type", "Total Days Taken"], [...byType.entries()].map(([t, d]) => [t, d]))
      }
    } else if (category === "payroll") {
      const where: any = {}
      if (status && status !== "all") where.employeeStatus = status
      if (departmentId && departmentId !== "all") where.departmentId = departmentId
      if (employeeId && employeeId !== "all") where.id = employeeId

      const employees = await prisma.employee.findMany({
        where,
        include: { department: true, user: { select: { email: true } } },
        orderBy: { firstName: "asc" },
      })

      filename = reportType === "Payslips Summary" ? "payslips_summary.csv" : "salary_analysis.csv"
      csv = toCSV(
        ["Employee ID", "First Name", "Last Name", "Job Title", "Department", "Gross Salary", "Employment Type"],
        employees.map(e => [e.employeeId, e.firstName, e.lastName, e.jobTitle ?? "", (e.department as any)?.name ?? "", e.grossSalary ?? 0, e.employmentType])
      )
    } else {
      const where: any = {}
      if (status && status !== "all") where.employeeStatus = status
      if (departmentId && departmentId !== "all") where.departmentId = departmentId
      if (employeeId && employeeId !== "all") where.id = employeeId

      const employees = await prisma.employee.findMany({
        where,
        include: { department: true, user: { select: { email: true } } },
        orderBy: { firstName: "asc" },
      })

      filename = "custom_report.csv"
      csv = toCSV(
        ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Status", "Employment Type", "Category"],
        employees.map(e => [e.employeeId, e.firstName, e.lastName, (e.user as any)?.email ?? "", e.jobTitle ?? "", (e.department as any)?.name ?? "", e.employeeStatus, e.employmentType, e.category])
      )
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    console.error("[POST /api/reports/generate]", e)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
