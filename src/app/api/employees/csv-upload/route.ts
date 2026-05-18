import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

const REQUIRED_COLS = ["firstName", "lastName", "email"]
const ALL_COLS = ["firstName", "middleName", "lastName", "email", "phone", "jobTitle", "hireDate", "dateOfBirth", "gender", "employmentType", "departmentName", "projectLeadEmail"]
const VALID_GENDERS = ["MALE", "FEMALE"]
const VALID_EMP_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "NYSC"]

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
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

function isValidDate(val: string): boolean {
  if (!val) return true // optional — blank is fine
  const d = new Date(val)
  return !isNaN(d.getTime())
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

  // Validate required columns exist
  const headers = Object.keys(rows[0])
  for (const col of REQUIRED_COLS) {
    if (!headers.includes(col)) {
      return NextResponse.json({ error: `Missing required column: "${col}". Required: ${REQUIRED_COLS.join(", ")}` }, { status: 400 })
    }
  }

  // Reject unknown columns (no extra/misspelled columns allowed)
  const unknownCols = headers.filter(h => !ALL_COLS.includes(h))
  if (unknownCols.length) {
    return NextResponse.json({ error: `Unknown column(s): ${unknownCols.map(c => `"${c}"`).join(", ")}. Allowed: ${ALL_COLS.join(", ")}` }, { status: 400 })
  }

  const results: { row: number; status: "created" | "skipped"; email?: string; error?: string }[] = []
  const hashedPwd = await bcrypt.hash("Welcome@DSN1", 10)
  const count = await prisma.employee.count()
  let nextNum = count + 1

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const firstName = row.firstName?.trim()
    const lastName = row.lastName?.trim()
    const email = row.email?.trim().toLowerCase()
    const jobTitle = row.jobTitle?.trim()
    const hireDateRaw = row.hireDate?.trim()
    const dobRaw = row.dateOfBirth?.trim()
    const departmentName = row.departmentName?.trim()
    const genderRaw = row.gender?.trim().toUpperCase()

    // Required: firstName, lastName, email, jobTitle, hireDate, dateOfBirth, gender, departmentName
    const missing: string[] = []
    if (!firstName) missing.push("firstName")
    if (!lastName) missing.push("lastName")
    if (!email) missing.push("email")
    if (!jobTitle) missing.push("jobTitle")
    if (!hireDateRaw) missing.push("hireDate")
    if (!dobRaw) missing.push("dateOfBirth")
    if (!genderRaw) missing.push("gender")
    if (!departmentName) missing.push("departmentName")
    if (missing.length > 0) {
      results.push({ row: rowNum, status: "skipped", email, error: `Missing required fields: ${missing.join(", ")}` })
      continue
    }

    // Email domain validation
    if (!email.endsWith("@datasciencenigeria.ai")) {
      results.push({ row: rowNum, status: "skipped", email, error: "Email must be @datasciencenigeria.ai" })
      continue
    }

    if (!VALID_GENDERS.includes(genderRaw)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid gender "${row.gender}". Use: MALE or FEMALE` })
      continue
    }

    const empTypeRaw = row.employmentType?.trim().toUpperCase()
    if (empTypeRaw && !VALID_EMP_TYPES.includes(empTypeRaw)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid employmentType "${row.employmentType}". Use: ${VALID_EMP_TYPES.join(", ")}` })
      continue
    }

    if (!isValidDate(hireDateRaw)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid hireDate "${row.hireDate}". Use YYYY-MM-DD format` })
      continue
    }

    if (!isValidDate(dobRaw)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid dateOfBirth "${row.dateOfBirth}". Use YYYY-MM-DD format` })
      continue
    }

    // Duplicate check
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      results.push({ row: rowNum, status: "skipped", email, error: "Email already exists" })
      continue
    }

    try {
      const dept = await prisma.department.findFirst({ where: { name: { equals: departmentName, mode: "insensitive" } } })
      if (!dept) {
        results.push({ row: rowNum, status: "skipped", email, error: `Department not found: "${row.departmentName}"` })
        continue
      }
      const departmentId: string = dept.id

      let projectLeadId: string | null = null
      if (row.projectLeadEmail?.trim()) {
        const lead = await prisma.employee.findFirst({ where: { user: { email: row.projectLeadEmail.trim().toLowerCase() } } })
        if (!lead) {
          results.push({ row: rowNum, status: "skipped", email, error: `Project lead not found: "${row.projectLeadEmail}"` })
          continue
        }
        projectLeadId = lead.id
      }

      const middleName = row.middleName?.trim() || null
      const fullName = `${firstName}${middleName ? " " + middleName : ""} ${lastName}`
      const empId = `DSN${String(nextNum).padStart(4, "0")}`
      nextNum++

      const newUser = await prisma.user.create({
        data: { name: fullName, email, password: hashedPwd, role: "STAFF" },
      })

      await prisma.employee.create({
        data: {
          userId: newUser.id,
          employeeId: empId,
          firstName,
          middleName,
          lastName,
          phone: row.phone?.trim() || null,
          jobTitle: row.jobTitle?.trim() || null,
          hireDate: row.hireDate?.trim() ? new Date(row.hireDate.trim()) : null,
          dateOfBirth: row.dateOfBirth?.trim() ? new Date(row.dateOfBirth.trim()) : null,
          gender: (genderRaw || null) as any,
          employmentType: (empTypeRaw || "FULL_TIME") as any,
          departmentId,
          projectLeadId,
        },
      })

      results.push({ row: rowNum, status: "created", email })
    } catch (e: any) {
      results.push({ row: rowNum, status: "skipped", email, error: e.message ?? "Unknown error" })
    }
  }

  const created = results.filter(r => r.status === "created").length
  const skipped = results.filter(r => r.status === "skipped").length
  return NextResponse.json({ created, skipped, results })
}

// GET: download CSV template
export async function GET() {
  const headers = ["firstName", "middleName", "lastName", "email", "phone", "jobTitle", "hireDate", "dateOfBirth", "gender", "employmentType", "departmentName", "projectLeadEmail"]
  const example = [
    "John", "", "Doe", "john.doe@datasciencenigeria.ai", "08012345678",
    "Software Engineer", "2024-01-15", "1995-06-20", "MALE", "FULL_TIME",
    "Technical Delivery (Service & Consulting)", "lead@datasciencenigeria.ai",
  ]
  const notes = [
    "# Required: firstName, lastName, email, jobTitle, hireDate, dateOfBirth, gender, departmentName",
    "# Optional: middleName, phone, employmentType, projectLeadEmail",
    "# email must end with @datasciencenigeria.ai",
    "# gender: MALE or FEMALE",
    "# employmentType: FULL_TIME | PART_TIME | CONTRACT | INTERN | NYSC (default: FULL_TIME)",
    "# hireDate / dateOfBirth: YYYY-MM-DD format",
    "# departmentName: must match an existing department exactly (case-insensitive)",
    "# projectLeadEmail: must be an existing employee email",
  ]
  const csv = [notes.join("\n"), headers.join(","), example.join(",")].join("\n")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="employee_upload_template.csv"',
    },
  })
}
