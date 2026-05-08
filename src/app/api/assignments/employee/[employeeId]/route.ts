import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params

  const assignments = await prisma.assetAssignment.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    include: {
      asset: {
        select: { id: true, name: true, identifier: true, assetType: { select: { name: true } } },
      },
    },
  })

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, profilePhoto: true },
  })

  return NextResponse.json({ assignments, employee })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const { action } = await req.json()

  if (action === "release-all") {
    await prisma.assetAssignment.updateMany({
      where: { employeeId, status: "ASSIGNED" },
      data: { status: "RELEASED", releasedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
