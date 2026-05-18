import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Only super admin can remove managers")

  const { employeeId } = await params
  const manager = await prisma.manager.findUnique({ where: { employeeId } })
  if (!manager) return NextResponse.json({ error: "Not a manager" }, { status: 404 })
  if (manager.isSystem) return NextResponse.json({ error: "Cannot remove a system-protected manager" }, { status: 400 })

  await prisma.manager.delete({ where: { id: manager.id } })
  return NextResponse.json({ ok: true })
}
