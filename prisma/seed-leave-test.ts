/**
 * Seed leave test accounts:
 *   - 1 Employee:     ada.obi@datasciencenigeria.ai / Welcome@DSN1
 *   - Relief 1:       relief1.test@datasciencenigeria.ai / Welcome@DSN1
 *   - Relief 2:       relief2.test@datasciencenigeria.ai / Welcome@DSN1
 *   - Project Lead:   projectlead.test@datasciencenigeria.ai / Welcome@DSN1  (PROJECT_LEAD role)
 *
 * Run: npx tsx prisma/seed-leave-test.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding leave test accounts…")

  const pwd = await bcrypt.hash("Welcome@DSN1", 10)

  const dept = await prisma.department.findFirstOrThrow({ where: { name: "Technical Delivery (Service & Consulting)" } })

  const count = await prisma.employee.count()

  const accounts = [
    { email: "projectlead.test@datasciencenigeria.ai", name: "Sarah Lead", role: "PROJECT_LEAD", title: "Project Lead", gender: "FEMALE", num: count + 1 },
    { email: "relief1.test@datasciencenigeria.ai", name: "Emeka Relief", role: "STAFF", title: "Senior Engineer", gender: "MALE", num: count + 2 },
    { email: "relief2.test@datasciencenigeria.ai", name: "Ngozi Relief", role: "STAFF", title: "Frontend Developer", gender: "FEMALE", num: count + 3 },
    { email: "ada.obi@datasciencenigeria.ai", name: "Ada Obi", role: "STAFF", title: "Junior Engineer", gender: "FEMALE", num: count + 4 },
  ]

  const created: Record<string, any> = {}

  for (const acc of accounts) {
    const [fn, ...lnParts] = acc.name.split(" ")
    const ln = lnParts.join(" ")

    let u = await prisma.user.findUnique({ where: { email: acc.email } })
    if (!u) {
      u = await prisma.user.create({
        data: { name: acc.name, email: acc.email, password: pwd, role: acc.role as any }
      })
    } else {
      u = await prisma.user.update({ where: { id: u.id }, data: { role: acc.role as any } })
    }

    let emp = await prisma.employee.findFirst({ where: { userId: u.id } })
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          userId: u.id,
          employeeId: `DSN${String(acc.num).padStart(4, "0")}`,
          firstName: fn, lastName: ln,
          gender: acc.gender as any,
          jobTitle: acc.title,
          departmentId: dept.id,
          employmentType: "FULL_TIME",
          employeeStatus: "ACTIVE",
          hireDate: new Date("2023-01-01"),
        }
      })
    }
    created[acc.email] = emp
  }

  // Wire up reporting: Ada's project lead
  const ada = created["ada.obi@datasciencenigeria.ai"]
  const lead = created["projectlead.test@datasciencenigeria.ai"]

  if (ada && lead) {
    await prisma.employee.update({
      where: { id: ada.id },
      data: { projectLeadId: lead.id },
    })
    console.log(`✅ Ada's project lead: ${lead.id}`)
  }

  console.log("\n📧 Leave Test Accounts:")
  console.log("  Employee (applicant): ada.obi@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Relief Officer 1:     relief1.test@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Relief Officer 2:     relief2.test@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Project Lead:         projectlead.test@datasciencenigeria.ai / Welcome@DSN1")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
