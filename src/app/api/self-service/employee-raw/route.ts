import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 404 })

  const employee = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    select: {
      jobTitle: true,
      phone: true, alternatePhone: true, personalEmail: true,
      address: true, city: true, state: true, country: true, postalCode: true,
      gender: true, dateOfBirth: true, maritalStatus: true,
      nationality: true, stateOfOrigin: true,
      nokName: true, nokPhone: true, nokRelationship: true, nokAddress: true,
    },
  })

  return NextResponse.json({ employee })
}
