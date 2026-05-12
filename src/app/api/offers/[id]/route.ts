import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

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
  if (!caps(user.role).canViewAllEmployees) return forbidden()

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

  const offer = await prisma.offerLetter.update({
    where: { id },
    data,
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({ offer })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canViewAllEmployees) return forbidden()

  const { id } = await params
  await prisma.offerLetter.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
