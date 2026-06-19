import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, hasCap, forbidden } from "@/lib/api-auth"

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000) + 1)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(user, "canViewAbsences")) return forbidden()

  const { batchId } = await params
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const records = await prisma.absenceRecord.findMany({
    where: {
      batchId,
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(search ? {
        employee: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName:  { contains: search, mode: "insensitive" } },
          ],
        },
      } : {}),
    },
    include: { employee: { select: { id:true, firstName:true, lastName:true, profilePhoto:true, jobTitle:true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ records })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { user: _user, error } = await requireAuth()
  if (error) return error
  if (!hasCap(_user, "canCreateAbsence")) return forbidden()

  const { batchId } = await params
  const { employeeId, absentStart, absentEnd, reason, note } = await req.json()

  if (!employeeId || !absentStart || !absentEnd || !reason?.trim())
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  const start = new Date(absentStart)
  const end   = new Date(absentEnd)
  const totalDays = daysBetween(start, end)

  const record = await prisma.absenceRecord.create({
    data: { batchId, employeeId, absentStart: start, absentEnd: end, totalDays, reason: reason.trim(), note: note || null },
  })
  return NextResponse.json({ record }, { status: 201 })
}
