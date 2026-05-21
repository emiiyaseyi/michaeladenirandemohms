import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

const MEMBER_SELECT = {
  id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
  employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, jobTitle: true, department: { select: { id: true, name: true } } } },
  adminRoles: { include: { adminRole: { select: { id: true, name: true, slug: true, isSystem: true } } }, orderBy: { assignedAt: "asc" as const } },
}

// GET /api/settings/admins — list all elevated users + SUPER_ADMIN
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const [elevated, superAdmin] = await Promise.all([
    prisma.user.findMany({
      where: { adminRoles: { some: {} }, role: { not: "SUPER_ADMIN" } },
      select: MEMBER_SELECT,
      orderBy: { name: "asc" },
    }),
    prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: MEMBER_SELECT,
    }),
  ])

  const admins = [...elevated, ...(superAdmin ? [superAdmin] : [])]
  return NextResponse.json({ admins })
}

// POST /api/settings/admins — elevate a staff member OR create non-employee admin
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const body = await req.json()
  const { type, employeeId, firstName, lastName, email, systemRoleIds = [], customRoleIds = [] } = body

  const allRoleIds: string[] = [...systemRoleIds, ...customRoleIds]

  if (type === "employee") {
    if (!employeeId) return NextResponse.json({ error: "Employee required" }, { status: 400 })
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
    if (!emp?.userId) return NextResponse.json({ error: "Employee has no user account" }, { status: 400 })

    // Create UserAdminRole records (skip duplicates)
    if (allRoleIds.length > 0) {
      await prisma.userAdminRole.createMany({
        data: allRoleIds.map(rid => ({ userId: emp.userId!, adminRoleId: rid })),
        skipDuplicates: true,
      })
    }

    await prisma.notification.create({
      data: {
        userId: emp.userId!,
        title: "Admin access granted",
        message: "You have been granted admin access. Use the panel switcher in the top menu to access the admin panel.",
        type: "SUCCESS",
        link: "/admin",
      },
    })
    sendEmail({ eventKey: "admin_access_granted", toUserId: emp.userId!, variables: { employeeName: "" } }).catch(() => {})

    await logAudit({
      req, actor: user, action: "ADMIN_ROLE_GRANT", entity: "User", entityId: emp.userId!,
      targetUserId: emp.userId!,
      newValues: { roleIds: allRoleIds },
    })

    const updated = await prisma.user.findUnique({ where: { id: emp.userId }, select: MEMBER_SELECT })
    return NextResponse.json({ admin: updated }, { status: 201 })
  }

  if (type === "external") {
    if (!firstName || !lastName || !email) return NextResponse.json({ error: "First name, last name and email are required" }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })

    const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
    const hashed = await bcrypt.hash(tempPassword, 12)
    const newUser = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password: hashed,
        role: "STAFF" as any,
        mustChangePassword: true,
        ...(allRoleIds.length > 0 && {
          adminRoles: { create: allRoleIds.map(rid => ({ adminRoleId: rid })) },
        }),
      },
      select: MEMBER_SELECT,
    })

    // Send welcome email with the temp password so the new admin can actually log in.
    // (Previously this value was generated but never delivered anywhere.)
    sendEmail({
      eventKey: "external_admin_welcome",
      to: email,
      variables: {
        name: newUser.name ?? "",
        tempPassword,
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
      },
    }).catch(() => {})

    await logAudit({
      req, actor: user, action: "EXTERNAL_ADMIN_CREATE", entity: "User", entityId: newUser.id,
      targetUserId: newUser.id,
      newValues: { name: newUser.name, email: newUser.email, roleIds: allRoleIds },
    })
    return NextResponse.json({ admin: newUser, tempPassword }, { status: 201 })
  }

  return NextResponse.json({ error: "Invalid type. Use 'employee' or 'external'" }, { status: 400 })
}
