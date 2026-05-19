import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { format } from "date-fns"

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let cur = "", inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') inQuote = !inQuote
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row
  })
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canViewAllEmployees"]) return forbidden()

  const { searchParams } = req.nextUrl
  const scope = searchParams.get("scope") ?? "all"
  const ids = searchParams.get("ids") ?? ""
  const includeExited = searchParams.get("includeExited") === "true"

  const statusFilter: any = includeExited ? {} : { employeeStatus: { in: ["ACTIVE", "ON_LEAVE", "SUSPENDED"] } }
  const idFilter: any = scope === "specific" && ids ? { id: { in: ids.split(",") } } : {}

  const employees = await prisma.employee.findMany({
    where: { ...statusFilter, ...idFilter },
    include: { department: true, user: { select: { email: true } } },
    orderBy: { firstName: "asc" },
  })

  const headers = ["employeeId", "firstName", "lastName", "email", "jobTitle", "departmentName", "employmentType", "hireDate", "employeeStatus"]
  const rows = employees.map(e => [
    e.employeeId,
    e.firstName,
    e.lastName,
    (e.user as any)?.email ?? "",
    e.jobTitle ?? "",
    (e.department as any)?.name ?? "",
    e.employmentType,
    e.hireDate ? format(e.hireDate, "yyyy-MM-dd") : "",
    e.employeeStatus,
  ])

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="employees_bulk_update.csv"',
    },
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canViewAllEmployees"]) return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 })

  const results: { row: number; status: "updated" | "skipped"; employeeId?: string; error?: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const { employeeId, jobTitle, departmentName, employmentType, hireDate } = row

    if (!employeeId?.trim()) {
      results.push({ row: i + 2, status: "skipped", error: "Missing employeeId" })
      continue
    }

    try {
      const emp = await prisma.employee.findUnique({ where: { employeeId: employeeId.trim() } })
      if (!emp) { results.push({ row: i + 2, status: "skipped", employeeId, error: "Employee not found" }); continue }

      let deptId = emp.departmentId
      if (departmentName?.trim()) {
        const dept = await prisma.department.findFirst({ where: { name: { equals: departmentName.trim(), mode: "insensitive" } } })
        if (dept) deptId = dept.id
      }

      const updateData: any = {}
      if (jobTitle?.trim()) updateData.jobTitle = jobTitle.trim()
      if (deptId !== emp.departmentId) updateData.departmentId = deptId
      if (employmentType?.trim()) updateData.employmentType = employmentType.trim()
      if (hireDate?.trim()) updateData.hireDate = new Date(hireDate.trim())

      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.employee.update({ where: { employeeId: employeeId.trim() }, data: updateData, select: { id: true, userId: true } })
        await logAudit({
          req, actor: user, action: "EMPLOYEE_BULK_UPDATE", entity: "Employee", entityId: updated.id,
          targetUserId: updated.userId,
          oldValues: { jobTitle: emp.jobTitle, departmentId: emp.departmentId, employmentType: emp.employmentType, hireDate: emp.hireDate },
          newValues: updateData,
        })
      }
      results.push({ row: i + 2, status: "updated", employeeId })
    } catch (e: any) {
      results.push({ row: i + 2, status: "skipped", employeeId, error: e.message ?? "Unknown error" })
    }
  }

  const updated = results.filter(r => r.status === "updated").length
  const skipped = results.filter(r => r.status === "skipped").length
  return NextResponse.json({ updated, skipped, results })
}
