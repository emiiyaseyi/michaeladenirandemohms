import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageRecruitment")) return forbidden()

  const { id } = await params
  const body = await req.json()
  const allowed = ["title", "description", "requirements", "departmentId", "employmentType", "location", "salaryMin", "salaryMax", "isInternal", "status", "openDate", "closeDate"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const before = await prisma.jobPosting.findUnique({ where: { id } })
  const job = await prisma.jobPosting.update({
    where: { id },
    data,
    include: { department: true, _count: { select: { applications: true } } },
  })

  const diff = before ? diffFields(before as any, job as any, allowed as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "JOB_EDIT", entity: "JobPosting", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ job })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageRecruitment")) return forbidden()

  const { id } = await params
  const before = await prisma.jobPosting.findUnique({ where: { id }, select: { title: true, status: true } })
  await prisma.jobPosting.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "JOB_DELETE", entity: "JobPosting", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
