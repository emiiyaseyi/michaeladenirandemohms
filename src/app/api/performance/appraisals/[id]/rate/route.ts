import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { relationshipTo } from "@/lib/appraisal"

// Privacy-safe rating context for peers / members / reviewers (core values).
// Returns ONLY the subject's name, the relevant questions, and the caller's own
// prior ratings — never other raters' input or the subject's scores.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!user.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 400 })
  const { id } = await params
  const raterType = req.nextUrl.searchParams.get("raterType") ?? "PEER"

  const appraisal = await prisma.appraisal.findUnique({
    where: { id },
    include: {
      cycle: { select: { id: true, name: true, stage: true } },
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true } },
      reviewers: true, peers: true,
    },
  })
  if (!appraisal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const rel = relationshipTo(user, appraisal)
  const eid = user.employeeId

  // section for the rater type
  let section: "PEER" | "BEHAVIOURAL" | "CORE_VALUE"
  let authorised = false
  if (raterType === "PEER") { section = "PEER"; authorised = rel.isPeer }
  else if (raterType === "MEMBER") {
    section = "BEHAVIOURAL"
    const me = await prisma.employee.findUnique({ where: { id: eid }, select: { managerId: true, projectLeadId: true } })
    authorised = !!me && (me.managerId === appraisal.employeeId || me.projectLeadId === appraisal.employeeId)
  }
  else if (raterType === "PRIMARY_REVIEWER" || raterType === "COUNTER_REVIEWER") {
    section = "CORE_VALUE"; authorised = raterType === "PRIMARY_REVIEWER" ? rel.isPrimary : rel.isCounter
  }
  else return NextResponse.json({ error: "Invalid raterType" }, { status: 400 })

  if (!authorised) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const questions = await prisma.appraisalQuestion.findMany({
    where: { cycleId: appraisal.cycleId, section: section as any },
    orderBy: { order: "asc" },
  })
  const myRatings = await prisma.appraisalRating.findMany({
    where: { appraisalId: id, raterId: eid, raterType: raterType as any, section: section as any },
  })

  return NextResponse.json({
    subject: appraisal.employee,
    cycle: appraisal.cycle,
    section,
    questions,
    myRatings: myRatings.map(r => ({ questionId: r.questionId, score: r.score, comment: r.comment })),
  })
}
