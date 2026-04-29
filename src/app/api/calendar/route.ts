import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps } from "@/lib/api-auth"
import { differenceInYears } from "date-fns"

function ordStr(n: number) {
  if (n === 1 || n === 21 || n === 31) return `${n}st`
  if (n === 2 || n === 22) return `${n}nd`
  if (n === 3 || n === 23) return `${n}rd`
  return `${n}th`
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const c = caps(user.role)
  if (!c.canViewAllLeave) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const year  = parseInt(req.nextUrl.searchParams.get("year")  ?? String(new Date().getFullYear()))
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? String(new Date().getMonth() + 1))

  // Broad range to catch events that bleed into the visible calendar area
  const rangeStart = new Date(year, month - 1, -6)
  const rangeEnd   = new Date(year, month, 13)

  const events: any[] = []

  // ── Leave requests ────────────────────────────────────────────────────────────
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: rangeEnd },
      endDate:   { gte: rangeStart },
    },
    include: { employee: { select: { firstName: true, lastName: true } } },
  })

  for (const lv of leaves) {
    const fn = lv.employee.firstName
    const ln = lv.employee.lastName.charAt(0)
    const pending = lv.status === "PENDING"
    events.push({
      id:    lv.id,
      title: pending ? `Pending ${fn} ${ln}'s Leave` : `${fn} ${ln}'s Leave`,
      type:  pending ? "leave_pending" : "leave",
      start: lv.startDate.toISOString().split("T")[0],
      end:   lv.endDate.toISOString().split("T")[0],
    })
  }

  // ── Birthdays & anniversaries ─────────────────────────────────────────────────
  const employees = await prisma.employee.findMany({
    where: { employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] } },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, hireDate: true },
  })

  for (const emp of employees) {
    const fn = emp.firstName
    const ln = emp.lastName.charAt(0)

    if (emp.dateOfBirth) {
      for (const y of [year - 1, year, year + 1]) {
        const dob = new Date(emp.dateOfBirth)
        const d = new Date(y, dob.getMonth(), dob.getDate())
        if (d >= rangeStart && d <= rangeEnd) {
          const ds = `${y}-${String(dob.getMonth()+1).padStart(2,"0")}-${String(dob.getDate()).padStart(2,"0")}`
          events.push({ id: `bday-${emp.id}-${y}`, title: `${fn} ${ln}'s Birthday`, type: "birthday", start: ds, end: ds })
        }
      }
    }

    if (emp.hireDate) {
      for (const y of [year - 1, year, year + 1]) {
        const hire = new Date(emp.hireDate)
        const d = new Date(y, hire.getMonth(), hire.getDate())
        const yrs = differenceInYears(d, new Date(emp.hireDate))
        if (d >= rangeStart && d <= rangeEnd && yrs > 0) {
          const ds = `${y}-${String(hire.getMonth()+1).padStart(2,"0")}-${String(hire.getDate()).padStart(2,"0")}`
          events.push({ id: `ann-${emp.id}-${y}`, title: `${fn} ${ln}'s ${ordStr(yrs)} Anniversary`, type: "anniversary", start: ds, end: ds })
        }
      }
    }
  }

  // ── Public holidays ───────────────────────────────────────────────────────────
  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: rangeStart, lte: rangeEnd } },
  })
  for (const h of holidays) {
    events.push({ id: `hol-${h.id}`, title: h.name, type: "holiday", start: h.date.toISOString().split("T")[0], end: h.date.toISOString().split("T")[0] })
  }

  // ── Pay day (27th of every month in view) ────────────────────────────────────
  for (let mOff = -1; mOff <= 2; mOff++) {
    const d = new Date(year, month - 1 + mOff, 27)
    if (d >= rangeStart && d <= rangeEnd) {
      const y = d.getFullYear(), m = d.getMonth() + 1
      events.push({ id: `payday-${y}-${m}`, title: "Pay day", type: "payday", start: `${y}-${String(m).padStart(2,"0")}-27`, end: `${y}-${String(m).padStart(2,"0")}-27` })
    }
  }

  return NextResponse.json({ events })
}
