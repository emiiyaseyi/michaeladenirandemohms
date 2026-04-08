import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"

// GET /api/settings/users — list all users with employee snapshot
export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Super Admin only")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          jobTitle: true,
          employeeStatus: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json({ users })
}

// POST /api/settings/users — create a new user + employee record
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden("Super Admin only")

  const body = await req.json()
  const {
    email, password, name, role,
    firstName, lastName, employeeId: empId,
    jobTitle, departmentId, employmentType,
  } = body

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "email, password, firstName, lastName are required" }, { status: 400 })
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  // Auto-generate employeeId if not provided
  const count = await prisma.employee.count()
  const generatedEmpId = empId || `DSN-${String(count + 1).padStart(4, "0")}`

  // Check duplicate employeeId
  const existingEmp = await prisma.employee.findUnique({ where: { employeeId: generatedEmpId } })
  if (existingEmp) return NextResponse.json({ error: "Employee ID already in use" }, { status: 409 })

  const hashedPassword = await bcrypt.hash(password, 12)

  const newUser = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      password: hashedPassword,
      role: role ?? "STAFF",
      employee: {
        create: {
          employeeId: generatedEmpId,
          firstName,
          lastName,
          workEmail: email,
          jobTitle: jobTitle || null,
          departmentId: departmentId || null,
          employmentType: employmentType ?? "FULL_TIME",
          hireDate: new Date(),
        },
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          jobTitle: true,
          employeeStatus: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json({ user: newUser }, { status: 201 })
}
