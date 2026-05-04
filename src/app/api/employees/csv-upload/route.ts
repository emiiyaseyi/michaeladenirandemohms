import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

// Required CSV columns
const REQUIRED = ["firstName", "lastName", "workEmail"]

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    // Simple CSV parse (handles quoted fields)
    const values: string[] = []
    let cur = "", inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canCreateEmployee) return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })

  // Validate required columns
  const headers = Object.keys(rows[0])
  for (const req2 of REQUIRED) {
    if (!headers.includes(req2)) {
      return NextResponse.json({ error: `Missing required column: ${req2}` }, { status: 400 })
    }
  }

  const results: { row: number; status: "created" | "skipped"; email?: string; error?: string }[] = []
  const hashedPwd = await bcrypt.hash("Welcome@DSN1", 10)
  const count = await prisma.employee.count()
  let nextNum = count + 1

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const { firstName, middleName, lastName, workEmail, phone, jobTitle, hireDate, dateOfBirth, gender, employmentType, departmentName, projectLeadEmail, grossSalary, category, role: rowRole } = row

    if (!firstName?.trim() || !lastName?.trim() || !workEmail?.trim()) {
      results.push({ row: i + 2, status: "skipped", error: "Missing required fields" })
      continue
    }

    const existing = await prisma.employee.findFirst({ where: { workEmail: workEmail.trim().toLowerCase() } })
    if (existing) {
      results.push({ row: i + 2, status: "skipped", email: workEmail, error: "Email already exists" })
      continue
    }

    try {
      // Look up department by name
      let departmentId: string | null = null
      if (departmentName?.trim()) {
        const dept = await prisma.department.findFirst({ where: { name: { equals: departmentName.trim(), mode: "insensitive" } } })
        departmentId = dept?.id ?? null
      }

      // Look up project lead by email
      let projectLeadId: string | null = null
      if (projectLeadEmail?.trim()) {
        const lead = await prisma.employee.findFirst({ where: { workEmail: projectLeadEmail.trim().toLowerCase() } })
        projectLeadId = lead?.id ?? null
      }

      const mid = middleName?.trim() || null
      const fullName = `${firstName.trim()}${mid ? " " + mid : ""} ${lastName.trim()}`
      const empId = `DSN${String(nextNum).padStart(4, "0")}`
      nextNum++

      const newUser = await prisma.user.create({
        data: { name: fullName, email: workEmail.trim().toLowerCase(), password: hashedPwd, role: (["STAFF","PROJECT_LEAD","ADMIN"].includes(rowRole?.trim().toUpperCase() ?? "") ? rowRole!.trim().toUpperCase() : "STAFF") as any },
      })

      const catUpper = category?.trim().toUpperCase()
      await prisma.employee.create({
        data: {
          userId: newUser.id,
          employeeId: empId,
          firstName: firstName.trim(),
          middleName: mid,
          lastName: lastName.trim(),
          workEmail: workEmail.trim().toLowerCase(),
          phone: phone?.trim() || null,
          jobTitle: jobTitle?.trim() || null,
          hireDate: hireDate?.trim() ? new Date(hireDate.trim()) : null,
          dateOfBirth: dateOfBirth?.trim() ? new Date(dateOfBirth.trim()) : null,
          gender: (gender?.trim().toUpperCase() === "MALE" ? "MALE" : gender?.trim().toUpperCase() === "FEMALE" ? "FEMALE" : null) as any,
          employmentType: (["FULL_TIME","PART_TIME","CONTRACT","STAFF","NYSC"].includes(employmentType?.trim().toUpperCase() ?? "")
            ? employmentType!.trim().toUpperCase()
            : "FULL_TIME") as any,
          category: (catUpper === "TECHNICAL" || catUpper === "NON_TECHNICAL" ? catUpper : "NON_TECHNICAL") as any,
          departmentId,
          projectLeadId,
          grossSalary: grossSalary?.trim() ? parseFloat(grossSalary.trim()) || null : null,
        },
      })

      results.push({ row: i + 2, status: "created", email: workEmail })
    } catch (e: any) {
      results.push({ row: i + 2, status: "skipped", email: workEmail, error: e.message ?? "Unknown error" })
    }
  }

  const created = results.filter(r => r.status === "created").length
  const skipped = results.filter(r => r.status === "skipped").length
  return NextResponse.json({ created, skipped, results })
}

// GET: download CSV template
export async function GET() {
  const headers = [
    "firstName", "middleName", "lastName", "workEmail", "phone", "jobTitle",
    "hireDate", "dateOfBirth", "gender", "employmentType", "departmentName",
    "projectLeadEmail", "grossSalary", "category", "role",
  ]
  const example = [
    "John", "", "Doe", "john.doe@datasciencenigeria.ai", "08012345678",
    "Software Engineer", "2024-01-15", "1995-06-20", "MALE", "FULL_TIME",
    "Technical Delivery (Service & Consulting)", "lead@datasciencenigeria.ai", "450000", "TECHNICAL", "STAFF",
  ]
  const csv = [headers.join(","), example.join(",")].join("\n")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="employee_upload_template.csv"',
    },
  })
}
