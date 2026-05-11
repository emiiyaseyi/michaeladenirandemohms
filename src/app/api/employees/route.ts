import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden, requirePermission } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  const isStaff = !c.canViewAllEmployees && !c.canViewTeamEmployees

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""
  const dept = searchParams.get("dept") ?? ""

  // Staff get a limited public directory — no salary, bank, or sensitive fields
  if (isStaff) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] },
          ...(search ? { OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { jobTitle: { contains: search, mode: "insensitive" } },
          ]} : {}),
          ...(dept ? { departmentId: dept } : {}),
        },
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          profilePhoto: true, gender: true, employeeId: true,
          employeeStatus: true,
          departmentId: true, department: { select: { id: true, name: true } },
          managerId: true, projectLeadId: true,
          user: { select: { role: true } },
        },
        orderBy: { firstName: "asc" },
      })
      return NextResponse.json({ employees, departments: [] })
    } catch (e: any) {
      console.error("[GET /api/employees staff]", e)
      return NextResponse.json({ employees: [], departments: [] })
    }
  }

  let scopeFilter: any = {}
  if (!c.canViewAllEmployees && c.canViewTeamEmployees) {
    scopeFilter = { managerId: user.employeeId }
  }

  try {
    const [employees, departments] = await Promise.all([
      prisma.employee.findMany({
        where: {
          AND: [
            scopeFilter,
            search ? { OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { employeeId: { contains: search, mode: "insensitive" } },
              { jobTitle: { contains: search, mode: "insensitive" } },
            ]} : {},
            (status && status !== "ALL") ? { employeeStatus: status as any } : {},
            dept ? { departmentId: dept } : {},
          ]
        },
        include: {
          department: true,
          manager: { select: { firstName: true, lastName: true } },
          projectAssignments: {
            include: { project: { select: { id: true, name: true, status: true } } },
          },
          user: { select: { role: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
    ])

    return NextResponse.json({ employees, departments })
  } catch (e: any) {
    console.error("[GET /api/employees]", e)
    return NextResponse.json({ error: "Failed to load employees", employees: [], departments: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canCreateEmployee) return forbidden()
  const perm = requirePermission(user, "canCreateEmployee")
  if (perm) return perm

  const body = await req.json()
  const { firstName, lastName, middleName, email: workEmail, phone, jobTitle, departmentId, employmentType, hireDate, dateOfBirth, gender, category, grossSalary, projectLeadEmail, role: bodyRole } = body

  if (!firstName || !lastName || !workEmail || !phone || !jobTitle || !hireDate || !gender || !departmentId || !category) {
    return NextResponse.json({ error: "First name, last name, email, phone, job title, hire date, gender, department and category are required" }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({ where: { email: workEmail } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 })

  const count = await prisma.employee.count()
  const employeeId = `DSN${String(count + 1).padStart(4, "0")}`

  // Look up project lead by email
  let projectLeadId: string | null = null
  if (projectLeadEmail?.trim()) {
    const lead = await prisma.employee.findFirst({ where: { user: { email: projectLeadEmail.trim().toLowerCase() } } })
    projectLeadId = lead?.id ?? null
  }

  const hashedPwd = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1", 10)
  // Generate login email as firstname@datasciencenigeria.ai (fallback to workEmail if needed)
  const loginEmail = workEmail.includes("@datasciencenigeria")
    ? workEmail
    : `${firstName.toLowerCase().replace(/[^a-z]/g, "")}@datasciencenigeria.ai`
  // Handle collision: append number if exists
  let finalEmail = loginEmail
  const emailExists = await prisma.user.findFirst({ where: { email: loginEmail } })
  if (emailExists) {
    const count = await prisma.user.count({ where: { email: { startsWith: loginEmail.split("@")[0] } } })
    finalEmail = `${loginEmail.split("@")[0]}${count + 1}@datasciencenigeria.ai`
  }
  const newUser = await prisma.user.create({
    data: { name: `${firstName} ${middleName ? middleName + " " : ""}${lastName}`, email: finalEmail, password: hashedPwd, role: (bodyRole ?? "STAFF") as any }
  })

  const employee = await prisma.employee.create({
    data: {
      userId: newUser.id, employeeId, firstName, lastName, middleName: middleName || null,
      phone: phone || null, jobTitle: jobTitle || null,
      departmentId: departmentId || null,
      employmentType: (employmentType ?? "FULL_TIME") as any,
      hireDate: hireDate ? new Date(hireDate) : null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: (gender || null) as any,
      category: (category || "NON_TECHNICAL") as any,
      grossSalary: grossSalary ? parseFloat(grossSalary) || null : null,
      projectLeadId,
    },
    include: { department: true }
  })

  return NextResponse.json({ employee }, { status: 201 })
}
