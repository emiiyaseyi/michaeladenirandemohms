import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { id } = await params
  const doc = await prisma.orgDocument.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true } },
      acknowledgments: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              jobTitle: true,
            },
          },
        },
      },
    },
  })

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // All active employees — to find who hasn't been assigned/acked
  const allActive = await prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, profilePhoto: true },
  })

  const assignedIds = new Set(doc.acknowledgments.map((a: any) => a.employeeId))
  const notAssigned = allActive.filter(e => !assignedIds.has(e.id))
  const acknowledged = doc.acknowledgments.filter((a: any) => a.acknowledged)
  const pending = doc.acknowledgments.filter((a: any) => !a.acknowledged)

  return NextResponse.json({ doc, notAssigned, acknowledged, pending })
}
