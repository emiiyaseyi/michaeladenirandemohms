import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return forbidden("No employee linked to this account")

  const { id } = await params
  const kpi = await prisma.kPI.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: "KPI not found" }, { status: 404 })
  if (kpi.employeeId !== user.employeeId) return forbidden()

  if (kpi.status === "APPROVED" || kpi.status === "APPROVED_WITH_CORRECTION") {
    return NextResponse.json({ error: "Cannot edit an approved KPI" }, { status: 400 })
  }

  const body = await req.json()
  const updated = await prisma.kPI.update({
    where: { id },
    data: {
      title:         body.title         !== undefined ? body.title         : kpi.title,
      keyResultArea: body.keyResultArea  !== undefined ? body.keyResultArea  : kpi.keyResultArea,
      weight:        body.weight         !== undefined ? Number(body.weight) : kpi.weight,
      target:        body.target         !== undefined ? body.target         : kpi.target,
      deadline:      body.deadline       !== undefined ? (body.deadline ? new Date(body.deadline) : null) : kpi.deadline,
      projectName:   body.projectName    !== undefined ? body.projectName    : kpi.projectName,
      description:   body.description    !== undefined ? body.description    : kpi.description,
      status:        "SUBMITTED",
    },
    include: { employee: true },
  })
  return NextResponse.json({ kpi: updated })
}
