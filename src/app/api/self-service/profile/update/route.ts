import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

const UPDATABLE_FIELDS = [
  "phone", "alternatePhone", "personalEmail",
  "address", "city", "state", "country", "postalCode",
  "gender", "dateOfBirth", "maritalStatus", "nationality", "stateOfOrigin",
  "nokName", "nokPhone", "nokRelationship", "nokAddress",
  "bankName", "bankAccountNo", "bankAccountName",
]

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  // Look up employeeId from DB in case token is stale
  let empId = user.employeeId
  if (!empId) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    empId = emp?.id
  }
  if (!empId) return NextResponse.json({ error: "No employee profile found" }, { status: 404 })

  const body = await req.json()

  const changes: Record<string, any> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) changes[field] = body[field] || null
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  // Cancel any existing PENDING request before submitting a new one
  await prisma.profileUpdateRequest.deleteMany({
    where: { employeeId: empId, status: "PENDING" },
  })

  const request = await prisma.profileUpdateRequest.create({
    data: { employeeId: empId, changes },
  })

  // Notify HR/admins
  const hrAdmins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ADMIN", "ADMIN"] as any }, isActive: true },
    select: { id: true },
  })
  if (hrAdmins.length > 0) {
    const emp = await prisma.employee.findUnique({ where: { id: empId }, select: { firstName: true, lastName: true } })
    await prisma.notification.createMany({
      data: hrAdmins.map(a => ({
        userId: a.id,
        employeeId: empId!,
        title: "Profile Update Request",
        message: `${emp?.firstName} ${emp?.lastName} has submitted a profile update request for review.`,
        type: "INFO" as const,
        link: "/employees/profile-requests",
      })),
    })
  }

  return NextResponse.json({ request, message: "Profile update submitted for review" })
}
