import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { employeeIds } = await req.json()

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
              id: true, firstName: true, lastName: true, email: true,
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  return NextResponse.json({ policy })
}
