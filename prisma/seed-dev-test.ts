/**
 * Dev / staging seed — DO NOT run in production.
 * Creates demo accounts and sample data on top of the reference seed.
 *
 * Requires seed.ts to have been run first (departments, leave types, etc. must exist).
 *
 * Demo accounts created:
 *   admin@dsn-hrms.com        /  Admin@DSN2024!   (ADMIN)
 *   projectlead@dsn-hrms.com     /  dsn-demo         (PROJECT_LEAD)
 *   staff@dsn-hrms.com        /  dsn-demo         (STAFF)
 *   hr@datasciencenigeria.ai  /  dsn-staff         (ADMIN)
 *   + 12 sample employees     /  dsn-staff
 *
 * Run: npm run db:seed:dev
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const hash = (pw: string) => bcrypt.hashSync(pw, 10)

async function main() {
  console.log("🧪 Seeding dev/demo data…")

  // ── Resolve departments created by seed.ts ────────────────────────────────────
  const [equalyzai, techDelivery, productDesign, adminFacility, finance, solutionDelivery, brandComms, bizDev] = await Promise.all([
    prisma.department.findFirstOrThrow({ where: { name: "EqualyzAI" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Technical Delivery (Service & Consulting)" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Product Design Team" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Administration & Facility" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Finance" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Solution Delivery (Training)" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Brand and Comms" } }),
    prisma.department.findFirstOrThrow({ where: { name: "Business Development" } }),
  ])

  // ── 3 quick-login demo accounts ───────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "DSN Admin", email: "admin@dsn-hrms.com", password: hash("Admin@DSN2024!"), role: "ADMIN", mustChangePassword: false },
  })
  await prisma.employee.upsert({
    where: { workEmail: "admin@dsn-hrms.com" },
    update: {},
    create: { userId: adminUser.id, employeeId: "DSN-D001", firstName: "DSN", lastName: "Admin", workEmail: "admin@dsn-hrms.com", jobTitle: "System Administrator", departmentId: adminFacility.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2023-01-01"), grossSalary: 800000 },
  })

  await prisma.user.upsert({
    where: { email: "projectlead@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Project Lead", email: "projectlead@dsn-hrms.com", password: hash("dsn-demo"), role: "PROJECT_LEAD", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "projectlead@dsn-hrms.com" },
    update: {},
    create: { userId: u.id, employeeId: "DSN-D002", firstName: "Demo", lastName: "Project Lead", workEmail: "projectlead@dsn-hrms.com", jobTitle: "Project Lead", departmentId: techDelivery.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2023-03-01"), grossSalary: 600000 },
  }))

  await prisma.user.upsert({
    where: { email: "staff@dsn-hrms.com" },
    update: { mustChangePassword: false },
    create: { name: "Demo Staff", email: "staff@dsn-hrms.com", password: hash("dsn-demo"), role: "STAFF", mustChangePassword: false },
  }).then(u => prisma.employee.upsert({
    where: { workEmail: "staff@dsn-hrms.com" },
    update: {},
    create: { userId: u.id, employeeId: "DSN-D003", firstName: "Demo", lastName: "Staff", workEmail: "staff@dsn-hrms.com", jobTitle: "Staff", departmentId: equalyzai.id, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-01-01"), grossSalary: 380000 },
  }))

  console.log("  ✓ Demo login accounts")

  // ── HR Admin ──────────────────────────────────────────────────────────────────
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@datasciencenigeria.ai" },
    update: { role: "ADMIN", mustChangePassword: false },
    create: { name: "Amina Bello", email: "hr@datasciencenigeria.ai", password: hash("dsn-staff"), role: "ADMIN", mustChangePassword: false },
  })
  const hrEmp = await prisma.employee.upsert({
    where: { workEmail: "hr@datasciencenigeria.ai" },
    update: {},
    create: { userId: hrUser.id, employeeId: "DSN0001", firstName: "Amina", lastName: "Bello", workEmail: "hr@datasciencenigeria.ai", phone: "+234 801 234 5678", gender: "FEMALE", jobTitle: "HR Manager", departmentId: adminFacility.id, employmentType: "FULL_TIME", category: "NON_TECHNICAL", grossSalary: 750000, employeeStatus: "ACTIVE", hireDate: new Date("2021-03-01") },
  })

  // ── 12 Sample Employees ───────────────────────────────────────────────────────
  const samples = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@datasciencenigeria.ai",   gender: "MALE",   title: "Senior Data Scientist",  dept: equalyzai.id,       type: "FULL_TIME", hire: "2022-05-10", cat: "TECHNICAL",     salary: 600000, role: "PROJECT_LEAD" },
    { name: "Fatima Musa",     email: "fatima.musa@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Analyst",            dept: equalyzai.id,       type: "FULL_TIME", hire: "2023-01-15", cat: "TECHNICAL",     salary: 420000, role: "STAFF" },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@datasciencenigeria.ai",     gender: "MALE",   title: "Software Engineer",       dept: techDelivery.id,    type: "FULL_TIME", hire: "2022-08-22", cat: "TECHNICAL",     salary: 480000, role: "PROJECT_LEAD" },
    { name: "Ngozi Eze",       email: "ngozi.eze@datasciencenigeria.ai",       gender: "FEMALE", title: "Product Designer",        dept: productDesign.id,   type: "FULL_TIME", hire: "2023-03-01", cat: "NON_TECHNICAL", salary: 550000, role: "PROJECT_LEAD" },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@datasciencenigeria.ai",   gender: "MALE",   title: "Programs Lead",           dept: solutionDelivery.id,type: "FULL_TIME", hire: "2021-11-05", cat: "NON_TECHNICAL", salary: 520000, role: "PROJECT_LEAD" },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.ai", gender: "FEMALE", title: "Brand & Comms Manager",   dept: brandComms.id,      type: "FULL_TIME", hire: "2022-02-14", cat: "NON_TECHNICAL", salary: 480000, role: "PROJECT_LEAD" },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@datasciencenigeria.ai",    gender: "MALE",   title: "Finance Officer",         dept: finance.id,         type: "FULL_TIME", hire: "2022-07-18", cat: "NON_TECHNICAL", salary: 400000, role: "STAFF" },
    { name: "Aisha Garba",     email: "aisha.garba@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Engineer",           dept: equalyzai.id,       type: "FULL_TIME", hire: "2023-06-01", cat: "TECHNICAL",     salary: 450000, role: "STAFF" },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@datasciencenigeria.ai",     gender: "MALE",   title: "Frontend Engineer",       dept: techDelivery.id,    type: "FULL_TIME", hire: "2023-09-11", cat: "TECHNICAL",     salary: 380000, role: "STAFF" },
    { name: "Zainab Hassan",   email: "zainab.hassan@datasciencenigeria.ai",   gender: "FEMALE", title: "Data Science Intern",     dept: equalyzai.id,       type: "INTERN",    hire: "2024-01-08", cat: "TECHNICAL",     salary: 120000, role: "STAFF" },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.ai", gender: "MALE",   title: "Backend Engineer",        dept: techDelivery.id,    type: "FULL_TIME", hire: "2022-04-20", cat: "TECHNICAL",     salary: 460000, role: "STAFF" },
    { name: "Grace Okeke",     email: "grace.okeke@datasciencenigeria.ai",     gender: "FEMALE", title: "Business Development Officer", dept: bizDev.id,     type: "CONTRACT",  hire: "2023-11-01", cat: "NON_TECHNICAL", salary: 350000, role: "STAFF" },
  ]

  const defaultPwd = hash("dsn-staff")
  const empRecords: Record<string, any> = {}

  const allExisting = await prisma.employee.findMany({ select: { employeeId: true } })
  const maxNum = allExisting.reduce((max, e) => {
    const n = parseInt(e.employeeId.replace(/\D/g, ""), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
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
      emp = await prisma.employee.update({ where: { id: existingEmp.id }, data: { category: s.cat as any, grossSalary: s.salary, jobTitle: s.title, departmentId: s.dept } })
    } else {
      counter++
      emp = await prisma.employee.upsert({
        where: { workEmail: s.email },
        update: { category: s.cat as any, grossSalary: s.salary },
        create: { userId: u.id, employeeId: `DSN-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: ln.join(" "), workEmail: s.email, gender: s.gender as any, jobTitle: s.title, departmentId: s.dept, employmentType: s.type as any, category: s.cat as any, grossSalary: s.salary, employeeStatus: "ACTIVE", hireDate: new Date(s.hire) },
      })
    }
    empRecords[s.email] = emp
  }
  console.log("  ✓ Sample employees")

  // ── Manager / Dept Lead relationships ─────────────────────────────────────────
  const emeka   = empRecords["emeka.okonkwo@datasciencenigeria.ai"]
  const chidi   = empRecords["chidi.nwosu@datasciencenigeria.ai"]
  const tunde   = empRecords["tunde.adeyemi@datasciencenigeria.ai"]
  const blessing = empRecords["blessing.okafor@datasciencenigeria.ai"]

  await Promise.all([
    prisma.employee.update({ where: { workEmail: "fatima.musa@datasciencenigeria.ai" },    data: { managerId: emeka.id,   projectLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "aisha.garba@datasciencenigeria.ai" },    data: { managerId: emeka.id,   projectLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "zainab.hassan@datasciencenigeria.ai" },  data: { managerId: emeka.id,   projectLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "kelechi.ibe@datasciencenigeria.ai" },    data: { managerId: chidi.id,   projectLeadId: chidi.id } }),
    prisma.employee.update({ where: { workEmail: "olumide.adewale@datasciencenigeria.ai" },data: { managerId: chidi.id,   projectLeadId: chidi.id } }),
    prisma.employee.update({ where: { workEmail: "grace.okeke@datasciencenigeria.ai" },    data: { managerId: blessing.id } }),
  ])
  await Promise.all([
    prisma.employee.updateMany({ where: { departmentId: equalyzai.id },       data: { projectLeadId: emeka.id } }),
    prisma.employee.updateMany({ where: { departmentId: techDelivery.id },    data: { projectLeadId: chidi.id } }),
    prisma.employee.updateMany({ where: { departmentId: solutionDelivery.id },data: { projectLeadId: tunde.id } }),
    prisma.employee.updateMany({ where: { departmentId: brandComms.id },      data: { projectLeadId: blessing.id } }),
    prisma.employee.updateMany({ where: { departmentId: adminFacility.id },   data: { projectLeadId: hrEmp.id } }),
  ])

  // ── Projects ──────────────────────────────────────────────────────────────────
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
      const emp = empRecords[email]
      if (!emp) continue
      const exists = await prisma.projectAssignment.findUnique({ where: { projectId_employeeId: { projectId: p.id, employeeId: emp.id } } })
      if (!exists) await prisma.projectAssignment.create({ data: { projectId: p.id, employeeId: emp.id, role: email === p.members[0] ? "LEAD" : "MEMBER" } })
    }
  }
  console.log("  ✓ Projects")

  // ── Job Postings ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.jobPosting.upsert({ where: { id: "job-ds-001" },     update: {}, create: { id: "job-ds-001",     title: "Senior Data Scientist",  departmentId: equalyzai.id,    description: "We are looking for a Senior Data Scientist to join our growing team.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-eng-001" },    update: {}, create: { id: "job-eng-001",    title: "Full Stack Engineer",    departmentId: techDelivery.id, description: "Join our technical delivery team to build the next generation of data platforms.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-intern-001" }, update: {}, create: { id: "job-intern-001", title: "Data Science Intern",    departmentId: equalyzai.id,    description: "Exciting internship opportunity for aspiring data scientists.", employmentType: "INTERN", status: "OPEN", openDate: new Date() } }),
  ])

  const appDefs = [
    { name: "Chukwuemeka Obi",  email: "c.obi@gmail.com",        jobId: "job-ds-001",     stage: "INTERVIEW" },
    { name: "Halima Abdullahi", email: "h.abdullahi@yahoo.com",  jobId: "job-ds-001",     stage: "ASSESSMENT" },
    { name: "Samuel Adeyinka",  email: "s.adeyinka@gmail.com",   jobId: "job-eng-001",    stage: "TECHNICAL" },
    { name: "Miriam Osei",      email: "m.osei@outlook.com",     jobId: "job-eng-001",    stage: "APPLICATION" },
    { name: "David Umeh",       email: "d.umeh@gmail.com",       jobId: "job-intern-001", stage: "OFFER" },
  ]
  for (const a of appDefs) {
    const exists = await prisma.jobApplication.findFirst({ where: { candidateEmail: a.email } })
    if (!exists) await prisma.jobApplication.create({ data: { jobPostingId: a.jobId, candidateName: a.name, candidateEmail: a.email, stage: a.stage as any, status: "ACTIVE" } })
  }
  console.log("  ✓ Job postings & applications")

  // ── Leave Balances ────────────────────────────────────────────────────────────
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  const sickLeave   = await prisma.leaveType.findFirst({ where: { name: "Sick Leave" } })
  const allEmps = [hrEmp, ...Object.values(empRecords)].filter(Boolean)
  for (const emp of allEmps) {
    if (annualLeave) {
      await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026, allocated: 21, used: 0, pending: 0 } })
    }
    if (sickLeave) {
      await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: sickLeave.id, year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: sickLeave.id, year: 2026, allocated: 14, used: 0, pending: 0 } })
    }
  }

  // Sample leave request
  if (annualLeave && emeka) {
    const existingLeave = await prisma.leaveRequest.findFirst({ where: { employeeId: emeka.id } })
    if (!existingLeave) {
      await prisma.leaveRequest.create({
        data: { employeeId: emeka.id, leaveTypeId: annualLeave.id, departmentId: emeka.departmentId, startDate: new Date("2026-04-14"), endDate: new Date("2026-04-18"), days: 5, reason: "Annual leave for family vacation", status: "PENDING" },
      })
    }
  }
  console.log("  ✓ Leave balances")

  // ── Payslips (Jan–Mar 2026) ───────────────────────────────────────────────────
  const forPay = [{ emp: hrEmp, salary: 750000 }, ...samples.map(s => ({ emp: empRecords[s.email], salary: s.salary }))].filter(e => e.emp)
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

  // ── Announcements ─────────────────────────────────────────────────────────────
  const annDefs = [
    { title: "Welcome to DSN HRMS", body: "We're excited to launch the new DSN HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more.", behavior: "POPUP" as const, targetRoles: [] as string[] },
    { title: "Q2 2026 Leave Reminder", body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026.", behavior: "NOTIFICATION_BAR" as const, targetRoles: ["STAFF"] as string[] },
    { title: "Performance Review Cycle Open", body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026.", behavior: "DASHBOARD_SCROLL" as const, targetRoles: [] as string[] },
    { title: "Public Holiday Notice — Workers' Day", body: "May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed.", behavior: "NOTIFICATION_BAR" as const, targetRoles: [] as string[] },
    { title: "New HR Policy: Remote Work Guidelines", body: "DSN has updated the Remote Work Policy effective May 1, 2026. Staff may work remotely up to 2 days per week with line manager approval.", behavior: "POPUP" as const, targetRoles: ["STAFF"] as string[] },
  ]
  for (const ann of annDefs) {
    const exists = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!exists) await prisma.announcement.create({ data: { ...ann, type: "TEXT", status: "PUBLISHED", sendEmail: false, publishedAt: new Date(), createdById: adminUser.id } })
  }
  console.log("  ✓ Announcements")

  console.log("\n✅ Dev seed complete!")
  console.log("\n🔑 Quick-login accounts:")
  console.log("   Admin:     admin@dsn-hrms.com        /  Admin@DSN2024!")
  console.log("   Project Lead: projectlead@dsn-hrms.com  /  dsn-demo")
  console.log("   Staff:     staff@dsn-hrms.com        /  dsn-demo")
  console.log("\n📧 Organisation accounts (password: dsn-staff):")
  console.log("   HR Admin:  hr@datasciencenigeria.ai")
  console.log("   Project Lead: emeka.okonkwo@datasciencenigeria.ai")
  console.log("   Staff:     fatima.musa@datasciencenigeria.ai")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
