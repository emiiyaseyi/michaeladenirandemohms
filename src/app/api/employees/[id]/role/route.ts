import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Only Super Admins can change user roles")

  const { id } = await params
  const { role } = await req.json()

  if (role !== "STAFF" && role !== "PROJECT_LEAD") {
    return NextResponse.json({ error: "Invalid role. Must be STAFF or PROJECT_LEAD" }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true } })
  if (!employee?.userId) return NextResponse.json({ error: "Employee has no user account" }, { status: 404 })

  const targetUser = await prisma.user.findUnique({ where: { id: employee.userId }, select: { role: true } })
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (targetUser.role === "SUPER_ADMIN") return forbidden("Cannot change role of a Super Admin")

  await prisma.user.update({ where: { id: employee.userId }, data: { role: role as any } })

  return NextResponse.json({ ok: true, role })
}
