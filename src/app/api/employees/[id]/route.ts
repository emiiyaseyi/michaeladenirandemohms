import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // Allow own profile or admins
  if (user.employeeId !== id && !caps(user.role).canViewAllEmployees && !caps(user.role).canViewTeamEmployees) {
    return forbidden()
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      departmentLead: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      projectAssignments: {
        include: { project: { select: { id: true, name: true, status: true } } },
        where: { project: { status: "ACTIVE" } },
      },
      user: { select: { role: true, additionalRoles: true } },
    },
  })

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ employee })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canEditAnyEmployee) return forbidden("Insufficient permissions to edit employees")

  const { id } = await params
  const body = await req.json()

  const ALLOWED_FIELDS = [
    "firstName", "lastName", "middleName", "gender", "dateOfBirth", "maritalStatus",
    "nationality", "stateOfOrigin", "profilePhoto",
    "personalEmail", "phone", "alternatePhone",
    "address", "city", "state", "country", "postalCode",
    "departmentId", "jobTitle", "employmentType", "employeeStatus",
    "hireDate", "confirmationDate", "endDate",
    "managerId", "departmentLeadId",
    "bankName", "bankAccountNo", "bankAccountName", "pensionPin", "tin", "nhfNo",
    "grossSalary", "onProbation", "probationEndDate",
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
      if ((key === "grossSalary" || key === "annualLeaveBalance" || key === "sickLeaveBalance") && val !== null) {
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
  if (body.role) {
    userUpdate.role = body.role
  }
  if (Array.isArray(body.additionalRoles)) {
    userUpdate.additionalRoles = body.additionalRoles
  }
  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: employee.userId }, data: userUpdate }).catch(() => {})
  }

  return NextResponse.json({ employee })
}
