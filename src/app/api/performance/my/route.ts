import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { appraisalInclude, shapeForViewer, getActiveCycle } from "@/lib/appraisal"

// The caller's own appraisal for a given cycle (defaults to the active cycle).
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ appraisal: null, cycle: null })

  let cycleId = req.nextUrl.searchParams.get("cycleId") ?? undefined
  if (!cycleId) {
    const active = await getActiveCycle()
    cycleId = active?.id
  }
  if (!cycleId) return NextResponse.json({ appraisal: null, cycle: null })

  const cycle = await prisma.performanceCycle.findUnique({
    where: { id: cycleId },
    include: { questions: { orderBy: [{ section: "asc" }, { order: "asc" }] } },
  })
  const appraisal = await prisma.appraisal.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId: user.employeeId } },
    include: appraisalInclude(),
  })
  return NextResponse.json({
    cycle,
    appraisal: appraisal ? shapeForViewer(appraisal, user) : null,
  })
}
