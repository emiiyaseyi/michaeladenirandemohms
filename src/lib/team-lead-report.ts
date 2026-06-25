// Team-lead upward-review synthesis.
//
// Team members rate their lead upward (raterType MEMBER, section LEADERSHIP). The raw
// rows stay sealed from everyone (see shapeForViewer); instead we generate an OpenAI
// synthesis over the pooled, name-stripped comments — useful to the lead, anonymous in
// practice. Only generated once at least MIN_REVIEWS members have submitted (anonymity floor).
import { prisma } from "@/lib/prisma"
import { chat } from "@/lib/openai"

export const MIN_REVIEWS = 3

const SYSTEM = `You are an impartial people-analytics summarizer for an HR system.
You receive anonymous upward-review feedback that several team members gave about their team lead.
Write a concise, constructive development report in Markdown with EXACTLY these sections:

## Strengths
## Growth areas
## Divergent signals
## Suggested actions

Rules:
- Synthesize common themes and trends across reviewers. Be specific but neutral.
- "Divergent signals" = outlier or conflicting views, described neutrally and NEVER attributed to a person.
- Do NOT quote text verbatim if it could identify an individual rater. No names, no roles, no "one reviewer said".
- "Suggested actions" = 2-3 concrete, actionable items for the lead.
- Keep the whole report under 350 words. Do not invent facts beyond the feedback provided.`

const round1 = (n: number) => Math.round(n * 10) / 10

// Generate (or clear) the synthesis for one lead's appraisal. Best-effort; never throws.
export async function generateTeamLeadReport(leadAppraisalId: string): Promise<{ generated: boolean; count: number }> {
  try {
    const appraisal = await prisma.appraisal.findUnique({
      where: { id: leadAppraisalId },
      select: { id: true, cycleId: true },
    })
    if (!appraisal) return { generated: false, count: 0 }

    const ratings = await prisma.appraisalRating.findMany({
      where: { appraisalId: leadAppraisalId, raterType: "MEMBER", section: "LEADERSHIP" },
      select: { raterId: true, questionId: true, score: true, comment: true },
    })
    const count = new Set(ratings.map(r => r.raterId).filter(Boolean)).size

    // Anonymity floor — below MIN_REVIEWS we generate nothing and send nothing to OpenAI.
    if (count < MIN_REVIEWS) {
      await prisma.appraisal.update({ where: { id: leadAppraisalId }, data: { teamLeadReviewCount: count, teamLeadReviewSummary: null, teamLeadReviewSummaryAt: null } })
      return { generated: false, count }
    }

    const questions = await prisma.appraisalQuestion.findMany({
      where: { cycleId: appraisal.cycleId, section: "LEADERSHIP" },
      orderBy: { order: "asc" },
      select: { id: true, text: true, scaleMax: true },
    })

    // Build name-stripped, per-question input + code-computed averages.
    const lines: string[] = []
    for (const q of questions) {
      const rs = ratings.filter(r => r.questionId === q.id)
      const scores = rs.map(r => r.score).filter((s): s is number => typeof s === "number")
      const avg = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null
      lines.push(`Q: ${q.text} (scale 0-${q.scaleMax})`)
      lines.push(`Average: ${avg ?? "n/a"} from ${scores.length} ratings`)
      const comments = rs.map(r => (r.comment ?? "").trim()).filter(Boolean)
      if (comments.length) lines.push("Anonymous comments:\n- " + comments.join("\n- "))
      lines.push("")
    }
    const userMsg = `This lead received upward reviews from ${count} anonymous team members.\n\n${lines.join("\n")}`

    const summary = await chat(SYSTEM, userMsg)
    if (!summary) {
      // No key / API error — keep the count so the UI can show status, leave summary empty.
      await prisma.appraisal.update({ where: { id: leadAppraisalId }, data: { teamLeadReviewCount: count } })
      return { generated: false, count }
    }

    await prisma.appraisal.update({
      where: { id: leadAppraisalId },
      data: { teamLeadReviewSummary: summary, teamLeadReviewSummaryAt: new Date(), teamLeadReviewCount: count },
    })
    return { generated: true, count }
  } catch (e) {
    console.error("[team-lead-report] EXCEPTION:", e)
    return { generated: false, count: 0 }
  }
}

// Generate reports for every lead in a cycle that has at least one upward review. Best-effort, sequential.
export async function generateTeamLeadReportsForCycle(cycleId: string): Promise<void> {
  try {
    const leadAppraisals = await prisma.appraisal.findMany({
      where: { cycleId, ratings: { some: { raterType: "MEMBER", section: "LEADERSHIP" } } },
      select: { id: true },
    })
    for (const a of leadAppraisals) {
      await generateTeamLeadReport(a.id)
    }
  } catch (e) {
    console.error("[team-lead-report] cycle batch EXCEPTION:", e)
  }
}
