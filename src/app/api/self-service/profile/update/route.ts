import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

const UPDATABLE_FIELDS = [
  "phone", "alternatePhone", "personalEmail",
  "address", "city", "state", "country", "postalCode",
  "gender", "dateOfBirth", "maritalStatus", "nationality", "stateOfOrigin",
  "nokName", "nokPhone", "nokRelationship", "nokAddress",
  "nin", "aiMembership",
]

// Fields applied immediately without going through the change block
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

  if (typeof changes.dateOfBirth === "string" && changes.dateOfBirth) {
    changes.dateOfBirth = new Date(changes.dateOfBirth)
  }

  await prisma.employee.update({ where: { id: empId }, data: changes })
  await logAudit({
    req, actor: user, action: "PROFILE_SELF_UPDATE", entity: "Employee", entityId: empId,
    targetUserId: user.id,
    newValues: changes,
  })

  return NextResponse.json({ direct: true, message: "Profile updated" })
}
