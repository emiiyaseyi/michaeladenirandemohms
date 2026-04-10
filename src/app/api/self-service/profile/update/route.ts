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
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 404 })

  const body = await req.json()

  // Only allow updatable fields (admin-verified fields like name/role not editable by employee)
  const data: Record<string, any> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) data[field] = body[field] || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const employee = await prisma.employee.update({
    where: { id: user.employeeId },
    data,
  })

  return NextResponse.json({ employee, message: "Profile updated successfully" })
}
