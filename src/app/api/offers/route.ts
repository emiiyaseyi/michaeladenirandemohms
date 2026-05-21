import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const offers = await prisma.offerLetter.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({ offers })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAllEmployees")) return forbidden()

  const body = await req.json()
  const { candidateName, candidateEmail, jobTitle, departmentId, managerId, hireDate, salary, letterText } = body

  if (!candidateName?.trim() || !candidateEmail?.trim()) {
    return NextResponse.json({ error: "Candidate name and email are required" }, { status: 400 })
  }

  const offer = await prisma.offerLetter.create({
    data: {
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      jobTitle: jobTitle?.trim() || null,
      departmentId: departmentId || null,
      managerId: managerId || null,
      hireDate: hireDate ? new Date(hireDate) : null,
      salary: salary ? parseFloat(salary) : null,
      letterText: letterText?.trim() || null,
    },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  await logAudit({
    req, actor: user, action: "OFFER_CREATE", entity: "OfferLetter", entityId: offer.id,
    newValues: { candidateName, candidateEmail, jobTitle, salary, hireDate },
  })

  return NextResponse.json({ offer }, { status: 201 })
}
