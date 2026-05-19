import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { employeeIds } = await req.json()
  const before = await prisma.disciplinaryPolicyExemption.findMany({ where: { policyId: id }, select: { employeeId: true } })

  await prisma.disciplinaryPolicyExemption.deleteMany({ where: { policyId: id } })

  if (employeeIds?.length) {
    await prisma.disciplinaryPolicyExemption.createMany({
      data: (employeeIds as string[]).map((employeeId: string) => ({ policyId: id, employeeId })),
      skipDuplicates: true,
    })
  }

  const policy = await prisma.disciplinaryPolicy.findUnique({
    where: { id },
    include: {
      exemptions: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true,
              user: { select: { email: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  await logAudit({
    req, actor: user, action: "EXEMPTION_UPDATE", entity: "DisciplinaryPolicy", entityId: id,
    oldValues: { employeeIds: before.map(b => b.employeeId) },
    newValues: { employeeIds: (employeeIds ?? []) as string[] },
  })

  return NextResponse.json({ policy })
}
