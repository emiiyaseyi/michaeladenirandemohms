import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const body = await req.json()
  const { cycleId, title, keyResultArea, weight, target, deadline, projectName, description } = body

  if (!cycleId || !title || weight === undefined) {
    return NextResponse.json({ error: "cycleId, title, and weight are required" }, { status: 400 })
  }

  const kpi = await prisma.kPI.create({
    data: {
      employeeId: user.employeeId,
      cycleId,
      title,
      keyResultArea: keyResultArea || null,
      weight: Number(weight),
      target: target || null,
      deadline: deadline ? new Date(deadline) : null,
      projectName: projectName || null,
      description: description || null,
      status: "SUBMITTED",
    },
    include: { employee: true },
  })
  return NextResponse.json({ kpi }, { status: 201 })
}
