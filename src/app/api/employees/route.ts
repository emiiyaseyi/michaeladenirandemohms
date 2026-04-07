import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""
  const dept = searchParams.get("dept") ?? ""

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        AND: [
          search ? { OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { workEmail: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
            { jobTitle: { contains: search, mode: "insensitive" } },
          ]} : {},
          status ? { employeeStatus: status as any } : {},
          dept ? { departmentId: dept } : {},
        ]
      },
      include: { department: true, manager: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ])

  return NextResponse.json({ employees, departments })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, workEmail, phone, jobTitle, departmentId, employmentType, hireDate, gender } = body

  if (!firstName || !lastName || !workEmail) {
    return NextResponse.json({ error: "First name, last name and email are required" }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await prisma.employee.findFirst({ where: { workEmail } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 })

  // Generate employee ID
  const count = await prisma.employee.count()
  const employeeId = `DSN${String(count + 1).padStart(4, "0")}`

  // Create user + employee
  const hashedPwd = await bcrypt.hash("Welcome@DSN1", 10)
  const user = await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email: workEmail,
      password: hashedPwd,
      role: "STAFF",
    }
  })

  const employee = await prisma.employee.create({
    data: {
      userId: user.id, employeeId, firstName, lastName, workEmail,
      phone: phone || null,
      jobTitle: jobTitle || null,
      departmentId: departmentId || null,
      employmentType: (employmentType ?? "FULL_TIME") as any,
      hireDate: hireDate ? new Date(hireDate) : null,
      gender: (gender || null) as any,
    },
    include: { department: true }
  })

  return NextResponse.json({ employee }, { status: 201 })
}
