import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const acks = await prisma.docAck.findMany({
    where: { employeeId: id },
    include: {
      document: {
        select: { id: true, title: true, fileUrl: true, mimeType: true, requiresSignature: true, isActive: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ acks })
}
