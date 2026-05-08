import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  let phone: string | null = null
  let dateOfBirth: Date | null = null
  let nin: string | null = null

  const empId = user.employeeId ?? (await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } }))?.id
  if (empId) {
    const emp = await prisma.employee.findUnique({
      where: { id: empId },
      select: { phone: true, dateOfBirth: true, nin: true },
    })
    if (emp) { phone = emp.phone; dateOfBirth = emp.dateOfBirth; nin = emp.nin }
  }

  return NextResponse.json({ email: user.email, name: user.name, phone, dateOfBirth, nin })
}
