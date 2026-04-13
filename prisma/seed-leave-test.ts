/**
 * Seed leave test accounts:
 *   - 1 Employee:     ada.obi@datasciencenigeria.ai / Welcome@DSN1
 *   - Relief 1:       relief1.test@datasciencenigeria.ai / Welcome@DSN1
 *   - Relief 2:       relief2.test@datasciencenigeria.ai / Welcome@DSN1
 *   - Team Lead:      teamlead.test@datasciencenigeria.ai / Welcome@DSN1  (DEPARTMENT_LEAD role)
 *   - Manager:        manager.test@datasciencenigeria.ai / Welcome@DSN1   (MANAGER role)
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

  // Find or create Engineering dept
  let dept = await prisma.department.findFirst({ where: { name: "Engineering" } })
  if (!dept) {
    dept = await prisma.department.create({ data: { name: "Engineering", description: "Software Development" } })
  }

  const count = await prisma.employee.count()

  const accounts = [
    { email: "manager.test@datasciencenigeria.ai", name: "David Manager", role: "MANAGER", title: "Engineering Manager", gender: "MALE", num: count + 1 },
    { email: "teamlead.test@datasciencenigeria.ai", name: "Sarah Lead", role: "DEPARTMENT_LEAD", title: "Tech Lead", gender: "FEMALE", num: count + 2 },
    { email: "relief1.test@datasciencenigeria.ai", name: "Emeka Relief", role: "STAFF", title: "Senior Engineer", gender: "MALE", num: count + 3 },
    { email: "relief2.test@datasciencenigeria.ai", name: "Ngozi Relief", role: "STAFF", title: "Frontend Developer", gender: "FEMALE", num: count + 4 },
    { email: "ada.obi@datasciencenigeria.ai", name: "Ada Obi", role: "STAFF", title: "Junior Engineer", gender: "FEMALE", num: count + 5 },
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

    let emp = await prisma.employee.findFirst({ where: { workEmail: acc.email } })
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          userId: u.id,
          employeeId: `DSN${String(acc.num).padStart(4, "0")}`,
          firstName: fn, lastName: ln,
          workEmail: acc.email,
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

  // Wire up reporting: Ada reports to Manager, Team Lead is dept lead
  const ada = created["ada.obi@datasciencenigeria.ai"]
  const manager = created["manager.test@datasciencenigeria.ai"]
  const lead = created["teamlead.test@datasciencenigeria.ai"]

  if (ada && manager && lead) {
    await prisma.employee.update({
      where: { id: ada.id },
      data: { managerId: manager.id, departmentLeadId: lead.id },
    })
    // Relief officers just need to be in the same dept
    console.log(`✅ Ada's manager: ${manager.id}, dept lead: ${lead.id}`)
  }

  console.log("\n📧 Leave Test Accounts:")
  console.log("  Employee (applicant): ada.obi@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Relief Officer 1:     relief1.test@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Relief Officer 2:     relief2.test@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Team Lead:            teamlead.test@datasciencenigeria.ai / Welcome@DSN1")
  console.log("  Manager:              manager.test@datasciencenigeria.ai / Welcome@DSN1")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
