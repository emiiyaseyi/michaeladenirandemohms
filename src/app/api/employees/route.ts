import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EmployeeStatus } from "@prisma/client"
import { requireAuth, caps, forbidden, requirePermission } from "@/lib/api-auth"
import bcrypt from "bcryptjs"
import { sendEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  const isStaff = !c.canViewAllEmployees && !c.canViewTeamEmployees

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""
  const dept = searchParams.get("dept") ?? ""

  // Staff AND Project Lead use the same public directory (no sensitive fields).
  // Team-scoped views for PLs go through /api/project-lead/team instead.
  if (isStaff || user.role === "PROJECT_LEAD") {
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
          employeeStatus: true, phone: true,
          departmentId: true, department: { select: { id: true, name: true } },
          managerId: true, projectLeadId: true,
          user: { select: { role: true, email: true } },
        },
        orderBy: { firstName: "asc" },
      })
      const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })
      return NextResponse.json({ employees, departments })
    } catch (e: any) {
      console.error("[GET /api/employees staff/pl]", e)
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
  const { firstName, lastName, middleName, email: workEmail, phone, jobTitle, departmentId, employmentType, hireDate, dateOfBirth, gender, projectLeadEmail, role: bodyRole } = body

  if (!firstName || !lastName || !workEmail || !hireDate || !departmentId) {
    return NextResponse.json({ error: "First name, last name, email, hire date and department are required" }, { status: 400 })
  }

  if (!workEmail.toLowerCase().trim().endsWith("@datasciencenigeria.ai")) {
    return NextResponse.json({ error: "Employee email must be a @datasciencenigeria.ai address" }, { status: 400 })
  }
  const existing = await prisma.user.findFirst({ where: { email: workEmail.toLowerCase().trim() } })
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
  const newUser = await prisma.user.create({
    data: { name: `${firstName} ${middleName ? middleName + " " : ""}${lastName}`, email: workEmail.toLowerCase().trim(), password: hashedPwd, role: (bodyRole ?? "STAFF") as any }
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
      projectLeadId,
      employeeStatus: EmployeeStatus.NEEDS_ATTENTION,
    },
    include: { department: true }
  })

  // Both modes: create a 24h invite token + send the mode-specific email.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const invite = await prisma.employeeInvite.create({
    data: { employeeId: employee.id, expiresAt },
  })
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboard/${invite.token}`
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1"
  await sendEmail({
    eventKey: body.inviteMode ? "employee_invite" : "employee_account_created",
    to: workEmail,
    variables: {
      employeeName: firstName,
      inviteLink,
      workEmail: workEmail.toLowerCase().trim(),
      loginUrl,
      defaultPassword,
    },
  }).catch(() => {})

  return NextResponse.json({ employee }, { status: 201 })
}
