import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden, hasCap } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
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
      SELECT dr.id, dr."employeeId", dr."documentType", dr.purpose, dr.notes,
        dr.status, dr."declineReason", dr."createdAt", dr."updatedAt",
        json_build_object('id', e.id, 'firstName', e."firstName", 'lastName', e."lastName",
          'profilePhoto', e."profilePhoto", 'employeeId', e."employeeId", 'jobTitle', e."jobTitle") as employee
      FROM "DocumentRequest" dr
      JOIN "Employee" e ON e.id = dr."employeeId"
      WHERE ($1 = '' OR dr.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($5 = '' OR dr."employeeId" = $5)
      ORDER BY dr."createdAt" DESC
      LIMIT $3 OFFSET $4
    `, status, searchPat, perPage, offset, employeeId),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "DocumentRequest" dr
      JOIN "Employee" e ON e.id = dr."employeeId"
      WHERE ($1 = '' OR dr.status = $1)
        AND ($2 = '%%' OR e."firstName" ILIKE $2 OR e."lastName" ILIKE $2)
        AND ($3 = '' OR dr."employeeId" = $3)
    `, status, searchPat, employeeId),
  ])

  const total = Number((counts as any)[0]?.count ?? 0)
  return NextResponse.json({ requests, total, page, perPage })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canManageSettings") && !hasCap(user, "canViewAllEmployees")) return forbidden()

  const { employeeId, documentType, purpose, notes } = await req.json()

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!documentType) return NextResponse.json({ error: "Document type is required" }, { status: 400 })

  const [request] = await prisma.$queryRaw<any[]>`
    INSERT INTO "DocumentRequest" (id, "employeeId", "documentType", purpose, notes, status, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${employeeId}, ${documentType}, ${purpose ?? null}, ${notes ?? null}, 'PENDING', NOW(), NOW())
    RETURNING id, "employeeId", "documentType", purpose, status, "createdAt"
  `

  const ownerEmp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } })
  await logAudit({
    req: req as any, actor: user, action: "DOC_REQUEST_CREATE", entity: "DocumentRequest", entityId: request.id,
    targetUserId: ownerEmp?.userId ?? null,
    newValues: { employeeId, documentType, purpose, notes },
  })

  return NextResponse.json({ request }, { status: 201 })
}
