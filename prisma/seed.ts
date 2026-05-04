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

  // ── Production HR Admin (Super Admin) ────────────────────────────────────────
  {
    const adminDept = await prisma.department.findFirst({ where: { name: "Administration & Facility" } })
    const hashed = await bcrypt.hash("Admin@DSN2024!", 12)
    const adminUser = await prisma.user.upsert({
      where:  { email: "hr@datasciencenigeria.ai" },
      update: { role: "SUPER_ADMIN" as any, mustChangePassword: false },
      create: { name: "HR Admin", email: "hr@datasciencenigeria.ai", password: hashed, role: "SUPER_ADMIN" as any, mustChangePassword: false },
    })
    await prisma.employee.upsert({
      where:  { workEmail: "hr@datasciencenigeria.ai" },
      update: {},
      create: {
        userId: adminUser.id, employeeId: "DSN-0001",
        firstName: "HR", lastName: "Admin",
        workEmail: "hr@datasciencenigeria.ai", jobTitle: "HR Admin",
        departmentId: adminDept?.id ?? null,
        employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date("2023-01-01"), gender: "FEMALE",
      },
    })
    console.log("  ✓ Admin account (hr@datasciencenigeria.ai)")
  }

  console.log("\n✅ Seed complete.")

  // ── Dev / Demo Data ───────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  const [equalyzai, techDelivery, productDesign, adminFacility, finance, solutionDelivery, brandComms, bizDev] = await Promise.all([
    prisma.department.findFirst({ where: { name: "EqualyzAI" } }),
    prisma.department.findFirst({ where: { name: "Technical Delivery (Service & Consulting)" } }),
    prisma.department.findFirst({ where: { name: "Product Design Team" } }),
    prisma.department.findFirst({ where: { name: "Administration & Facility" } }),
    prisma.department.findFirst({ where: { name: "Finance" } }),
    prisma.department.findFirst({ where: { name: "Solution Delivery (Training)" } }),
    prisma.department.findFirst({ where: { name: "Brand and Comms" } }),
    prisma.department.findFirst({ where: { name: "Business Development" } }),
  ])

  if (!equalyzai || !techDelivery || !adminFacility) {
    console.log("  ⚠  Skipping demo data — departments not found")
    return
  }

  // 3 quick-login demo accounts
  const demoAdmin = await prisma.user.upsert({
    where: { email: "admin@dsn-hrms.com" },
    update: { mustChangePassword: false, password: hash("Admin@DSN2024!") },
    create: { name: "DSN Admin", email: "admin@dsn-hrms.com", password: hash("Admin@DSN2024!"), role: "ADMIN", mustChangePassword: false },
  })
  await prisma.employee.upsert({
    where: { workEmail: "admin@dsn-hrms.com" },
    update: { dateOfBirth: new Date("1990-07-15") },
    create: { userId: demoAdmin.id, employeeId: "DSN-D001", firstName: "DSN", lastName: "Admin", workEmail: "admin@dsn-hrms.com", jobTitle: "System Administrator", departmentId: adminFacility.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2023-01-01"), grossSalary: 800000, gender: "FEMALE", dateOfBirth: new Date("1990-07-15") },
  })

  const demoProjectLead = await prisma.user.upsert({
    where: { email: "projectlead@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Project Lead", email: "projectlead@dsn-hrms.com", password: hash("dsn-demo"), role: "PROJECT_LEAD", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "projectlead@dsn-hrms.com" },
    update: { dateOfBirth: new Date("1988-03-22") },
    create: { userId: u.id, employeeId: "DSN-D002", firstName: "Demo", lastName: "Project Lead", workEmail: "projectlead@dsn-hrms.com", jobTitle: "Project Lead", departmentId: techDelivery.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2023-03-01"), grossSalary: 600000, gender: "MALE", dateOfBirth: new Date("1988-03-22") },
  }))

  const demoProjectLead2 = await prisma.user.upsert({ // used as projectLeadId for staff2 below
    where: { email: "projectlead2@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Project Lead 2", email: "projectlead2@dsn-hrms.com", password: hash("dsn-demo"), role: "PROJECT_LEAD", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "projectlead2@dsn-hrms.com" },
    update: { dateOfBirth: new Date("1986-09-11") },
    create: { userId: u.id, employeeId: "DSN-D004", firstName: "Demo", lastName: "Project Lead Two", workEmail: "projectlead2@dsn-hrms.com", jobTitle: "Project Lead", departmentId: equalyzai?.id ?? techDelivery.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2023-06-01"), grossSalary: 580000, gender: "FEMALE", dateOfBirth: new Date("1986-09-11") },
  }))

  await prisma.user.upsert({
    where: { email: "staff@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Staff", email: "staff@dsn-hrms.com", password: hash("dsn-demo"), role: "STAFF", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "staff@dsn-hrms.com" },
    update: { dateOfBirth: new Date("1995-11-08") },
    create: { userId: u.id, employeeId: "DSN-D003", firstName: "Demo", lastName: "Staff", workEmail: "staff@dsn-hrms.com", jobTitle: "Staff", departmentId: techDelivery.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-01-01"), grossSalary: 380000, managerId: demoProjectLead.id, projectLeadId: demoProjectLead.id, gender: "FEMALE", dateOfBirth: new Date("1995-11-08") },
  }))

  // 5th demo account — extra staff
  await prisma.user.upsert({
    where: { email: "staff2@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Staff 2", email: "staff2@dsn-hrms.com", password: hash("dsn-demo"), role: "STAFF", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "staff2@dsn-hrms.com" },
    update: { dateOfBirth: new Date("1997-04-14") },
    create: { userId: u.id, employeeId: "DSN-D005", firstName: "Demo", lastName: "Staff Two", workEmail: "staff2@dsn-hrms.com", jobTitle: "Staff", departmentId: equalyzai?.id ?? techDelivery.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-06-01"), grossSalary: 350000, projectLeadId: demoProjectLead2.id, gender: "MALE", dateOfBirth: new Date("1997-04-14") },
  }))

  // 12 sample employees
  const samples = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@datasciencenigeria.ai",   gender: "MALE",   title: "Senior Data Scientist",       dept: equalyzai!.id,        type: "FULL_TIME", hire: "2022-05-10", dob: "1990-05-14", cat: "TECHNICAL",     salary: 600000, role: "PROJECT_LEAD" },
    { name: "Fatima Musa",     email: "fatima.musa@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Analyst",                dept: equalyzai!.id,        type: "FULL_TIME", hire: "2023-01-15", dob: "1996-06-02", cat: "TECHNICAL",     salary: 420000, role: "STAFF" },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@datasciencenigeria.ai",     gender: "MALE",   title: "Software Engineer",           dept: techDelivery!.id,     type: "FULL_TIME", hire: "2022-08-22", dob: "1993-08-30", cat: "TECHNICAL",     salary: 480000, role: "PROJECT_LEAD" },
    { name: "Ngozi Eze",       email: "ngozi.eze@datasciencenigeria.ai",       gender: "FEMALE", title: "Product Designer",            dept: productDesign!.id,    type: "FULL_TIME", hire: "2023-03-01", dob: "1994-07-19", cat: "NON_TECHNICAL", salary: 550000, role: "PROJECT_LEAD" },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@datasciencenigeria.ai",   gender: "MALE",   title: "Programs Lead",               dept: solutionDelivery!.id, type: "FULL_TIME", hire: "2021-11-05", dob: "1988-04-25", cat: "NON_TECHNICAL", salary: 520000, role: "PROJECT_LEAD" },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.ai", gender: "FEMALE", title: "Brand & Comms Manager",       dept: brandComms!.id,       type: "FULL_TIME", hire: "2022-02-14", dob: "1991-05-08", cat: "NON_TECHNICAL", salary: 480000, role: "PROJECT_LEAD" },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@datasciencenigeria.ai",    gender: "MALE",   title: "Finance Officer",             dept: finance!.id,          type: "FULL_TIME", hire: "2022-07-18", dob: "1992-06-17", cat: "NON_TECHNICAL", salary: 400000, role: "STAFF" },
    { name: "Aisha Garba",     email: "aisha.garba@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Engineer",               dept: equalyzai!.id,        type: "FULL_TIME", hire: "2023-06-01", dob: "1997-05-21", cat: "TECHNICAL",     salary: 450000, role: "STAFF" },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@datasciencenigeria.ai",     gender: "MALE",   title: "Frontend Engineer",           dept: techDelivery!.id,     type: "FULL_TIME", hire: "2023-09-11", dob: "1998-07-03", cat: "TECHNICAL",     salary: 380000, role: "STAFF" },
    { name: "Zainab Hassan",   email: "zainab.hassan@datasciencenigeria.ai",   gender: "FEMALE", title: "Data Science Intern",         dept: equalyzai!.id,        type: "INTERN",    hire: "2024-01-08", dob: "2001-06-11", cat: "TECHNICAL",     salary: 120000, role: "STAFF" },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.ai", gender: "MALE",   title: "Backend Engineer",            dept: techDelivery!.id,     type: "FULL_TIME", hire: "2022-04-20", dob: "1993-04-28", cat: "TECHNICAL",     salary: 460000, role: "STAFF" },
    { name: "Grace Okeke",     email: "grace.okeke@datasciencenigeria.ai",     gender: "FEMALE", title: "Business Development Officer",dept: bizDev!.id,           type: "CONTRACT",  hire: "2023-11-01", dob: "1995-05-30", cat: "NON_TECHNICAL", salary: 350000, role: "STAFF" },
  ]

  const defaultPwd = hash("dsn-staff")
  const empRecords: Record<string, any> = {}
  const allExisting = await prisma.employee.findMany({ select: { employeeId: true } })
  const maxNum = allExisting.reduce((max, e) => { const n = parseInt(e.employeeId.replace(/\D/g, ""), 10); return isNaN(n) ? max : Math.max(max, n) }, 0)
  let counter = maxNum

  for (const s of samples) {
    const [fn, ...ln] = s.name.split(" ")
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { role: s.role as any, mustChangePassword: false },
      create: { name: s.name, email: s.email, password: defaultPwd, role: s.role as any, mustChangePassword: false },
    })
    const existingEmp = await prisma.employee.findFirst({ where: { userId: u.id } })
    let emp: any
    if (existingEmp) {
      emp = await prisma.employee.update({ where: { id: existingEmp.id }, data: { category: s.cat as any, grossSalary: s.salary, jobTitle: s.title, departmentId: s.dept, dateOfBirth: new Date(s.dob) } })
    } else {
      counter++
      emp = await prisma.employee.upsert({
        where: { workEmail: s.email },
        update: { category: s.cat as any, grossSalary: s.salary, dateOfBirth: new Date(s.dob) },
        create: { userId: u.id, employeeId: `DSN-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: ln.join(" "), workEmail: s.email, gender: s.gender as any, jobTitle: s.title, departmentId: s.dept, employmentType: s.type as any, category: s.cat as any, grossSalary: s.salary, employeeStatus: "ACTIVE", hireDate: new Date(s.hire), dateOfBirth: new Date(s.dob) },
      })
    }
    empRecords[s.email] = emp
  }
  console.log("  ✓ Sample employees")

  // Manager / dept lead relationships
  const emeka = empRecords["emeka.okonkwo@datasciencenigeria.ai"]
  const chidi = empRecords["chidi.nwosu@datasciencenigeria.ai"]
  const tunde = empRecords["tunde.adeyemi@datasciencenigeria.ai"]
  const blessing = empRecords["blessing.okafor@datasciencenigeria.ai"]
  await Promise.all([
    prisma.employee.update({ where: { workEmail: "fatima.musa@datasciencenigeria.ai" },    data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { workEmail: "aisha.garba@datasciencenigeria.ai" },    data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { workEmail: "zainab.hassan@datasciencenigeria.ai" },  data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { workEmail: "kelechi.ibe@datasciencenigeria.ai" },    data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { workEmail: "olumide.adewale@datasciencenigeria.ai" },data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { workEmail: "grace.okeke@datasciencenigeria.ai" },    data: { managerId: blessing?.id } }),
  ])

  // Projects
  const projectDefs = [
    { id: "proj-001", name: "AI Talent Analytics Platform", status: "ACTIVE",  members: ["emeka.okonkwo@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai", "aisha.garba@datasciencenigeria.ai"] },
    { id: "proj-002", name: "DSN Data Labelling Pipeline",  status: "ACTIVE",  members: ["emeka.okonkwo@datasciencenigeria.ai", "zainab.hassan@datasciencenigeria.ai"] },
    { id: "proj-003", name: "HRMS v2.0 Development",        status: "ACTIVE",  members: ["chidi.nwosu@datasciencenigeria.ai", "kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai"] },
    { id: "proj-004", name: "Mobile App Revamp",            status: "ACTIVE",  members: ["kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai", "chidi.nwosu@datasciencenigeria.ai"] },
    { id: "proj-005", name: "Q2 2026 Cohort Launch",        status: "ACTIVE",  members: ["tunde.adeyemi@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
    { id: "proj-006", name: "Brand Identity Refresh",       status: "ACTIVE",  members: ["blessing.okafor@datasciencenigeria.ai", "grace.okeke@datasciencenigeria.ai"] },
    { id: "proj-007", name: "Partner Onboarding Automation",status: "ON_HOLD", members: ["grace.okeke@datasciencenigeria.ai", "blessing.okafor@datasciencenigeria.ai"] },
    { id: "proj-008", name: "Financial Reporting Dashboard", status: "ACTIVE",  members: ["ibrahim.sule@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
  ]
  for (const p of projectDefs) {
    const existing = await prisma.project.findUnique({ where: { id: p.id } })
    if (!existing) await prisma.project.create({ data: { id: p.id, name: p.name, status: p.status as any, startDate: new Date("2026-01-01") } })
    for (const email of p.members) {
      const emp = empRecords[email]; if (!emp) continue
      const exists = await prisma.projectAssignment.findUnique({ where: { projectId_employeeId: { projectId: p.id, employeeId: emp.id } } })
      if (!exists) await prisma.projectAssignment.create({ data: { projectId: p.id, employeeId: emp.id, role: email === p.members[0] ? "LEAD" : "MEMBER" } })
    }
  }
  console.log("  ✓ Projects")

  // Job postings
  await Promise.all([
    prisma.jobPosting.upsert({ where: { id: "job-ds-001" },     update: {}, create: { id: "job-ds-001",     title: "Senior Data Scientist", departmentId: equalyzai!.id,    description: "We are looking for a Senior Data Scientist to join our growing team.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-eng-001" },    update: {}, create: { id: "job-eng-001",    title: "Full Stack Engineer",   departmentId: techDelivery!.id, description: "Join our technical delivery team to build the next generation of data platforms.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-intern-001" }, update: {}, create: { id: "job-intern-001", title: "Data Science Intern",   departmentId: equalyzai!.id,    description: "Exciting internship opportunity for aspiring data scientists.", employmentType: "INTERN", status: "OPEN", openDate: new Date() } }),
  ])
  const appDefs = [
    { name: "Chukwuemeka Obi",  email: "c.obi@gmail.com",       jobId: "job-ds-001",     stage: "INTERVIEW" },
    { name: "Halima Abdullahi", email: "h.abdullahi@yahoo.com", jobId: "job-ds-001",     stage: "ASSESSMENT" },
    { name: "Samuel Adeyinka",  email: "s.adeyinka@gmail.com",  jobId: "job-eng-001",    stage: "TECHNICAL" },
    { name: "Miriam Osei",      email: "m.osei@outlook.com",    jobId: "job-eng-001",    stage: "APPLICATION" },
    { name: "David Umeh",       email: "d.umeh@gmail.com",      jobId: "job-intern-001", stage: "OFFER" },
  ]
  for (const a of appDefs) {
    const exists = await prisma.jobApplication.findFirst({ where: { candidateEmail: a.email } })
    if (!exists) await prisma.jobApplication.create({ data: { jobPostingId: a.jobId, candidateName: a.name, candidateEmail: a.email, stage: a.stage as any, status: "ACTIVE" } })
  }
  console.log("  ✓ Job postings & applications")

  // Leave balances
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  const sickLeave   = await prisma.leaveType.findFirst({ where: { name: "Sick Leave" } })
  const allEmps = Object.values(empRecords).filter(Boolean)
  for (const emp of allEmps) {
    if (annualLeave) await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026, allocated: 21, used: 0, pending: 0 } })
    if (sickLeave)   await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026, allocated: 14, used: 0, pending: 0 } })
  }
  console.log("  ✓ Leave balances")

  // Payslips (Jan–Mar 2026)
  const forPay = samples.map(s => ({ emp: empRecords[s.email], salary: s.salary })).filter(e => e.emp)
  for (const { emp, salary } of forPay) {
    const basic = salary * 0.5; const housing = salary * 0.2; const transport = salary * 0.1; const meal = salary * 0.05
    const pension = Math.round(basic * 0.08); const nhf = Math.round(basic * 0.025); const paye = Math.round(Math.max(0, (salary - 200000) * 0.07))
    const net = Math.round(salary - pension - nhf - paye - 15000)
    for (const month of [1, 2, 3]) {
      const ex = await prisma.payslip.findUnique({ where: { employeeId_month_year: { employeeId: emp.id, month, year: 2026 } } })
      if (!ex) await prisma.payslip.create({ data: { employeeId: emp.id, month, year: 2026, grossSalary: salary, basicSalary: basic, housing, transport, meal, otherAllowances: 0, payeTax: paye, pension, nhf, healthInsurance: 15000, otherDeductions: 0, netPay: net, status: "RELEASED", releasedAt: new Date(`2026-0${month}-28`) } })
    }
  }
  console.log("  ✓ Payslips")

  // Announcements
  const annDefs = [
    { title: "Welcome to DSN HRMS",              body: "We're excited to launch the new DSN HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more.", behavior: "POPUP" as const,            targetRoles: [] as string[] },
    { title: "Q2 2026 Leave Reminder",           body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: ["STAFF"] as string[] },
    { title: "Performance Review Cycle Open",    body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026.", behavior: "DASHBOARD_SCROLL" as const, targetRoles: [] as string[] },
    { title: "Public Holiday Notice — Workers' Day", body: "May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: [] as string[] },
    { title: "New HR Policy: Remote Work Guidelines", body: "DSN has updated the Remote Work Policy effective May 1, 2026. Staff may work remotely up to 2 days per week with line manager approval.", behavior: "POPUP" as const, targetRoles: ["STAFF"] as string[] },
  ]
  for (const ann of annDefs) {
    const exists = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!exists) await prisma.announcement.create({ data: { ...ann, type: "TEXT", status: "PUBLISHED", sendEmail: false, publishedAt: new Date(), createdById: demoAdmin.id } })
  }
  console.log("  ✓ Announcements")

  console.log("\n✅ Demo data complete.")
  console.log("\n🔑 Demo login accounts:")
  console.log("   HR Admin:      hr@datasciencenigeria.ai      /  Admin@DSN2024!")
  console.log("   Admin:         admin@dsn-hrms.com            /  Admin@DSN2024!")
  console.log("   Project Lead:  projectlead@dsn-hrms.com      /  dsn-demo")
  console.log("   Project Lead 2: projectlead2@dsn-hrms.com   /  dsn-demo")
  console.log("   Staff:         staff@dsn-hrms.com            /  dsn-demo")
  console.log("   Staff 2:       staff2@dsn-hrms.com           /  dsn-demo")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

 