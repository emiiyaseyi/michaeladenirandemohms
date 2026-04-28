/**
 * Production seed — safe to run in any environment.
 * Creates reference data the app needs to function:
 *   - Divisions & Departments
 *   - Leave Types
 *   - Public Holidays (Nigeria)
 *   - Active Performance Cycle
 *   - Super admin account (requires ADMIN_EMAIL + ADMIN_PASSWORD in .env)
 *
 * Run: npm run db:seed
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding reference data…")

  // ── Divisions ────────────────────────────────────────────────────────────────
  const techDiv    = await prisma.division.upsert({ where: { name: "Technology" },              update: {}, create: { name: "Technology",              description: "AI, technical delivery and infrastructure" } })
  const progsDiv   = await prisma.division.upsert({ where: { name: "Programs" },                update: {}, create: { name: "Programs",                description: "Training programs and community reach" } })
  const designDiv  = await prisma.division.upsert({ where: { name: "Design & Communications" }, update: {}, create: { name: "Design & Communications", description: "Product design, brand and creative" } })
  const opsDiv     = await prisma.division.upsert({ where: { name: "Operations" },              update: {}, create: { name: "Operations",              description: "Internal business and administrative functions" } })

  // ── Departments ──────────────────────────────────────────────────────────────
  await Promise.all([
    // Technology
    prisma.department.upsert({ where: { name: "EqualyzAI" },                          update: {}, create: { name: "EqualyzAI",                          description: "EqualyzAI product and platform",                    divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "AI for Public Health" },               update: {}, create: { name: "AI for Public Health",               description: "AI applications in public health",                  divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "AI/DPI" },                             update: {}, create: { name: "AI/DPI",                             description: "AI for Digital Public Infrastructure",              divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "Geospatial" },                         update: {}, create: { name: "Geospatial",                         description: "Geospatial data and mapping",                       divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "Technical Delivery (Service & Consulting)" }, update: {}, create: { name: "Technical Delivery (Service & Consulting)", description: "Technical consulting and service delivery", divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "System Support" },                     update: {}, create: { name: "System Support",                     description: "IT and systems support",                            divisionId: techDiv.id } }),
    // Programs
    prisma.department.upsert({ where: { name: "Solution Delivery (Training)" },       update: {}, create: { name: "Solution Delivery (Training)",       description: "Training program delivery",                         divisionId: progsDiv.id } }),
    prisma.department.upsert({ where: { name: "Edo Technical Team" },                 update: {}, create: { name: "Edo Technical Team",                 description: "Regional technical team — Edo State",               divisionId: progsDiv.id } }),
    prisma.department.upsert({ where: { name: "Northern Technical Team" },            update: {}, create: { name: "Northern Technical Team",            description: "Regional technical team — Northern Nigeria",        divisionId: progsDiv.id } }),
    prisma.department.upsert({ where: { name: "Community" },                          update: {}, create: { name: "Community",                          description: "Community engagement and growth",                   divisionId: progsDiv.id } }),
    // Design & Communications
    prisma.department.upsert({ where: { name: "Product Design Team" },                update: {}, create: { name: "Product Design Team",                description: "UI/UX and product design",                          divisionId: designDiv.id } }),
    prisma.department.upsert({ where: { name: "Brand and Comms" },                    update: {}, create: { name: "Brand and Comms",                    description: "Brand identity and communications",                  divisionId: designDiv.id } }),
    prisma.department.upsert({ where: { name: "Creative" },                           update: {}, create: { name: "Creative",                           description: "Creative content and media production",             divisionId: designDiv.id } }),
    // Operations
    prisma.department.upsert({ where: { name: "Business Development" },               update: {}, create: { name: "Business Development",               description: "Partnerships, growth and business development",     divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Administration & Facility" },          update: {}, create: { name: "Administration & Facility",          description: "Office administration and facility management",     divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Finance" },                            update: {}, create: { name: "Finance",                            description: "Finance and accounting",                            divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Legal" },                              update: {}, create: { name: "Legal",                              description: "Legal and compliance",                              divisionId: opsDiv.id } }),
  ])
  console.log("  ✓ Divisions & Departments")

  // ── Leave Types ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.leaveType.upsert({ where: { name: "Annual Leave" },    update: {}, create: { name: "Annual Leave",    description: "Standard annual leave",              defaultDays: 21, waitingDays: 7, excludeWeekends: true } }),
    prisma.leaveType.upsert({ where: { name: "Sick Leave" },      update: {}, create: { name: "Sick Leave",      description: "Medical leave",                      defaultDays: 14, requiresDoc: true, minDocDays: 2 } }),
    prisma.leaveType.upsert({ where: { name: "Maternity Leave" }, update: {}, create: { name: "Maternity Leave", description: "Maternity leave for new mothers",     defaultDays: 90, genderSpecific: "FEMALE", waitingDays: 14 } }),
    prisma.leaveType.upsert({ where: { name: "Paternity Leave" }, update: {}, create: { name: "Paternity Leave", description: "Paternity leave for new fathers",     defaultDays: 5,  genderSpecific: "MALE" } }),
    prisma.leaveType.upsert({ where: { name: "Casual Leave" },    update: {}, create: { name: "Casual Leave",    description: "Short casual leave",                 defaultDays: 5 } }),
    prisma.leaveType.upsert({ where: { name: "Work From Home" },  update: {}, create: { name: "Work From Home",  description: "Remote work days",                   defaultDays: 12 } }),
    prisma.leaveType.upsert({ where: { name: "Study Leave" },     update: {}, create: { name: "Study Leave",     description: "Educational leave",                  defaultDays: 5, waitingDays: 14 } }),
  ])
  console.log("  ✓ Leave Types")

  // ── Public Holidays (Nigeria 2026) ───────────────────────────────────────────
  const year = 2026
  const holidays = [
    { name: "New Year's Day",   date: new Date(`${year}-01-01`) },
    { name: "Workers Day",      date: new Date(`${year}-05-01`) },
    { name: "Democracy Day",    date: new Date(`${year}-06-12`) },
    { name: "Independence Day", date: new Date(`${year}-10-01`) },
    { name: "National Day",     date: new Date(`${year}-10-02`) },
    { name: "Christmas Day",    date: new Date(`${year}-12-25`) },
    { name: "Boxing Day",       date: new Date(`${year}-12-26`) },
    { name: "Good Friday",      date: new Date(`${year}-04-03`) },
    { name: "Easter Monday",    date: new Date(`${year}-04-06`) },
    { name: "Eid el-Fitr",      date: new Date(`${year}-03-30`) },
    { name: "Eid el-Kabir",     date: new Date(`${year}-06-06`) },
    { name: "Maulid un-Nabi",   date: new Date(`${year}-09-04`) },
  ]
  for (const h of holidays) {
    const exists = await prisma.publicHoliday.findFirst({ where: { name: h.name, year } })
    if (!exists) await prisma.publicHoliday.create({ data: { ...h, year } })
  }
  console.log("  ✓ Public Holidays")

  // ── Active Performance Cycle ──────────────────────────────────────────────────
  await prisma.performanceCycle.upsert({
    where: { id: "perf-2026-h1" },
    update: {},
    create: {
      id: "perf-2026-h1", name: "2026 H1 Performance Cycle",
      year: 2026, half: 1, isActive: true,
      startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
      kpiDeadline: new Date("2026-01-31"),
    },
  })
  console.log("  ✓ Performance Cycle")

  // ── Super Admin Account ───────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEFAULT_USER_PASSWORD || "Welcome@DSN1"
  const adminName     = process.env.ADMIN_NAME || "System Administrator"

  if (adminEmail) {
    const adminDept = await prisma.department.findFirst({ where: { name: "Administration & Facility" } })
    const hashed = await bcrypt.hash(adminPassword, 12)
    const adminUser = await prisma.user.upsert({
      where:  { email: adminEmail },
      update: {},
      create: { name: adminName, email: adminEmail, password: hashed, role: "ADMIN", mustChangePassword: false },
    })
    const [fn, ...rest] = adminName.split(" ")
    await prisma.employee.upsert({
      where:  { workEmail: adminEmail },
      update: {},
      create: {
        userId: adminUser.id, employeeId: "DSN-0001",
        firstName: fn, lastName: rest.join(" ") || "Admin",
        workEmail: adminEmail, jobTitle: "System Administrator",
        departmentId: adminDept?.id ?? null,
        employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date(),
      },
    })
    console.log(`  ✓ Admin account (${adminEmail})`)
  } else {
    console.log("  ℹ  Admin skipped — add ADMIN_EMAIL (+ ADMIN_PASSWORD, ADMIN_NAME) to .env")
  }

  console.log("\n✅ Seed complete.")
  console.log("   Dev/test data: npm run db:seed:dev")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
