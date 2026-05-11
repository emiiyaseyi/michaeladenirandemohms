import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  let empId = user.employeeId
  if (!empId) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    empId = emp?.id
  }
  if (!empId) return NextResponse.json({ offboarding: null, exitRequest: null })

  const [offboarding, exitRequest] = await Promise.all([
    prisma.offboarding.findUnique({
      where: { employeeId: empId },
      include: { tasks: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.exitRequest.findFirst({
      where: { employeeId: empId, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return NextResponse.json({ offboarding, exitRequest })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let empId = user.employeeId
  if (!empId) {
    const emp = await prisma.employee.findFirst({ where: { userId: user.id }, select: { id: true } })
    empId = emp?.id
  }
  if (!empId) return NextResponse.json({ error: "No employee profile found" }, { status: 404 })

  // Prevent double-submit
  const existing = await prisma.exitRequest.findFirst({
    where: { employeeId: empId, status: "PENDING" },
  })
  if (existing) return NextResponse.json({ error: "You already have a pending exit request." }, { status: 409 })

  const { exitType, reason, intendedLastDay, documentUrl } = await req.json()
  if (!intendedLastDay) return NextResponse.json({ error: "Intended last day is required" }, { status: 400 })

  const ALLOWED_EXIT_TYPES = ["RESIGNATION", "RETIREMENT", "CONTRACT_END", "REDUNDANCY"]
  const safeExitType = ALLOWED_EXIT_TYPES.includes(exitType) ? exitType : "RESIGNATION"
  const EXIT_LABEL: Record<string, string> = { RESIGNATION: "Resignation", RETIREMENT: "Retirement", CONTRACT_END: "Contract End", REDUNDANCY: "Redundancy" }

  const emp = await prisma.employee.findUnique({
    where: { id: empId },
    select: { firstName: true, lastName: true },
  })

  // Create persistent exit request record
  await prisma.exitRequest.create({
    data: {
      employeeId: empId,
      exitType: safeExitType as any,
      intendedLastDay: new Date(intendedLastDay),
      reason: reason || null,
      documentUrl: documentUrl || null,
    },
  })

  const date = new Date(intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  // Notify SUPER_ADMINs + elevated users with canApproveExitRequest
  const [superAdmins, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { id: true } }),
    prisma.userAdminRole.findMany({
      include: {
        adminRole: { select: { permissions: true } },
        user: { select: { id: true, isActive: true } },
      },
    }),
  ])
  const recipients = new Set<string>(superAdmins.map(u => u.id))
  const permsMap = new Map<string, Record<string, boolean>>()
  for (const { user: u, adminRole } of assignments) {
    if (!u.isActive) continue
    const merged = permsMap.get(u.id) ?? {}
    const p = adminRole.permissions as Record<string, boolean>
    for (const [k, v] of Object.entries(p)) if (v) merged[k] = true
    permsMap.set(u.id, merged)
  }
  for (const [uid, perms] of permsMap.entries()) {
    if (perms["canApproveExitRequest"]) recipients.add(uid)
  }

  for (const userId of recipients) {
    await prisma.notification.create({
      data: {
        userId,
        employeeId: empId!,
        title: "Exit Request Submitted",
        message: `${emp?.firstName} ${emp?.lastName} has submitted an exit request (${EXIT_LABEL[safeExitType]}). Intended last day: ${date}.${reason ? ` Reason: ${reason}` : ""}`,
        type: "WARNING",
        link: "/admin/requests/exits",
      },
    })
  }

  // Confirm to the employee
  await prisma.notification.create({
    data: {
      userId: user.id,
      employeeId: empId,
      title: "Exit Request Submitted",
      message: "Your exit request has been submitted to HR. They will review it shortly.",
      type: "INFO",
      link: "",
    },
  })

  return NextResponse.json({ success: true })
}
