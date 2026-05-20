import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings")) return forbidden()

  const { id } = await params
  const { mode } = await req.json() // "acknowledged" | "all"

  if (mode === "all") {
    await prisma.docAck.deleteMany({ where: { documentId: id } })
  } else {
    // Only remove acknowledged ones
    await prisma.docAck.deleteMany({ where: { documentId: id, acknowledged: true } })
  }

  await logAudit({
    req, actor: user, action: "DOC_RECALL", entity: "OrgDocument", entityId: id,
    newValues: { mode: mode === "all" ? "all" : "acknowledged" },
  })

  return NextResponse.json({ ok: true })
}
