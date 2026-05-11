import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// POST — enroll employees (upsert deduction settings)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewBenefits")
  if (perm) return perm

  const { id: benefitId } = await params
  const body = await req.json()

  const benefit = await prisma.benefit.findUnique({ where: { id: benefitId } })
  if (!benefit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // body.enrollments: Array<{ employeeId, employeeDeductionType, employeeDeductionValue, companyContributionType, companyContributionValue, cumulativeDeduction, cumulativeContribution }>
  const enrollments: any[] = body.enrollments ?? []
  if (!enrollments.length) return NextResponse.json({ error: "No enrollments provided" }, { status: 400 })

  const results = await Promise.all(
    enrollments.map(e =>
      prisma.benefitEnrollment.upsert({
        where: { benefitId_employeeId: { benefitId, employeeId: e.employeeId } },
        create: {
          benefitId,
          employeeId: e.employeeId,
          employeeDeductionType: e.employeeDeductionType ?? "AMOUNT",
          employeeDeductionValue: e.employeeDeductionValue ?? 0,
          companyContributionType: e.companyContributionType ?? "AMOUNT",
          companyContributionValue: e.companyContributionValue ?? 0,
          cumulativeDeduction: e.cumulativeDeduction ?? 0,
          cumulativeContribution: e.cumulativeContribution ?? 0,
          effectiveDate: e.effectiveDate ? new Date(e.effectiveDate) : benefit.effectiveDate,
        },
        update: {
          employeeDeductionType: e.employeeDeductionType ?? "AMOUNT",
          employeeDeductionValue: e.employeeDeductionValue ?? 0,
          companyContributionType: e.companyContributionType ?? "AMOUNT",
          companyContributionValue: e.companyContributionValue ?? 0,
          cumulativeDeduction: e.cumulativeDeduction ?? 0,
          cumulativeContribution: e.cumulativeContribution ?? 0,
          effectiveDate: e.effectiveDate ? new Date(e.effectiveDate) : undefined,
        },
      })
    )
  )

  return NextResponse.json({ count: results.length })
}

// DELETE — remove specific employees from enrollment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canViewBenefits")
  if (perm) return perm

  const { id: benefitId } = await params
  const body = await req.json()
  const employeeIds: string[] = body.employeeIds ?? []

  await prisma.benefitEnrollment.deleteMany({
    where: { benefitId, employeeId: { in: employeeIds } },
  })

  return NextResponse.json({ ok: true })
}
