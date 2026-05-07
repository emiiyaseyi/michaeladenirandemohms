import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { filingId, mailingId } = await req.json()
  if (!filingId || !mailingId) return NextResponse.json({ error: "filingId and mailingId are required" }, { status: 400 })

  await (prisma as any).workplace.updateMany({ data: { isFiling: false, isMailing: false } })

  if (filingId === mailingId) {
    await (prisma as any).workplace.update({ where: { id: filingId }, data: { isFiling: true, isMailing: true } })
  } else {
    await (prisma as any).workplace.update({ where: { id: filingId }, data: { isFiling: true } })
    await (prisma as any).workplace.update({ where: { id: mailingId }, data: { isMailing: true } })
  }

  const workplaces = await (prisma as any).workplace.findMany({ orderBy: { createdAt: "asc" } })
  return NextResponse.json({ workplaces })
}
