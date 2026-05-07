import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true } })
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const logs = await prisma.auditLog.findMany({
    where: { OR: [{ entityId: id }, { userId: employee.userId }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json({ logs })
}
