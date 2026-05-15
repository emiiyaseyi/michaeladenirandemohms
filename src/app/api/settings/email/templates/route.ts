import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const { eventKey, name, subject, body, variables = [], isActive = true } = await req.json()
  if (!eventKey || !name || !subject || !body) {
    return NextResponse.json({ error: "eventKey, name, subject and body are required" }, { status: 400 })
  }

  const existing = await prisma.emailTemplate.findUnique({ where: { eventKey } })
  if (existing) return NextResponse.json({ error: "A template for this event already exists. Edit the existing one." }, { status: 409 })

  const template = await prisma.emailTemplate.create({
    data: { eventKey, name, subject, body, variables, isActive },
  })

  return NextResponse.json({ template }, { status: 201 })
}
