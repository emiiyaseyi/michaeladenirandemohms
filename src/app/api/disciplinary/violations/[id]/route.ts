import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const violation = await prisma.violation.update({ where: { id }, data: body })
  return NextResponse.json({ violation })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.violation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
