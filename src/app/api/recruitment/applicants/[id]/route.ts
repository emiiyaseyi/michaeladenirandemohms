import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

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

  const before = await prisma.jobApplication.findUnique({ where: { id } })
  const applicant = await prisma.jobApplication.update({
    where: { id },
    data,
    include: { jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } } },
  })

  const diff = before ? diffFields(before as any, applicant as any, allowed as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "APPLICANT_EDIT", entity: "JobApplication", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ applicant })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageRecruitment) return forbidden()

  const { id } = await params
  const before = await prisma.jobApplication.findUnique({ where: { id } })
  await prisma.jobApplication.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "APPLICANT_DELETE", entity: "JobApplication", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
