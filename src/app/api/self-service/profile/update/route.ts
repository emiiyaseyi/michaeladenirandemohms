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

  // SUPER_ADMIN: apply directly, no approval needed
  if (user.role === "SUPER_ADMIN") {
    await prisma.employee.update({ where: { id: empId }, data: changes })
    return NextResponse.json({ direct: true, message: "Profile updated" })
  }

  // Cancel any existing PENDING request before creating a new one
  await prisma.profileUpdateRequest.deleteMany({
    where: { employeeId: empId, status: "PENDING" },
  })

  const request = await prisma.profileUpdateRequest.create({
    data: { employeeId: empId, changes },
  })

  // ADMIN requests → notify only SUPER_ADMIN
  // Staff/TL requests → notify ADMIN + SUPER_ADMIN (excluding submitter)
  const targetRoles: string[] = user.role === "ADMIN" ? ["SUPER_ADMIN"] : ["ADMIN", "SUPER_ADMIN"]
  const reviewers = await prisma.user.findMany({
    where: { role: { in: targetRoles as any }, isActive: true, NOT: { id: user.id } },
    select: { id: true },
  })
  if (reviewers.length > 0) {
    const emp = await prisma.employee.findUnique({ where: { id: empId }, select: { firstName: true, lastName: true } })
    await prisma.notification.createMany({
      data: reviewers.map(a => ({
        userId: a.id,
        employeeId: empId!,
        title: "Profile Update Request",
        message: `${emp?.firstName} ${emp?.lastName} has submitted a profile update request for review.`,
        type: "INFO" as const,
        link: "/admin/people/profile-requests",
      })),
    })
  }

  return NextResponse.json({ request, message: "Profile update submitted for review" })
}
