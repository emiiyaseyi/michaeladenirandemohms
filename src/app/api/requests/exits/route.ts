import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission, forbidden } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canApproveExitRequest")
  if (perm) return perm

  const { searchParams } = req.nextUrl
  const employeeId = searchParams.get("employeeId") ?? ""

  const requests = await prisma.$queryRawUnsafe<any[]>(`
    SELECT er.id, er."employeeId", er."exitType", er."intendedLastDay", er.reason,
      er.status, er."declineReason", er."createdAt", er."updatedAt",
      json_build_object('id', e.id, 'firstName', e."firstName", 'lastName', e."lastName",
        'profilePhoto', e."profilePhoto", 'employeeId', e."employeeId", 'jobTitle', e."jobTitle",
        'department', CASE WHEN d.id IS NOT NULL THEN json_build_object('name', d.name) ELSE NULL END) as employee
    FROM "ExitRequest" er
    JOIN "Employee" e ON e.id = er."employeeId"
    LEFT JOIN "Department" d ON d.id = e."departmentId"
    WHERE ($1 = '' OR er."employeeId" = $1)
    ORDER BY er."createdAt" DESC
  `, employeeId)

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const perm = requirePermission(user, "canApproveExitRequest")
  if (perm) return perm

  const { employeeId, exitType, intendedLastDay, reason, noteForUser } = await req.json()

  if (!employeeId) return NextResponse.json({ error: "Employee is required" }, { status: 400 })
  if (!exitType) return NextResponse.json({ error: "Exit type is required" }, { status: 400 })
  if (!intendedLastDay) return NextResponse.json({ error: "Exit date is required" }, { status: 400 })

  const request = await prisma.exitRequest.create({
    data: {
      employeeId,
      exitType,
      intendedLastDay: new Date(intendedLastDay),
      reason: reason ?? null,
      status: "PENDING",
    },
  })

  return NextResponse.json({ request }, { status: 201 })
}
