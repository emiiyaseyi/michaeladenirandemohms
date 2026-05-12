import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

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

  const includeExited = req.nextUrl.searchParams.get("includeExited") === "true"
  const where: any = includeExited ? {} : { employeeStatus: { in: ["ACTIVE", "ON_LEAVE", "SUSPENDED"] } }

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { firstName: "asc" },
    select: { employeeId: true, firstName: true, lastName: true, bankName: true, bankAccountNo: true, bankAccountName: true },
  })

  const headers = ["employeeId", "firstName", "lastName", "bankName", "bankAccountNo", "bankAccountName"]
  const rows = employees.map(e => [
    e.employeeId, e.firstName, e.lastName,
    e.bankName ?? "", e.bankAccountNo ?? "", e.bankAccountName ?? "",
  ])

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="accounts_bulk_upload.csv"',
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
    const { employeeId, bankName, bankAccountNo, bankAccountName } = row

    if (!employeeId?.trim()) {
      results.push({ row: i + 2, status: "skipped", error: "Missing employeeId" })
      continue
    }

    try {
      const emp = await prisma.employee.findUnique({ where: { employeeId: employeeId.trim() } })
      if (!emp) { results.push({ row: i + 2, status: "skipped", employeeId, error: "Employee not found" }); continue }

      const updateData: any = {}
      if (bankName !== undefined) updateData.bankName = bankName.trim() || null
      if (bankAccountNo !== undefined) updateData.bankAccountNo = bankAccountNo.trim() || null
      if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName.trim() || null

      if (Object.keys(updateData).length > 0) {
        await prisma.employee.update({ where: { employeeId: employeeId.trim() }, data: updateData })
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
