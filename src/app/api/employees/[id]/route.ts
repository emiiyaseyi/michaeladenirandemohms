import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth, caps, forbidden, requirePermission } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // Own profile is always allowed
  if (user.employeeId !== id) {
    const c = caps(user.role)
    if (c.canViewAllEmployees) {
      // admin — full access
    } else if (c.canViewTeamEmployees) {
      // project lead — only their direct reports
      const isReport = await prisma.employee.findFirst({ where: { id, managerId: user.employeeId }, select: { id: true } })
      if (!isReport) return forbidden("You can only view profiles of your direct reports")
    } else {
      return forbidden()
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      projectLead: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      projectAssignments: {
        include: { project: { select: { id: true, name: true, status: true } } },
        where: { project: { status: "ACTIVE" } },
      },
      user: { select: { role: true, email: true, projectLeadDepartments: { include: { department: { select: { id: true, name: true } } } } } },
    },
  })

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ employee })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canEditAnyEmployee) return forbidden("Insufficient permissions to edit employees")
  const perm = requirePermission(user, "canEditEmployee")
  if (perm) return perm

  const { id } = await params

  if (id === user.employeeId) {
    return forbidden("You cannot edit your own employee record")
  }

  const body = await req.json()

  const ALLOWED_FIELDS = [
    "firstName", "lastName", "middleName", "gender", "dateOfBirth", "maritalStatus",
    "nationality", "stateOfOrigin", "profilePhoto",
    "personalEmail", "phone", "alternatePhone",
    "address", "city", "state", "country", "postalCode",
    "departmentId", "jobTitle", "employmentType", "employeeStatus",
    "hireDate", "confirmationDate", "endDate",
    "managerId", "projectLeadId",
    "nin", "aiMembership",
    "onProbation", "probationEndDate",
    "nokName", "nokPhone", "nokRelationship", "nokAddress",
    "annualLeaveBalance", "sickLeaveBalance",
  ]

  const data: Record<string, any> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      let val = body[key]
      if (val === "") val = null
      if ((key === "dateOfBirth" || key === "hireDate" || key === "confirmationDate" || key === "endDate" || key === "probationEndDate") && val) {
        val = new Date(val)
      }
      if ((key === "annualLeaveBalance" || key === "sickLeaveBalance") && val !== null) {
        val = Number(val)
      }
      data[key] = val
    }
  }

  // Update employee record
  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { department: true, manager: { select: { id: true, firstName: true, lastName: true } } },
  })

  // Update user record: name, role, additionalRoles
  const userUpdate: Record<string, any> = {}
  if (body.firstName || body.lastName) {
    userUpdate.name = `${employee.firstName} ${employee.lastName}`
  }

  let roleChanged = false
  let previousRole: string | null = null
  if (body.role) {
    const currentUser = await prisma.user.findUnique({
      where: { id: employee.userId },
      select: { role: true },
    })
    // SUPER_ADMIN's role can only be changed by another SUPER_ADMIN
    const targetIsSuperAdmin = currentUser?.role === "SUPER_ADMIN"
    const requesterIsSuperAdmin = user.role === "SUPER_ADMIN"
    if (!targetIsSuperAdmin || requesterIsSuperAdmin) {
      if (currentUser && currentUser.role !== body.role) {
        roleChanged = true
        previousRole = currentUser.role
      }
      userUpdate.role = body.role
    }
  }

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: employee.userId }, data: userUpdate })
  }

  if (roleChanged && previousRole) {
    const ROLE_LABEL: Record<string, string> = { STAFF: "Staff", SUPER_ADMIN: "Super Admin" }
    await prisma.notification.create({
      data: {
        userId: employee.userId,
        title: "Your role has been updated",
        message: `Your account role has been changed from ${ROLE_LABEL[previousRole] ?? previousRole} to ${ROLE_LABEL[body.role] ?? body.role}. Sign out and back in for the change to take effect.`,
        type: "INFO",
        link: "/",
      },
    })
    sendEmail({ eventKey: "role_changed", toUserId: employee.userId, variables: { employeeName: `${employee.firstName} ${employee.lastName}`, previousRole: ROLE_LABEL[previousRole] ?? previousRole, newRole: ROLE_LABEL[body.role] ?? body.role } }).catch(() => {})
  }

  return NextResponse.json({ employee })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN" && !user.permissions["canDeleteEmployee"]) return forbidden()

  const { id } = await params
  if (id === user.employeeId) return forbidden("You cannot delete your own employee record")

  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  try {
    await prisma.$transaction(async (tx) => {
      // Null out self-referential manager/PL pointers on other employees
      await tx.employee.updateMany({ where: { managerId: id }, data: { managerId: null } })
      await tx.employee.updateMany({ where: { projectLeadId: id }, data: { projectLeadId: null } })
      // Clean up non-cascade child records
      await tx.docAck.deleteMany({ where: { employeeId: id } })
      await tx.leaveReliefOfficer.deleteMany({ where: { employeeId: id } })
      await tx.violation.deleteMany({ where: { OR: [{ employeeId: id }, { recordedById: id }] } })
      await tx.disciplinaryTrigger.deleteMany({ where: { employeeId: id } })
      await tx.suspension.deleteMany({ where: { employeeId: id } })
      await tx.absenceRecord.deleteMany({ where: { employeeId: id } })
      // Delete employee (cascades all onDelete: Cascade children)
      await tx.employee.delete({ where: { id } })
      // Delete user account
      await tx.user.delete({ where: { id: employee.userId } })
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[DELETE /api/employees/:id]", e)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
