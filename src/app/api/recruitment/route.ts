import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewRecruitment")) return forbidden("No access to recruitment data")
  const [jobs, applications, departments] = await Promise.all([
    prisma.jobPosting.findMany({
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.jobApplication.findMany({
      include: { jobPosting: { select: { title: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ])
  return NextResponse.json({ jobs, applications, departments })
}
