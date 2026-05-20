import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit, diffFields } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const offer = await prisma.offerLetter.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ offer })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const body = await req.json()

  const allowed = ["candidateName", "candidateEmail", "jobTitle", "departmentId", "managerId", "hireDate", "salary", "letterText", "status"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      if (key === "hireDate") data[key] = body[key] ? new Date(body[key]) : null
      else if (key === "salary") data[key] = body[key] ? parseFloat(body[key]) : null
      else data[key] = body[key]
    }
  }

  const before = await prisma.offerLetter.findUnique({ where: { id } })
  const offer = await prisma.offerLetter.update({
    where: { id },
    data,
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const diff = before ? diffFields(before as any, offer as any, allowed as any) : null
  if (diff) {
    await logAudit({
      req, actor: user, action: "OFFER_EDIT", entity: "OfferLetter", entityId: id,
      oldValues: diff.old, newValues: diff.new,
    })
  }

  return NextResponse.json({ offer })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const { id } = await params
  const before = await prisma.offerLetter.findUnique({ where: { id }, select: { candidateName: true, candidateEmail: true, jobTitle: true } })
  await prisma.offerLetter.delete({ where: { id } })

  await logAudit({
    req, actor: user, action: "OFFER_DELETE", entity: "OfferLetter", entityId: id,
    oldValues: before ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
