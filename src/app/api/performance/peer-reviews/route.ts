import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { getActiveCycle } from "@/lib/appraisal"

// The caller's "reviews to give" inbox (only while a cycle is OPEN):
//  - peer tasks: appraisals where the caller is an assigned peer
//  - lead task:  rate the caller's own team lead (Section II / behavioural)
export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ tasks: [], leadTask: null })
  const eid = user.employeeId

  const peers = await prisma.appraisalPeer.findMany({
    where: { peerId: eid, appraisal: { cycle: { stage: "OPEN" } } },
    include: {
      appraisal: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
          cycle: { select: { id: true, name: true, stage: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  const tasks = peers.map(p => ({
    peerAssignmentId: p.id, status: p.status, appraisalId: p.appraisalId,
    subject: p.appraisal.employee, cycle: p.appraisal.cycle,
  }))

  // Lead task — rate my team lead (manager/projectLead) in the active OPEN cycle.
  let leadTask: any = null
  const active = await getActiveCycle()
  if (active && active.stage === "OPEN") {
    const me = await prisma.employee.findUnique({ where: { id: eid }, select: { managerId: true, projectLeadId: true } })
    const leadId = me?.projectLeadId ?? me?.managerId ?? null
    if (leadId && leadId !== eid) {
      const leadAppraisal = await prisma.appraisal.findUnique({
        where: { cycleId_employeeId: { cycleId: active.id, employeeId: leadId } },
        include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } } },
      })
      if (leadAppraisal) {
        const mine = await prisma.appraisalRating.findFirst({ where: { appraisalId: leadAppraisal.id, raterId: eid, raterType: "MEMBER" } })
        leadTask = { appraisalId: leadAppraisal.id, subject: leadAppraisal.employee, cycle: { id: active.id, name: active.name }, submitted: !!mine }
      }
    }
  }

  return NextResponse.json({ tasks, leadTask })
}
