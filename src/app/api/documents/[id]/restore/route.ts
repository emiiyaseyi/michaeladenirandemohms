import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  await prisma.orgDocument.update({ where: { id }, data: { isActive: true } })

  await logAudit({
    req, actor: user, action: "DOC_RESTORE", entity: "OrgDocument", entityId: id,
  })

  return NextResponse.json({ ok: true })
}
