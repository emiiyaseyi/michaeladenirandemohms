import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewRecruitment) return forbidden()

  const { searchParams } = req.nextUrl
  const jobId = searchParams.get("jobId") ?? ""
  const stage = searchParams.get("stage") ?? ""
  const status = searchParams.get("status") ?? ""

  const applicants = await prisma.jobApplication.findMany({
    where: {
      ...(jobId ? { jobPostingId: jobId } : {}),
      ...(stage ? { stage: stage as any } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: { jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ applicants })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { jobPostingId, candidateName, candidateEmail, candidatePhone, resumeUrl, coverLetter, notes } = await req.json()
  if (!jobPostingId || !candidateName || !candidateEmail) {
    return NextResponse.json({ error: "Job, name, and email are required" }, { status: 400 })
  }

  const applicant = await prisma.jobApplication.create({
    data: { jobPostingId, candidateName, candidateEmail, candidatePhone, resumeUrl, coverLetter, notes },
    include: { jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } } },
  })

  return NextResponse.json({ applicant }, { status: 201 })
}
