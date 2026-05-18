import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const template = await prisma.surveyTemplate.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  })

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const data = await req.json()

  const template = await prisma.surveyTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
    },
  })

  return NextResponse.json({ template })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const { id } = await params
  const template = await prisma.surveyTemplate.findUnique({ where: { id }, select: { isDefault: true } })
  if (template?.isDefault) return NextResponse.json({ error: "Cannot delete a default template" }, { status: 400 })

  await prisma.surveyTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
