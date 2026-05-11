import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Only Super Admins can assign PL departments")

  const { id } = await params
  const { departmentIds } = await req.json()

  const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true } })
  if (!employee?.userId) return NextResponse.json({ error: "Employee has no user account" }, { status: 404 })

  // Delete all existing assignments then recreate
  await prisma.projectLeadDepartment.deleteMany({ where: { userId: employee.userId } })

  if (Array.isArray(departmentIds) && departmentIds.length > 0) {
    await prisma.projectLeadDepartment.createMany({
      data: departmentIds.map((deptId: string) => ({ userId: employee.userId!, departmentId: deptId })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ ok: true })
}
