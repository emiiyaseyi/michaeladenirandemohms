import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

const UPDATABLE_FIELDS = [
  "phone", "alternatePhone", "personalEmail",
  "address", "city", "state", "country", "postalCode",
  "gender", "dateOfBirth", "maritalStatus", "nationality", "stateOfOrigin",
  "nokName", "nokPhone", "nokRelationship", "nokAddress",
  "nin", "aiMembership",
]

// Fields that skip the approval workflow and are saved directly
const DIRECT_FIELDS = ["nin", "aiMembership"]

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
  const directChanges: Record<string, any> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) {
      const val = body[field] || null
      if (DIRECT_FIELDS.includes(field)) directChanges[field] = val
      else changes[field] = val
    }
  }

  // Apply direct fields immediately (no approval workflow)
  if (Object.keys(directChanges).length > 0) {
    await prisma.employee.update({ where: { id: empId }, data: directChanges })
    await logAudit({
      req, actor: user, action: "PROFILE_SELF_UPDATE", entity: "Employee", entityId: empId,
      targetUserId: user.id,
      newValues: directChanges,
    })
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ direct: true, message: "Profile updated" })
  }

  // SUPER_ADMIN: apply directly, no approval needed
  if (user.role === "SUPER_ADMIN") {
    await prisma.employee.update({ where: { id: empId }, data: changes })
    await logAudit({
      req, actor: user, action: "PROFILE_SELF_UPDATE", entity: "Employee", entityId: empId,
      targetUserId: user.id,
      newValues: changes,
    })
    return NextResponse.json({ direct: true, message: "Profile updated" })
  }

  // Cancel any existing PENDING request before creating a new one
  await prisma.profileUpdateRequest.deleteMany({
    where: { employeeId: empId, status: "PENDING" },
  })

  const request = await prisma.profileUpdateRequest.create({
    data: { employeeId: empId, changes },
  })

  await logAudit({
    req, actor: user, action: "PROFILE_REQUEST_SUBMIT", entity: "ProfileUpdateRequest", entityId: request.id,
    targetUserId: user.id,
    newValues: { changes },
  })

  // ADMIN requests → notify only SUPER_ADMIN
  // Staff/TL requests → notify ADMIN + SUPER_ADMIN (excluding submitter)
  const reviewers = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN"] }, isActive: true, NOT: { id: user.id } },
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
    // profile_update_request email dropped (R6) — reviewers see new requests in their
    // queue at /admin/people/profile-requests. In-app notification suffices.
  }

  return NextResponse.json({ request, message: "Profile update submitted for review" })
}
