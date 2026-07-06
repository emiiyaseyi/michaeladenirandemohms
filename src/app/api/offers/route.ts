import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  const viewPerm = requirePermission(user, "canViewOffers")
  if (viewPerm) return viewPerm

  const offers = await prisma.offerLetter.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      jobApplication: { select: { id: true, jobPosting: { select: { title: true } } } },
    },
  })

  return NextResponse.json({ offers })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canManageOffers")
  if (perm) return perm

  const body = await req.json()
  const { candidateName, candidateEmail, jobTitle, departmentId, managerId, hireDate, salary, letterText, jobApplicationId } = body

  if (!candidateName?.trim() || !candidateEmail?.trim()) {
    return NextResponse.json({ error: "Candidate name and email are required" }, { status: 400 })
  }

  if (jobApplicationId) {
    const application = await prisma.jobApplication.findUnique({ where: { id: jobApplicationId }, include: { offerLetter: true } })
    if (!application) return NextResponse.json({ error: "Job application not found" }, { status: 404 })
    if (application.offerLetter) return NextResponse.json({ error: "This application already has an offer" }, { status: 409 })
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
      jobApplicationId: jobApplicationId || null,
    },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      jobApplication: { select: { id: true, jobPosting: { select: { title: true } } } },
    },
  })

  if (jobApplicationId) {
    await prisma.jobApplication.update({ where: { id: jobApplicationId }, data: { stage: "OFFER" } })
  }

  await logAudit({
    req, actor: user, action: "OFFER_CREATE", entity: "OfferLetter", entityId: offer.id,
    newValues: { candidateName, candidateEmail, jobTitle, salary, hireDate, jobApplicationId },
  })

  return NextResponse.json({ offer }, { status: 201 })
}
