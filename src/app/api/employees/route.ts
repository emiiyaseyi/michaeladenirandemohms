import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EmployeeStatus } from "@prisma/client"
import { requireAuth, caps, forbidden, requirePermission, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
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
      // When no status filter: show ACTIVE + ON_LEAVE (hide TERMINATED from non-admins)
      // When a specific status is selected: apply it exactly
      const staffStatusFilter = status && status !== ""
        ? { employeeStatus: status as any }
        : { employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] as any[] } }

      const employees = await prisma.employee.findMany({
        where: {
          ...staffStatusFilter,
          user: { role: { not: "SUPER_ADMIN" as any } },
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
          departmentId: true, department: { select: { id: true, name: true, phone: true, email: true } },
          managerId: true, projectLeadId: true, employmentType: true,
          user: { select: { role: true, email: true } },
        },
        orderBy: { lastName: "asc" },
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

  const hideSeededFilter = { user: { role: { not: "SUPER_ADMIN" as any } } }

  try {
    const [employees, departments] = await Promise.all([
      prisma.employee.findMany({
        where: {
          AND: [
            scopeFilter,
            hideSeededFilter,
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
          user: { select: { role: true, email: true } },
        },
        orderBy: { lastName: "asc" },
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
  if (!hasCap(user, "canCreateEmployee")) return forbidden()
  const perm = requirePermission(user, "canCreateEmployee")
  if (perm) return perm

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }

  try {
  const {
    firstName, lastName, middleName,
    email: workEmail, phone, jobTitle,
    employmentType, hireDate, dateOfBirth, gender,
    role: bodyRole,
    // New hierarchy fields
    primaryDepartmentId, primaryProjectLeadId, secondaryDepartmentIds = [],
    departmentIds = [], managerEmployeeId,
    // Hire-flow: use existing User instead of creating one
    existingUserId,
  } = body

  const role = (bodyRole ?? "STAFF") as "STAFF" | "PROJECT_LEAD"

  // ── Basic validation ───────────────────────────────────────────────────────
  if (!firstName || !lastName || !workEmail || !hireDate) {
    return NextResponse.json({ error: "First name, last name, email and hire date are required" }, { status: 400 })
  }

  // ── Role-specific validation ───────────────────────────────────────────────
  if (role === "STAFF") {
    if (!primaryDepartmentId) {
      return NextResponse.json({ error: "Primary department is required" }, { status: 400 })
    }
    // Only validate PL if one was provided
    if (primaryProjectLeadId) {
      const pl = await prisma.employee.findUnique({
        where: { id: primaryProjectLeadId },
        include: { user: { select: { id: true, role: true, projectLeadDepartments: { where: { departmentId: primaryDepartmentId } } } } },
      })
      if (!pl || pl.user.role !== "PROJECT_LEAD" || pl.user.projectLeadDepartments.length === 0) {
        return NextResponse.json({ error: "Selected Project Lead is not assigned to the primary department" }, { status: 400 })
      }
    }
  } else if (role === "PROJECT_LEAD") {
    if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
      return NextResponse.json({ error: "At least one department to lead is required" }, { status: 400 })
    }
    // Only validate manager if one was provided
    if (managerEmployeeId) {
      const mgrEntry = await prisma.manager.findUnique({ where: { employeeId: managerEmployeeId } })
      if (!mgrEntry) {
        return NextResponse.json({ error: "Selected manager is not in the Manager list" }, { status: 400 })
      }
    }
  }

  // ── Pre-transaction: validate + hash password ─────────────────────────────
  if (existingUserId) {
    const existingUser = await prisma.user.findUnique({
      where: { id: existingUserId },
      include: { employee: { select: { id: true } }, adminRoles: { take: 1 } },
    })
    if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 400 })
    if (existingUser.employee) return NextResponse.json({ error: "User already has an employee record" }, { status: 400 })
    if (existingUser.adminRoles.length === 0) return NextResponse.json({ error: "User has no admin role - cannot be hired through this flow" }, { status: 400 })
  } else {
    if (!workEmail.toLowerCase().trim().endsWith("@datasciencenigeria.ai")) {
      return NextResponse.json({ error: "Employee email must be a @datasciencenigeria.ai address" }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({ where: { email: workEmail.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 })
  }

  const hashedPwd = !existingUserId
    ? await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1", 10)
    : null

  // ── Compute manager + PL fields ────────────────────────────────────────────
  let computedManagerId: string | null = null
  let computedProjectLeadId: string | null = null
  let computedDepartmentId: string | null = null
  if (role === "STAFF") {
    computedManagerId = primaryProjectLeadId || null
    computedProjectLeadId = primaryProjectLeadId || null
    computedDepartmentId = primaryDepartmentId
  } else if (role === "PROJECT_LEAD") {
    computedManagerId = managerEmployeeId || null
    computedProjectLeadId = null
    computedDepartmentId = departmentIds[0] ?? null
  }

  // ── Atomic transaction: user + employee + junctions + invite ──────────────
  // Any failure inside rolls back everything - no orphaned User rows in the DB.
  const { employee, userIdToUse, isHireFlow, invite } = await prisma.$transaction(async (tx) => {
    let txUserId: string
    let txIsHireFlow = false

    if (existingUserId) {
      await tx.user.update({ where: { id: existingUserId }, data: { role: role as any } })
      txUserId = existingUserId
      txIsHireFlow = true
    } else {
      const newUser = await tx.user.create({
        data: {
          name: `${firstName} ${middleName ? middleName + " " : ""}${lastName}`,
          email: workEmail.toLowerCase().trim(),
          password: hashedPwd!,
          role: role as any,
        },
      })
      txUserId = newUser.id
    }

    const count = await tx.employee.count()
    const empId = `DSN${String(count + 1).padStart(4, "0")}`

    const emp = await tx.employee.create({
      data: {
        userId: txUserId, employeeId: empId,
        firstName, lastName, middleName: middleName || null,
        phone: phone || null, jobTitle: jobTitle || null,
        departmentId: computedDepartmentId,
        managerId: computedManagerId,
        projectLeadId: computedProjectLeadId,
        employmentType: (employmentType ?? "FULL_TIME") as any,
        hireDate: hireDate ? new Date(hireDate) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: (gender || null) as any,
        employeeStatus: txIsHireFlow ? EmployeeStatus.ACTIVE : EmployeeStatus.NEEDS_ATTENTION,
      },
      include: { department: true },
    })

    if (role === "STAFF") {
      await tx.employeeDepartment.create({
        data: { employeeId: emp.id, departmentId: primaryDepartmentId, isPrimary: true },
      })
      for (const secId of secondaryDepartmentIds as string[]) {
        await tx.employeeDepartment.upsert({
          where: { employeeId_departmentId: { employeeId: emp.id, departmentId: secId } },
          update: { isPrimary: false },
          create: { employeeId: emp.id, departmentId: secId, isPrimary: false },
        })
      }
    } else if (role === "PROJECT_LEAD") {
      for (const deptId of departmentIds as string[]) {
        await tx.projectLeadDepartment.upsert({
          where: { userId_departmentId: { userId: txUserId, departmentId: deptId } },
          update: {},
          create: { userId: txUserId, departmentId: deptId },
        })
        const dept = await tx.department.findUnique({ where: { id: deptId }, select: { leadEmployeeId: true } })
        if (dept && !dept.leadEmployeeId) {
          await tx.department.update({ where: { id: deptId }, data: { leadEmployeeId: emp.id } })
        }
      }
    }

    let txInvite: any = null
    if (!txIsHireFlow) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      txInvite = await tx.employeeInvite.create({
        data: { employeeId: emp.id, expiresAt },
      })
    }

    return { employee: emp, userIdToUse: txUserId, isHireFlow: txIsHireFlow, invite: txInvite }
  })

  // ── Email (outside transaction - fire and forget) ──────────────────────────
  if (isHireFlow) {
    await sendEmail({
      eventKey: "employee_account_created",
      to: workEmail,
      variables: {
        employeeName: firstName,
        workEmail: workEmail.toLowerCase().trim(),
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
        defaultPassword: "(use your existing admin password)",
      },
    }).catch(() => {})
  } else {
    const inviteLink = `${process.env.NEXTAUTH_URL}/onboard/${invite.token}`
    const loginUrl = `${process.env.NEXTAUTH_URL}/login`
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
  }

  // ── Department PL notifications ────────────────────────────────────────────
  if (role === "STAFF") {
    const { notifyDepartmentPLs } = await import("@/lib/notifications")
    notifyDepartmentPLs({
      departmentId: primaryDepartmentId,
      excludeUserId: userIdToUse,
      title: "New team member added",
      message: `${firstName} ${lastName} has been added to your department as a primary member.`,
      link: `/admin/people/employees/${employee.id}`,
    }).catch(() => {})
    for (const secId of secondaryDepartmentIds as string[]) {
      notifyDepartmentPLs({
        departmentId: secId,
        excludeUserId: userIdToUse,
        title: "New secondary team member",
        message: `${firstName} ${lastName} has been added to your department as a secondary member.`,
        link: `/admin/people/employees/${employee.id}`,
      }).catch(() => {})
    }
  }

  await logAudit({
    req, actor: user, action: "EMPLOYEE_CREATE", entity: "Employee", entityId: employee.id,
    targetUserId: userIdToUse,
    newValues: {
      employeeId: employee.employeeId, firstName, lastName, email: workEmail,
      jobTitle: jobTitle ?? null, departmentId: computedDepartmentId,
      role: role, employmentType: employee.employmentType,
      hireFlow: isHireFlow,
    },
  })

  return NextResponse.json({ employee }, { status: 201 })
  } catch (e: any) {
    console.error("[POST /api/employees]", e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
