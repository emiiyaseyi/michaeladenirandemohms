import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { notifyDepartmentPLs } from "@/lib/notifications"
import bcrypt from "bcryptjs"

const COMMON_COLS = ["firstName", "middleName", "lastName", "email", "phone", "jobTitle", "hireDate", "dateOfBirth", "gender", "employmentType"]
const STAFF_COLS = [...COMMON_COLS, "primaryDepartment", "primaryProjectLeadEmail", "secondaryDepartments"]
const PL_COLS    = [...COMMON_COLS, "departments", "managerEmail"]
const REQUIRED_COMMON = ["firstName", "lastName", "email", "jobTitle", "hireDate", "dateOfBirth", "gender"]
const REQUIRED_STAFF = [...REQUIRED_COMMON, "primaryDepartment"]
const REQUIRED_PL    = [...REQUIRED_COMMON, "departments"]
const VALID_GENDERS = ["MALE", "FEMALE"]
const VALID_EMP_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "NYSC"]

function parseCSV(text: string): Record<string, string>[] {
  // Strip leading comment lines (start with #) so the header row is found
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith("#"))
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
  if (!val) return true
  const d = new Date(val)
  return !isNaN(d.getTime())
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canCreateEmployee")) return forbidden()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const roleRaw = (formData.get("role") as string | null) ?? "STAFF"
  const role = roleRaw === "PROJECT_LEAD" ? "PROJECT_LEAD" : "STAFF"
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })

  // ── Level 1: structural validation — column mismatch rejects entire file ──
  const headers = Object.keys(rows[0])
  const expectedCols = role === "STAFF" ? STAFF_COLS : PL_COLS
  const requiredCols = role === "STAFF" ? REQUIRED_STAFF : REQUIRED_PL

  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      return NextResponse.json({
        error: `Missing required column "${col}" for ${role === "STAFF" ? "Staff" : "Project Lead"} template. Download the correct template and try again.`,
      }, { status: 400 })
    }
  }
  const unknownCols = headers.filter(h => !expectedCols.includes(h))
  if (unknownCols.length) {
    return NextResponse.json({
      error: `Unknown column(s) for ${role === "STAFF" ? "Staff" : "Project Lead"} template: ${unknownCols.map(c => `"${c}"`).join(", ")}. Did you upload the wrong template?`,
    }, { status: 400 })
  }
  // Cross-template detection: if Staff role chosen but file has PL-only columns
  if (role === "STAFF" && (headers.includes("managerEmail") || headers.includes("departments"))) {
    return NextResponse.json({ error: "This looks like a Project Lead template but you selected Staff. Switch the role or download the Staff template." }, { status: 400 })
  }
  if (role === "PROJECT_LEAD" && (headers.includes("primaryDepartment") || headers.includes("primaryProjectLeadEmail"))) {
    return NextResponse.json({ error: "This looks like a Staff template but you selected Project Lead. Switch the role or download the PL template." }, { status: 400 })
  }

  // ── Level 2: row-by-row validation ─────────────────────────────────────────
  const results: { row: number; status: "created" | "skipped"; email?: string; error?: string }[] = []
  const hashedPwd = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1", 10)
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
    const genderRaw = row.gender?.trim().toUpperCase()

    const missing: string[] = []
    for (const f of requiredCols) {
      if (!(row[f] ?? "").trim()) missing.push(f)
    }
    if (missing.length > 0) {
      results.push({ row: rowNum, status: "skipped", email, error: `Missing required fields: ${missing.join(", ")}` })
      continue
    }

    if (!email!.endsWith("@datasciencenigeria.ai")) {
      results.push({ row: rowNum, status: "skipped", email, error: "Email must be @datasciencenigeria.ai" }); continue
    }
    if (!VALID_GENDERS.includes(genderRaw!)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid gender "${row.gender}". Use: MALE or FEMALE` }); continue
    }
    const empTypeRaw = row.employmentType?.trim().toUpperCase()
    if (empTypeRaw && !VALID_EMP_TYPES.includes(empTypeRaw)) {
      results.push({ row: rowNum, status: "skipped", email, error: `Invalid employmentType "${row.employmentType}". Use: ${VALID_EMP_TYPES.join(", ")}` }); continue
    }
    if (!isValidDate(hireDateRaw!)) { results.push({ row: rowNum, status: "skipped", email, error: `Invalid hireDate "${row.hireDate}". Use YYYY-MM-DD` }); continue }
    if (!isValidDate(dobRaw!)) { results.push({ row: rowNum, status: "skipped", email, error: `Invalid dateOfBirth "${row.dateOfBirth}". Use YYYY-MM-DD` }); continue }

    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) { results.push({ row: rowNum, status: "skipped", email, error: "Email already exists" }); continue }

    try {
      // Role-specific resolution
      let computedManagerId: string | null = null
      let computedProjectLeadId: string | null = null
      let computedDepartmentId: string | null = null
      let primaryDeptIdForJunction: string | null = null
      let secondaryDeptIdsForJunction: string[] = []
      let plDeptIds: string[] = []  // for PL: depts they lead

      if (role === "STAFF") {
        const primaryDeptName = row.primaryDepartment!.trim()
        const dept = await prisma.department.findFirst({ where: { name: { equals: primaryDeptName, mode: "insensitive" } } })
        if (!dept) { results.push({ row: rowNum, status: "skipped", email, error: `Department not found: "${primaryDeptName}"` }); continue }

        // PL is optional — only resolve if email provided
        const plEmail = (row.primaryProjectLeadEmail ?? "").trim().toLowerCase()
        if (plEmail) {
          const plEmp = await prisma.employee.findFirst({
            where: {
              user: {
                email: plEmail,
                role: "PROJECT_LEAD",
                projectLeadDepartments: { some: { departmentId: dept.id } },
              },
            },
          })
          if (!plEmp) { results.push({ row: rowNum, status: "skipped", email, error: `"${plEmail}" is not a Project Lead for ${primaryDeptName}` }); continue }
          computedManagerId = plEmp.id
          computedProjectLeadId = plEmp.id
        }

        // Secondary depts (pipe-separated)
        const secNames = (row.secondaryDepartments ?? "").split("|").map(s => s.trim()).filter(Boolean)
        let secSkipped = false
        for (const secName of secNames) {
          const secDept = await prisma.department.findFirst({ where: { name: { equals: secName, mode: "insensitive" } } })
          if (!secDept) { results.push({ row: rowNum, status: "skipped", email, error: `Secondary department not found: "${secName}"` }); secSkipped = true; break }
          secondaryDeptIdsForJunction.push(secDept.id)
        }
        if (secSkipped) continue

        computedDepartmentId = dept.id
        primaryDeptIdForJunction = dept.id
      } else {
        // PROJECT_LEAD
        const deptNames = (row.departments ?? "").split("|").map(s => s.trim()).filter(Boolean)
        if (deptNames.length === 0) { results.push({ row: rowNum, status: "skipped", email, error: "No departments specified" }); continue }
        let allFound = true
        for (const dn of deptNames) {
          const d = await prisma.department.findFirst({ where: { name: { equals: dn, mode: "insensitive" } } })
          if (!d) { results.push({ row: rowNum, status: "skipped", email, error: `Department not found: "${dn}"` }); allFound = false; break }
          plDeptIds.push(d.id)
        }
        if (!allFound) continue

        // Manager is optional
        const mgrEmail = (row.managerEmail ?? "").trim().toLowerCase()
        if (mgrEmail) {
          const mgrEmp = await prisma.employee.findFirst({
            where: { user: { email: mgrEmail }, managerEntry: { isNot: null } },
          })
          if (!mgrEmp) { results.push({ row: rowNum, status: "skipped", email, error: `"${mgrEmail}" is not in the Manager list` }); continue }
          computedManagerId = mgrEmp.id
        }

        computedProjectLeadId = null
        computedDepartmentId = plDeptIds[0] ?? null
      }

      const middleName = row.middleName?.trim() || null
      const fullName = `${firstName}${middleName ? " " + middleName : ""} ${lastName}`
      const empId = `DSN${String(nextNum).padStart(4, "0")}`
      nextNum++

      const newUser = await prisma.user.create({
        data: { name: fullName, email, password: hashedPwd, role: role as any },
      })

      const created = await prisma.employee.create({
        data: {
          userId: newUser.id,
          employeeId: empId,
          firstName, middleName, lastName,
          phone: row.phone?.trim() || null,
          jobTitle: jobTitle || null,
          hireDate: hireDateRaw ? new Date(hireDateRaw) : null,
          dateOfBirth: dobRaw ? new Date(dobRaw) : null,
          gender: (genderRaw || null) as any,
          employmentType: (empTypeRaw || "FULL_TIME") as any,
          departmentId: computedDepartmentId,
          managerId: computedManagerId,
          projectLeadId: computedProjectLeadId,
        },
      })

      // Junction rows
      if (role === "STAFF" && primaryDeptIdForJunction) {
        await prisma.employeeDepartment.create({
          data: { employeeId: created.id, departmentId: primaryDeptIdForJunction, isPrimary: true },
        })
        for (const secId of secondaryDeptIdsForJunction) {
          await prisma.employeeDepartment.upsert({
            where: { employeeId_departmentId: { employeeId: created.id, departmentId: secId } },
            update: { isPrimary: false },
            create: { employeeId: created.id, departmentId: secId, isPrimary: false },
          })
        }
      } else if (role === "PROJECT_LEAD") {
        for (const deptId of plDeptIds) {
          await prisma.projectLeadDepartment.upsert({
            where: { userId_departmentId: { userId: newUser.id, departmentId: deptId } },
            update: {},
            create: { userId: newUser.id, departmentId: deptId },
          })
          const d = await prisma.department.findUnique({ where: { id: deptId }, select: { leadEmployeeId: true } })
          if (d && !d.leadEmployeeId) {
            await prisma.department.update({ where: { id: deptId }, data: { leadEmployeeId: created.id } })
          }
        }
      }

      // Notify PLs (STAFF only — primary + secondaries)
      if (role === "STAFF" && primaryDeptIdForJunction) {
        const empName = `${firstName} ${lastName}`
        notifyDepartmentPLs({
          departmentId: primaryDeptIdForJunction,
          excludeUserId: newUser.id,
          title: "New team member added",
          message: `${empName} has been added to your department as a primary member (via bulk upload).`,
          link: `/admin/people/employees/${created.id}`,
        }).catch(() => {})
        for (const secId of secondaryDeptIdsForJunction) {
          notifyDepartmentPLs({
            departmentId: secId,
            excludeUserId: newUser.id,
            title: "New secondary team member",
            message: `${empName} has been added to your department as a secondary member (via bulk upload).`,
            link: `/admin/people/employees/${created.id}`,
          }).catch(() => {})
        }
      }

      await logAudit({
        req, actor: user, action: "EMPLOYEE_BULK_CREATE", entity: "Employee", entityId: created.id,
        targetUserId: newUser.id,
        newValues: { employeeId: empId, firstName, lastName, email, jobTitle: jobTitle || null, role, departmentId: computedDepartmentId },
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

// GET: download CSV template (role-aware)
export async function GET(req: NextRequest) {
  const roleRaw = req.nextUrl.searchParams.get("role") ?? "STAFF"
  const role = roleRaw === "PROJECT_LEAD" ? "PROJECT_LEAD" : "STAFF"

  if (role === "STAFF") {
    const headers = STAFF_COLS
    const example = [
      "John", "", "Doe", "john.doe@datasciencenigeria.ai", "08012345678",
      "Software Engineer", "2024-01-15", "1995-06-20", "MALE", "FULL_TIME",
      "EqualyzAI", "lead1@dsn-hrms.com", "Finance|Brand and Comms",
    ]
    const notes = [
      "# Staff template — for adding STAFF role members.",
      "# Required: firstName, lastName, email, jobTitle, hireDate, dateOfBirth, gender, primaryDepartment",
      "# Optional: middleName, phone, employmentType, primaryProjectLeadEmail, secondaryDepartments",
      "# email must end with @datasciencenigeria.ai",
      "# gender: MALE or FEMALE",
      "# employmentType: FULL_TIME | PART_TIME | CONTRACT | INTERN | NYSC (default: FULL_TIME)",
      "# hireDate / dateOfBirth: YYYY-MM-DD format",
      "# primaryDepartment: must match an existing department exactly (case-insensitive)",
      "# primaryProjectLeadEmail: optional — if provided, must be a PROJECT_LEAD assigned to the primary department",
      "# secondaryDepartments: optional, pipe-separated, e.g. Finance|Brand and Comms",
    ]
    const csv = [notes.join("\n"), headers.join(","), example.join(",")].join("\n")
    return new Response(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="staff_upload_template.csv"' },
    })
  }

  // PROJECT_LEAD template
  const headers = PL_COLS
  const example = [
    "Jane", "", "Smith", "jane.smith@datasciencenigeria.ai", "08087654321",
    "Team Lead — Technology", "2023-03-01", "1988-09-12", "FEMALE", "FULL_TIME",
    "EqualyzAI|Technical Delivery (Service & Consulting)", "manager1@datasciencenigeria.ai",
  ]
  const notes = [
    "# Project Lead template — for adding PROJECT_LEAD role members.",
    "# Required: firstName, lastName, email, jobTitle, hireDate, dateOfBirth, gender, departments",
    "# Optional: middleName, phone, employmentType, managerEmail",
    "# email must end with @datasciencenigeria.ai",
    "# gender: MALE or FEMALE",
    "# employmentType: FULL_TIME | PART_TIME | CONTRACT | INTERN | NYSC (default: FULL_TIME)",
    "# hireDate / dateOfBirth: YYYY-MM-DD format",
    "# departments: pipe-separated list of departments they will lead, e.g. EqualyzAI|Finance",
    "# managerEmail: optional — if provided, must be a Manager (CEO/Executive Director or added via /admin/people/managers)",
  ]
  const csv = [notes.join("\n"), headers.join(","), example.join(",")].join("\n")
  return new Response(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="project_lead_upload_template.csv"' },
  })
}
