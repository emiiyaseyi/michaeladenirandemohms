import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

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

  const [advances, counts] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT sa.id, sa."employeeId", sa."policyName", sa.amount, sa."repaymentTenor", sa.interval,
        sa.reason, sa.status, sa."declineReason", sa."noteForUser", sa."documentUrl", sa."createdAt", sa."updatedAt",
        json_build_object('id', e.id, 'firstName', e."firstName", 'lastName', e."lastName",
          'profilePhoto', e."profilePhoto", 'employeeId', e."employeeId", 'jobTitle', e."jobTitle") as employee
      FROM "SalaryAdvanceRequest" sa
      JOIN "Employee" e ON e.id = sa."employeeId"
      WHERE ($1 = '' OR sa.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($5 = '' OR sa."employeeId" = $5)
      ORDER BY sa."createdAt" DESC
      LIMIT $3 OFFSET $4
    `, status, searchPat, perPage, offset, employeeId),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "SalaryAdvanceRequest" sa
      JOIN "Employee" e ON e.id = sa."employeeId"
      WHERE ($1 = '' OR sa.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($3 = '' OR sa."employeeId" = $3)
    `, status, searchPat, employeeId),
  ])

  const total = Number((counts as any)[0]?.count ?? 0)
  return NextResponse.json({ advances, total, page, perPage })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const { employeeId, policyName, amount, repaymentTenor, interval, reason, noteForUser } = await req.json()

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount is required" }, { status: 400 })
  if (!repaymentTenor || repaymentTenor <= 0) return NextResponse.json({ error: "Repayment tenor is required" }, { status: 400 })

  const [advance] = await prisma.$queryRaw<any[]>`
    INSERT INTO "SalaryAdvanceRequest" (id, "employeeId", "policyName", amount, "repaymentTenor", interval, reason, "noteForUser", status, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${employeeId}, ${policyName ?? null}, ${parseFloat(amount)}, ${parseInt(repaymentTenor)}, ${interval ?? "Months"}, ${reason ?? null}, ${noteForUser ?? null}, 'PENDING', NOW(), NOW())
    RETURNING id, "employeeId", "policyName", amount, "repaymentTenor", interval, reason, status, "createdAt"
  `
  return NextResponse.json({ advance }, { status: 201 })
}
