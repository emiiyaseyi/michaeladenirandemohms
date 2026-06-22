import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { getActiveCycle } from "@/lib/appraisal"

// Leaderboards for org-wide admin-scored items (Brand, Learning, Attendance).
// Visible to everyone so staff can see where their admin scores came from and validate.
// Returns entries grouped by category, ranked by score desc.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let cycleId = req.nextUrl.searchParams.get("cycleId")
  if (!cycleId) {
    const active = await getActiveCycle()
    cycleId = active?.id ?? null
  }
  if (!cycleId) return NextResponse.json({ cycle: null, categories: [] })

  const cycle = await prisma.performanceCycle.findUnique({ where: { id: cycleId }, select: { id: true, name: true } })
  const entries = await prisma.leaderboardEntry.findMany({
    where: { cycleId },
    include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
    orderBy: { score: "desc" },
  })

  const byCat = new Map<string, typeof entries>()
  for (const e of entries) {
    const list = byCat.get(e.category) ?? []
    list.push(e)
    byCat.set(e.category, list)
  }
  const order = ["BRAND", "LEARNING", "ATTENDANCE"]
  const categories = [...byCat.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map(category => ({
      category,
      rows: (byCat.get(category) ?? []).map((e, i) => ({
        rank: i + 1,
        employeeId: e.employeeId,
        name: `${e.employee.firstName} ${e.employee.lastName}`,
        jobTitle: e.employee.jobTitle,
        score: e.score,
        note: e.note,
        isMe: e.employeeId === user.employeeId,
      })),
    }))

  return NextResponse.json({ cycle, meId: user.employeeId ?? null, categories })
}
