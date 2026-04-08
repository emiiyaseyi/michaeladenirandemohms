import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageOffboarding) return forbidden("No access to offboarding data")
  const [offboardings, employees] = await Promise.all([
    prisma.offboarding.findMany({
      include: { employee: { select: { firstName: true, lastName: true, jobTitle: true, profilePhoto: true } }, tasks: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ])
  return NextResponse.json({ offboardings, employees })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageOffboarding) return forbidden()

  const { employeeId, exitType, lastWorkingDay, reason } = await req.json()
  if (!employeeId || !exitType || !lastWorkingDay) return NextResponse.json({ error: "Required fields missing" }, { status: 400 })

  const ob = await prisma.offboarding.create({
    data: {
      employeeId, exitType: exitType as any, lastWorkingDay: new Date(lastWorkingDay),
      reason: reason || null, status: "INITIATED",
      tasks: {
        create: [
          { title: "Asset Return", category: "ADMIN", assignedTo: "Admin" },
          { title: "Access Revocation", category: "IT", assignedTo: "IT" },
          { title: "Final Salary Processing", category: "FINANCE", assignedTo: "Finance" },
          { title: "Knowledge Transfer Document", category: "ADMIN", assignedTo: "Line Manager" },
          { title: "HR Documentation", category: "HR", assignedTo: "HR Admin" },
        ]
      }
    },
    include: { tasks: true }
  })

  const emp = await prisma.employee.update({
    where: { id: employeeId },
    data: { employeeStatus: exitType === "RESIGNATION" ? "RESIGNED" : "TERMINATED" },
    select: { userId: true, firstName: true, lastName: true },
  })

  // Notify the employee that offboarding has been initiated
  await prisma.notification.create({
    data: {
      userId: emp.userId,
      employeeId,
      title: "Offboarding Process Initiated",
      message: `Your offboarding process has been initiated (${exitType.toLowerCase().replace("_", " ")}). Please complete all assigned offboarding tasks.`,
      type: "WARNING",
      link: "/offboarding",
    },
  })

  return NextResponse.json({ offboarding: ob }, { status: 201 })
}
