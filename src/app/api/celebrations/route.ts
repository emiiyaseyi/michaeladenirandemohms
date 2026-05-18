import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { differenceInYears } from "date-fns"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const employees = await prisma.employee.findMany({
    where: { employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      profilePhoto: true,
      dateOfBirth: true,
      hireDate: true,
      employeeStatus: true,
    },
  })

  const today = new Date()
  const in60 = new Date(today)
  in60.setDate(today.getDate() + 60)

  const events: any[] = employees.flatMap(m => {
    const list: any[] = []

    if (m.employeeStatus === "ON_LEAVE") {
      list.push({
        type: "onLeave",
        employeeId: m.id,
        name: `${m.firstName} ${m.lastName}`,
        jobTitle: m.jobTitle,
        profilePhoto: m.profilePhoto,
      })
    }

    if (m.dateOfBirth) {
      const dob = new Date(m.dateOfBirth)
      const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      if (thisYear >= today && thisYear <= in60) {
        const age = differenceInYears(thisYear, dob)
        list.push({ type: "birthday", employeeId: m.id, name: `${m.firstName} ${m.lastName}`, date: thisYear.toISOString(), age, jobTitle: m.jobTitle, profilePhoto: m.profilePhoto })
      }
    }

    if (m.hireDate) {
      const hire = new Date(m.hireDate)
      const thisYearAnn = new Date(today.getFullYear(), hire.getMonth(), hire.getDate())
      const years = differenceInYears(thisYearAnn, hire)
      if (thisYearAnn >= today && thisYearAnn <= in60 && years > 0) {
        list.push({ type: "anniversary", employeeId: m.id, name: `${m.firstName} ${m.lastName}`, date: thisYearAnn.toISOString(), years, jobTitle: m.jobTitle, profilePhoto: m.profilePhoto })
      }
    }

    return list
  })

  const dated = events.filter(e => e.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const undated = events.filter(e => !e.date)

  return NextResponse.json({ events: [...dated, ...undated] })
}
