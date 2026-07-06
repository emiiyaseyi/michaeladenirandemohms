import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const viewPerm = requirePermission(user, "canManageOfferTemplates")
  if (viewPerm) return viewPerm
  const { id } = await params
  const template = await prisma.offerTemplate.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageOfferTemplates")
  if (perm) return perm

  const { id } = await params
  const data = await req.json()
  const template = await prisma.offerTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.signatureText !== undefined && { signatureText: data.signatureText }),
    },
  })
  return NextResponse.json({ template })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageOfferTemplates")
  if (perm) return perm

  const { id } = await params
  await prisma.offerTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
