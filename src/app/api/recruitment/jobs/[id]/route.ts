import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { id } = await params
  const body = await req.json()
  const allowed = ["title", "description", "requirements", "departmentId", "employmentType", "location", "salaryMin", "salaryMax", "isInternal", "status", "openDate", "closeDate"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const job = await prisma.jobPosting.update({
    where: { id },
    data,
    include: { department: true, _count: { select: { applications: true } } },
  })

  return NextResponse.json({ job })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { id } = await params
  await prisma.jobPosting.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
