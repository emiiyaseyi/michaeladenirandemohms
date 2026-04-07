import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
