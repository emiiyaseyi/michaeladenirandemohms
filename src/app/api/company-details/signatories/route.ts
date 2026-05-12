import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const signatories = await (prisma as any).companySignatory.findMany({
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, employeeId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ signatories })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { employeeId } = await req.json()
  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const existing = await (prisma as any).companySignatory.findUnique({ where: { employeeId } })
  if (existing) return NextResponse.json({ error: "This employee is already a signatory" }, { status: 400 })

  const signatory = await (prisma as any).companySignatory.create({
    data: { employeeId },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, employeeId: true },
      },
    },
  })
  return NextResponse.json({ signatory })
}
