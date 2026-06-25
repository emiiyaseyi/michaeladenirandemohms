import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isAdminLike } from "@/lib/appraisal"
import { generateTeamLeadReport } from "@/lib/team-lead-report"
import { logAudit } from "@/lib/audit"

// (Re)generate the LLM synthesis of a lead's team-member upward reviews.
// Allowed for admins or the subject lead themselves.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params
  const appraisal = await prisma.appraisal.findUnique({ where: { id }, select: { employeeId: true } })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isSubject = appraisal.employeeId === user.employeeId
  if (!isAdminLike(user) && !isSubject) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const result = await generateTeamLeadReport(id)
  await logAudit({ req, actor: user, action: "APPRAISAL_TEAMLEAD_REPORT", entity: "Appraisal", entityId: id, newValues: result })
  return NextResponse.json({ ok: true, ...result })
}
