import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error

  const canFill = user.role === "SUPER_ADMIN" || !!user.permissions["canFillAttendance"]
  if (!canFill) return forbidden("You do not have permission to fill attendance ratings")

  const { id } = await params
  const report = await prisma.internWeeklyReport.findUnique({ where: { id }, select: { id: true } })
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const { attendanceRating, attendanceComment } = await req.json()

  if (attendanceRating !== undefined && (attendanceRating < 0 || attendanceRating > 3 || !Number.isInteger(attendanceRating))) {
    return NextResponse.json({ error: "attendanceRating must be an integer between 0 and 3" }, { status: 400 })
  }

  const updated = await prisma.internWeeklyReport.update({
    where: { id },
    data: {
      attendanceRating: attendanceRating ?? undefined,
      attendanceComment: attendanceComment ?? undefined,
      attendanceFilledAt: new Date(),
      attendanceFilledById: user.employeeId,
    },
  })

  return NextResponse.json({ report: updated })
}
