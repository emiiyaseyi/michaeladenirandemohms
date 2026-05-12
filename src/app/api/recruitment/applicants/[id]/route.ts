import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { id } = await params
  const body = await req.json()
  const allowed = ["stage", "status", "notes", "rejectionReason"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const applicant = await prisma.jobApplication.update({
    where: { id },
    data,
    include: { jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } } },
  })

  return NextResponse.json({ applicant })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { id } = await params
  await prisma.jobApplication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
