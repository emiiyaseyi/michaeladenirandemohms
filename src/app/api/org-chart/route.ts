import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [departments, roots] = await Promise.all([
    prisma.department.findMany({
      include: {
        division: true,
        _count: { select: { employees: true } },
        employees: { take: 3, select: { id: true, firstName: true, lastName: true, profilePhoto: true, jobTitle: true } }
      },
      orderBy: { name: "asc" }
    }),
    prisma.employee.findMany({
      where: { managerId: null, employeeStatus: "ACTIVE" },
      include: {
        department: { select: { name: true } },
        directReports: {
          include: {
            department: { select: { name: true } },
            directReports: {
              include: {
                department: { select: { name: true } },
                directReports: { select: { id: true, firstName: true, lastName: true } }
              }
            }
          }
        }
      },
    }),
  ])
  return NextResponse.json({ departments, roots })
}
