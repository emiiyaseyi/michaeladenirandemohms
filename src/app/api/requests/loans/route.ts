import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden, requirePermission } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") ?? ""
  const search = searchParams.get("search") ?? ""
  const employeeId = searchParams.get("employeeId") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const perPage = 20
  const offset = (page - 1) * perPage
  const searchPat = `%${search}%`

  const [loans, counts] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT lr.id, lr."employeeId", lr."policyName", lr.amount, lr."repaymentTenor", lr.interval,
        lr.reason, lr.status, lr."declineReason", lr."disburseWithPayroll", lr."deductFromPayroll",
        lr."noteForUser", lr."documentUrl", lr."createdAt", lr."updatedAt",
        json_build_object('id', e.id, 'firstName', e."firstName", 'lastName', e."lastName",
          'profilePhoto', e."profilePhoto", 'employeeId', e."employeeId", 'jobTitle', e."jobTitle") as employee
      FROM "LoanRequest" lr
      JOIN "Employee" e ON e.id = lr."employeeId"
      WHERE ($1 = '' OR lr.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2 OR lr."policyName" ILIKE $2)
        AND ($5 = '' OR lr."employeeId" = $5)
      ORDER BY lr."createdAt" DESC
      LIMIT $3 OFFSET $4
    `, status, searchPat, perPage, offset, employeeId),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "LoanRequest" lr
      JOIN "Employee" e ON e.id = lr."employeeId"
      WHERE ($1 = '' OR lr.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2 OR lr."policyName" ILIKE $2)
        AND ($3 = '' OR lr."employeeId" = $3)
    `, status, searchPat, employeeId),
  ])

  const total = Number((counts as any)[0]?.count ?? 0)
  return NextResponse.json({ loans, total, page, perPage })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()
  const perm = requirePermission(user, "canCreateLoan")
  if (perm) return perm

  const body = await req.json()
  const { employeeId, policyName, amount, repaymentTenor, interval, reason, noteForUser } = body

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount is required" }, { status: 400 })
  if (!repaymentTenor || repaymentTenor <= 0) return NextResponse.json({ error: "Repayment tenor is required" }, { status: 400 })

  const [loan] = await prisma.$queryRaw<any[]>`
    INSERT INTO "LoanRequest" (id, "employeeId", "policyName", amount, "repaymentTenor", interval, reason, "noteForUser", status, "disburseWithPayroll", "deductFromPayroll", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${employeeId}, ${policyName ?? "Company Sponsored"}, ${parseFloat(amount)}, ${parseInt(repaymentTenor)}, ${interval ?? "Months"}, ${reason ?? null}, ${noteForUser ?? null}, 'PENDING', false, false, NOW(), NOW())
    RETURNING id, "employeeId", "policyName", amount, "repaymentTenor", interval, reason, status, "createdAt"
  `
  return NextResponse.json({ loan }, { status: 201 })
}
