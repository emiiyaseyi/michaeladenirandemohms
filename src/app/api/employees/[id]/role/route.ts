import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canEditEmployee"]) return forbidden("Insufficient permissions to change user roles")

  const { id } = await params
  const { role, employmentType, jobTitle, convertedAt } = await req.json()

  if (role !== "STAFF" && role !== "PROJECT_LEAD") {
    return NextResponse.json({ error: "Invalid role. Must be STAFF or PROJECT_LEAD" }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { userId: true, jobTitle: true, employmentType: true, firstName: true, lastName: true },
  })
  if (!employee?.userId) return NextResponse.json({ error: "Employee has no user account" }, { status: 404 })

  const targetUser = await prisma.user.findUnique({ where: { id: employee.userId }, select: { role: true } })
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (targetUser.role === "SUPER_ADMIN") return forbidden("Cannot change role of a Super Admin")

  const wasIntern = (employee.jobTitle ?? "").toLowerCase().includes("intern") || employee.employmentType === "INTERN"

  await prisma.user.update({ where: { id: employee.userId }, data: { role: role as any } })

  if (wasIntern) {
    const empUpdate: any = {}
    if (employmentType) empUpdate.employmentType = employmentType
    if (jobTitle) empUpdate.jobTitle = jobTitle
    if (convertedAt) empUpdate.convertedAt = new Date(convertedAt)
    if (Object.keys(empUpdate).length > 0) {
      await prisma.employee.update({ where: { id }, data: empUpdate })
    }

    const empTypeLabel: Record<string, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract" }
    await prisma.notification.create({
      data: {
        userId: employee.userId,
        title: "Welcome to the Team!",
        message: `Your role has been updated from Intern to ${role === "PROJECT_LEAD" ? "Project Lead" : (empTypeLabel[employmentType] ?? "Staff")}. Welcome aboard as a full team member!`,
        type: "INFO",
        link: "/staff",
      },
    }).catch(() => {})

    sendEmail({
      eventKey: "intern_to_staff",
      toUserId: employee.userId,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        newType: role === "PROJECT_LEAD" ? "Project Lead" : (empTypeLabel[employmentType] ?? "Staff"),
      },
    }).catch(() => {})
  }

  await logAudit({
    req, actor: user, action: "EMPLOYEE_ROLE_CHANGE", entity: "User", entityId: employee.userId,
    targetUserId: employee.userId,
    oldValues: { role: targetUser.role }, newValues: { role, ...(wasIntern ? { employmentType, jobTitle, convertedAt } : {}) },
  })

  return NextResponse.json({ ok: true, role })
}
