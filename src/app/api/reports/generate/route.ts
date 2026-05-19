import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { format } from "date-fns"

const FIELD_MAP: Record<string, { label: string; get: (e: any) => string | number | null }> = {
  employeeId:     { label: "Employee ID",      get: (e) => e.employeeId },
  firstName:      { label: "First Name",       get: (e) => e.firstName },
  lastName:       { label: "Last Name",        get: (e) => e.lastName },
  email:          { label: "Email",            get: (e) => e.user?.email ?? "" },
  phone:          { label: "Phone",            get: (e) => e.phone ?? "" },
  department:     { label: "Department",       get: (e) => e.department?.name ?? "" },
  jobTitle:       { label: "Job Title",        get: (e) => e.jobTitle ?? "" },
  employmentType: { label: "Employment Type",  get: (e) => e.employmentType ?? "" },
  status:         { label: "Status",           get: (e) => e.employeeStatus ?? "" },
  hireDate:       { label: "Hire Date",        get: (e) => e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : "" },
  dob:            { label: "Date of Birth",    get: (e) => e.dateOfBirth ? format(e.dateOfBirth, "yyyy-MM-dd") : "" },
  gender:         { label: "Gender",           get: (e) => e.gender ?? "" },
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canViewAllEmployees"]) return forbidden()

  const body = await req.json()
  const { category, reportType, dateFrom, dateTo, departmentId, empType, status, employeeId, selectedFields } = body

  let title = reportType || "Report"
  let subtitle = ""
  let headers: string[] = []
  let rows: (string | number | null)[][] = []
  let filename = "report"

  const parts: string[] = []
  if (dateFrom && dateTo) parts.push(`${format(new Date(dateFrom), "MMM d, yyyy")} – ${format(new Date(dateTo), "MMM d, yyyy")}`)
  else if (dateFrom) parts.push(`From ${format(new Date(dateFrom), "MMM d, yyyy")}`)
  else if (dateTo) parts.push(`To ${format(new Date(dateTo), "MMM d, yyyy")}`)
  if (status && status !== "all") parts.push(`Status: ${status}`)
  subtitle = parts.join("  ·  ") || "All records"

  const dateFilter: any = {}
  if (dateFrom) dateFilter.gte = new Date(dateFrom)
  if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); dateFilter.lte = d }

  try {
    if (category === "employee") {
      const where: any = {}
      if (status && status !== "all") where.employeeStatus = status
      if (departmentId && departmentId !== "all") where.departmentId = departmentId
      if (empType && empType !== "all") where.employmentType = empType
      if (employeeId && employeeId !== "all") where.id = employeeId

      const employees = await prisma.employee.findMany({
        where,
        include: { department: true, user: { select: { email: true } } },
        orderBy: { firstName: "asc" },
      })

      if (reportType === "Headcount Report") {
        title = "Headcount Report"; filename = "headcount_report"
        const byDept = new Map<string, { total: number; active: number; onLeave: number; other: number }>()
        for (const e of employees) {
          const d = (e.department as any)?.name ?? "No Department"
          const cur = byDept.get(d) ?? { total: 0, active: 0, onLeave: 0, other: 0 }
          cur.total++
          if (e.employeeStatus === "ACTIVE") cur.active++
          else if (e.employeeStatus === "ON_LEAVE") cur.onLeave++
          else cur.other++
          byDept.set(d, cur)
        }
        headers = ["Department", "Total", "Active", "On Leave", "Other"]
        rows = [...byDept.entries()].map(([dept, d]) => [dept, d.total, d.active, d.onLeave, d.other])
        const totals = { total: employees.length, active: employees.filter(e => e.employeeStatus === "ACTIVE").length, onLeave: employees.filter(e => e.employeeStatus === "ON_LEAVE").length }
        rows.push(["TOTAL", totals.total, totals.active, totals.onLeave, totals.total - totals.active - totals.onLeave])

      } else if (reportType === "New Hires Report") {
        title = "New Hires Report"; filename = "new_hires_report"
        const filtered = employees.filter(e => {
          if (!e.hireDate) return false
          if (dateFrom && new Date(e.hireDate) < new Date(dateFrom)) return false
          if (dateTo && new Date(e.hireDate) > new Date(dateTo)) return false
          return true
        })
        headers = ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Hire Date", "Status"]
        rows = filtered.map(e => [e.employeeId, e.firstName, e.lastName, (e.user as any)?.email ?? "", e.jobTitle ?? "", (e.department as any)?.name ?? "", e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : "", e.employeeStatus])

      } else if (reportType === "Turnover Report") {
        title = "Turnover Report"; filename = "turnover_report"
        const exited = employees.filter(e => ["TERMINATED", "RESIGNED"].includes(e.employeeStatus as string))
        headers = ["Employee ID", "First Name", "Last Name", "Job Title", "Department", "End Date", "Status"]
        rows = exited.map(e => [e.employeeId, e.firstName, e.lastName, e.jobTitle ?? "", (e.department as any)?.name ?? "", e.endDate ? format(e.endDate as Date, "yyyy-MM-dd") : "", e.employeeStatus])

      } else {
        title = "Employee Roster"; filename = "employee_roster"
        headers = ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Employment Type", "Status", "Hire Date"]
        rows = employees.map(e => [e.employeeId, e.firstName, e.lastName, (e.user as any)?.email ?? "", e.jobTitle ?? "", (e.department as any)?.name ?? "", e.employmentType, e.employeeStatus, e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : ""])
      }

    } else if (category === "leave") {
      const leaveWhere: any = {}
      if (Object.keys(dateFilter).length > 0) leaveWhere.createdAt = dateFilter
      if (departmentId && departmentId !== "all") leaveWhere.departmentId = departmentId
      if (employeeId && employeeId !== "all") leaveWhere.employeeId = employeeId

      if (reportType === "Leave Requests") {
        title = "Leave Requests Report"; filename = "leave_requests"
        const requests = await prisma.leaveRequest.findMany({
          where: leaveWhere,
          include: { employee: { select: { employeeId: true, firstName: true, lastName: true } }, leaveType: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
        headers = ["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Status", "Submitted"]
        rows = requests.map(r => [(r.employee as any)?.employeeId ?? "", `${(r.employee as any)?.firstName ?? ""} ${(r.employee as any)?.lastName ?? ""}`.trim(), (r.leaveType as any)?.name ?? "", format(r.startDate, "yyyy-MM-dd"), format(r.endDate, "yyyy-MM-dd"), r.days, r.status, format(r.createdAt, "yyyy-MM-dd")])

      } else if (reportType === "Leave Balances") {
        title = "Leave Balances Report"; filename = "leave_balances"
        const year = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear()
        const balances = await prisma.leaveBalance.findMany({
          where: { year, ...(employeeId && employeeId !== "all" ? { employeeId } : {}) },
          include: { employee: { select: { employeeId: true, firstName: true, lastName: true } }, leaveType: { select: { name: true } } },
        })
        // Compute used/pending dynamically — stored .used/.pending columns aren't maintained.
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year + 1, 0, 1)
        const balancePairs = balances.map(b => ({ employeeId: b.employeeId, leaveTypeId: b.leaveTypeId }))
        const reqRows = balancePairs.length > 0
          ? await prisma.leaveRequest.findMany({
              where: { status: { in: ["PENDING", "APPROVED"] }, startDate: { gte: yearStart, lt: yearEnd }, OR: balancePairs },
              select: { employeeId: true, leaveTypeId: true, days: true, status: true },
            })
          : []
        const stats = new Map<string, { used: number; pending: number }>()
        for (const r of reqRows) {
          const key = `${r.employeeId}:${r.leaveTypeId}`
          const cur = stats.get(key) ?? { used: 0, pending: 0 }
          if (r.status === "APPROVED") cur.used += r.days
          else if (r.status === "PENDING") cur.pending += r.days
          stats.set(key, cur)
        }
        headers = ["Employee ID", "Employee Name", "Leave Type", "Year", "Allocated", "Used", "Pending", "Remaining"]
        rows = balances.map(b => {
          const s = stats.get(`${b.employeeId}:${b.leaveTypeId}`) ?? { used: 0, pending: 0 }
          return [(b.employee as any)?.employeeId ?? "", `${(b.employee as any)?.firstName ?? ""} ${(b.employee as any)?.lastName ?? ""}`.trim(), (b.leaveType as any)?.name ?? "", b.year, b.allocated, s.used, s.pending, Math.max(0, b.allocated - s.used - s.pending)]
        })

      } else {
        title = "Leave Utilization Report"; filename = "leave_utilization"
        const requests = await prisma.leaveRequest.findMany({
          where: { ...leaveWhere, status: "APPROVED" },
          include: { leaveType: { select: { name: true } } },
        })
        const byType = new Map<string, { count: number; days: number }>()
        for (const r of requests) {
          const t = (r.leaveType as any)?.name ?? "Unknown"
          const cur = byType.get(t) ?? { count: 0, days: 0 }
          cur.count++; cur.days += r.days
          byType.set(t, cur)
        }
        headers = ["Leave Type", "Total Requests", "Total Days Taken", "Avg Days Per Request"]
        rows = [...byType.entries()].map(([t, d]) => [t, d.count, d.days, d.count > 0 ? +(d.days / d.count).toFixed(1) : 0])
      }

    } else if (category === "performance") {
      const employeeFilter: any = {}
      if (departmentId && departmentId !== "all") employeeFilter.departmentId = departmentId
      if (empType && empType !== "all") employeeFilter.employmentType = empType
      if (status && status !== "all") employeeFilter.employeeStatus = status

      const kpiWhere: any = {
        ...(employeeId && employeeId !== "all" ? { employeeId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        ...(Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : {}),
      }

      if (reportType === "Appraisals Report") {
        title = "Appraisals Report"; filename = "appraisals_report"
        const kpis = await prisma.kPI.findMany({
          where: kpiWhere,
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
            cycle: { select: { name: true, year: true, half: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        headers = ["Employee ID", "Employee Name", "Department", "KPI Title", "Weight", "Self Score", "Manager Score", "Final Score", "Cycle"]
        rows = kpis.map((k: any) => [
          k.employee?.employeeId ?? "",
          `${k.employee?.firstName ?? ""} ${k.employee?.lastName ?? ""}`.trim(),
          k.employee?.department?.name ?? "",
          k.title ?? "",
          k.weight ?? "",
          k.selfScore ?? "",
          k.managerScore ?? "",
          k.finalScore ?? "",
          k.cycle ? `${k.cycle.name} ${k.cycle.year}` : "",
        ])

      } else {
        title = reportType || "KPI Summary"; filename = "kpi_summary"
        const kpis = await prisma.kPI.findMany({
          where: kpiWhere,
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        })
        headers = ["Employee ID", "Employee Name", "Department", "KPI Title", "Target", "Achieved", "Score", "Status"]
        rows = kpis.map((k: any) => [
          k.employee?.employeeId ?? "",
          `${k.employee?.firstName ?? ""} ${k.employee?.lastName ?? ""}`.trim(),
          k.employee?.department?.name ?? "",
          k.title ?? "",
          k.target ?? "",
          k.achieved ?? "",
          k.score ?? "",
          k.status ?? "",
        ])
      }

    } else {
      // Custom / Build Your Own
      title = "Custom Report"; filename = "custom_report"
      const where: any = {}
      if (status && status !== "all") where.employeeStatus = status
      if (departmentId && departmentId !== "all") where.departmentId = departmentId
      if (empType && empType !== "all") where.employmentType = empType
      if (employeeId && employeeId !== "all") where.id = employeeId

      const employees = await prisma.employee.findMany({
        where,
        include: { department: true, user: { select: { email: true } } },
        orderBy: { firstName: "asc" },
      })

      const fields: string[] = Array.isArray(selectedFields) && selectedFields.length > 0
        ? selectedFields.filter((f: string) => f in FIELD_MAP)
        : Object.keys(FIELD_MAP)

      headers = fields.map(f => FIELD_MAP[f].label)
      rows = employees.map(e => fields.map(f => FIELD_MAP[f].get(e)))
    }

    return NextResponse.json({ title, subtitle, headers, rows, filename: filename + ".csv", generatedAt: new Date().toISOString(), rowCount: rows.length })
  } catch (e: any) {
    console.error("[POST /api/reports/generate]", e)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
