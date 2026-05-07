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

  const [requests, counts] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT r.id, r."employeeId", r."fromDepartmentId", r."toDepartmentId",
        r."fromJobTitle", r."toJobTitle", r."effectiveDate", r.reason, r."noteForUser",
        r.status, r."declineReason", r."createdAt", r."updatedAt",
        json_build_object('id', e.id, 'firstName', e."firstName", 'lastName', e."lastName",
          'profilePhoto', e."profilePhoto", 'employeeId', e."employeeId", 'jobTitle', e."jobTitle") as employee,
        CASE WHEN fd.id IS NOT NULL THEN json_build_object('id', fd.id, 'name', fd.name) ELSE NULL END as "fromDepartment",
        CASE WHEN td.id IS NOT NULL THEN json_build_object('id', td.id, 'name', td.name) ELSE NULL END as "toDepartment"
      FROM "RedeploymentRequest" r
      JOIN "Employee" e ON e.id = r."employeeId"
      LEFT JOIN "Department" fd ON fd.id = r."fromDepartmentId"
      LEFT JOIN "Department" td ON td.id = r."toDepartmentId"
      WHERE ($1 = '' OR r.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($5 = '' OR r."employeeId" = $5)
      ORDER BY r."createdAt" DESC
      LIMIT $3 OFFSET $4
    `, status, searchPat, perPage, offset, employeeId),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "RedeploymentRequest" r
      JOIN "Employee" e ON e.id = r."employeeId"
      WHERE ($1 = '' OR r.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($3 = '' OR r."employeeId" = $3)
    `, status, searchPat, employeeId),
  ])

  const total = Number((counts as any)[0]?.count ?? 0)
  return NextResponse.json({ requests, total, page, perPage })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings && !caps(user.role).canViewAllEmployees) return forbidden()

  const { employeeId, fromDepartmentId, toDepartmentId, fromJobTitle, toJobTitle, effectiveDate, reason, noteForUser } = await req.json()

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!toDepartmentId && !toJobTitle) return NextResponse.json({ error: "New department or new job title is required" }, { status: 400 })

  const [request] = await prisma.$queryRaw<any[]>`
    INSERT INTO "RedeploymentRequest" (id, "employeeId", "fromDepartmentId", "toDepartmentId", "fromJobTitle", "toJobTitle", "effectiveDate", reason, "noteForUser", status, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${employeeId}, ${fromDepartmentId ?? null}, ${toDepartmentId ?? null}, ${fromJobTitle ?? null}, ${toJobTitle ?? null}, ${effectiveDate ? new Date(effectiveDate) : null}, ${reason ?? null}, ${noteForUser ?? null}, 'PENDING', NOW(), NOW())
    RETURNING id, "employeeId", status, "createdAt"
  `
  return NextResponse.json({ request }, { status: 201 })
}
