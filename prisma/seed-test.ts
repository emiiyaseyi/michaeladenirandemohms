/**
 * Test / dev seed — DO NOT run in production.
 * Requires seed.ts to have been run first (departments, leave types, etc. must exist).
 *
 * Demo login accounts:
 *   hr@datasciencenigeria.ai     /  dsn-staff   (SUPER_ADMIN)
 *   staff1@dsn-hrms.com          /  dsn-demo    (STAFF)
 *   staff2@dsn-hrms.com          /  dsn-demo    (STAFF)
 *   staff3@dsn-hrms.com          /  dsn-demo    (STAFF)
 *   staff4@dsn-hrms.com          /  dsn-demo    (STAFF)
 *   + 12 sample employees        /  dsn-staff
 *
 * Leave-flow test accounts (password: Welcome@DSN1):
 *   projectlead.test@datasciencenigeria.ai  (STAFF + hr-admin role)
 *   relief1.test@datasciencenigeria.ai      (STAFF)
 *   relief2.test@datasciencenigeria.ai      (STAFF)
 *   ada.obi@datasciencenigeria.ai           (STAFF, reports to projectlead.test)
 *
 * Run: npm run db:seed:test
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const hash = (pw: string) => bcrypt.hashSync(pw, 10)

async function main() {
  console.log("🧪 Seeding test/demo data…")

  // ── Resolve departments ───────────────────────────────────────────────────────
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

  // ── Resolve admin roles ───────────────────────────────────────────────────────
  const hrAdminRole = await prisma.adminRole.findUnique({ where: { slug: "hr-admin" } })

  // ── HR Admin (SUPER_ADMIN) — don't override role set by seed.ts ───────────────
  const hrUser = await prisma.user.upsert({
    where:  { email: "hr@datasciencenigeria.ai" },
    update: { mustChangePassword: false },
    create: { name: "Amina Bello", email: "hr@datasciencenigeria.ai", password: hash("dsn-staff"), role: "SUPER_ADMIN", mustChangePassword: false },
  })
  const hrEmp = await prisma.employee.upsert({
    where:  { userId: hrUser.id },
    update: {},
    create: { userId: hrUser.id, employeeId: "DSN0001", firstName: "Amina", lastName: "Bello", phone: "+234 801 234 5678", gender: "FEMALE", jobTitle: "HR Manager", departmentId: adminFacility.id, employmentType: "FULL_TIME", category: "NON_TECHNICAL", grossSalary: 750000, employeeStatus: "ACTIVE", hireDate: new Date("2021-03-01") },
  })

  // ── Quick-login demo staff accounts ──────────────────────────────────────────
  const demoStaffs = [
    { email: "staff1@dsn-hrms.com", name: "Demo Staff One",   empId: "DSN-D001", fn: "Demo", ln: "Staff One",   title: "Staff",             deptId: adminFacility.id,  gender: "FEMALE", dob: "1992-03-10", salary: 380000 },
    { email: "staff2@dsn-hrms.com", name: "Demo Staff Two",   empId: "DSN-D002", fn: "Demo", ln: "Staff Two",   title: "Software Engineer", deptId: techDelivery.id,   gender: "MALE",   dob: "1994-07-22", salary: 420000 },
    { email: "staff3@dsn-hrms.com", name: "Demo Staff Three", empId: "DSN-D003", fn: "Demo", ln: "Staff Three", title: "Data Analyst",       deptId: equalyzai.id,      gender: "FEMALE", dob: "1996-01-15", salary: 360000 },
    { email: "staff4@dsn-hrms.com", name: "Demo Staff Four",  empId: "DSN-D004", fn: "Demo", ln: "Staff Four",  title: "Finance Officer",    deptId: finance.id,        gender: "MALE",   dob: "1991-09-05", salary: 390000 },
  ]
  for (const s of demoStaffs) {
    const u = await prisma.user.upsert({
      where:  { email: s.email },
      update: { mustChangePassword: false, password: hash("dsn-demo") },
      create: { name: s.name, email: s.email, password: hash("dsn-demo"), role: "STAFF", mustChangePassword: false },
    })
    await prisma.employee.upsert({
      where:  { userId: u.id },
      update: { dateOfBirth: new Date(s.dob) },
      create: { userId: u.id, employeeId: s.empId, firstName: s.fn, lastName: s.ln, jobTitle: s.title, departmentId: s.deptId, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-01-01"), grossSalary: s.salary, gender: s.gender as any, dateOfBirth: new Date(s.dob) },
    })
  }
  console.log("  ✓ Demo login accounts")

  // ── 12 Sample Employees ───────────────────────────────────────────────────────
  const samples = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@datasciencenigeria.ai",   gender: "MALE",   title: "Senior Data Scientist",        dept: equalyzai.id,        type: "FULL_TIME", hire: "2022-05-10", dob: "1990-05-14", cat: "TECHNICAL",     salary: 600000, elevate: true },
    { name: "Fatima Musa",     email: "fatima.musa@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Analyst",                 dept: equalyzai.id,        type: "FULL_TIME", hire: "2023-01-15", dob: "1996-06-02", cat: "TECHNICAL",     salary: 420000, elevate: false },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@datasciencenigeria.ai",     gender: "MALE",   title: "Software Engineer",            dept: techDelivery.id,     type: "FULL_TIME", hire: "2022-08-22", dob: "1993-08-30", cat: "TECHNICAL",     salary: 480000, elevate: true },
    { name: "Ngozi Eze",       email: "ngozi.eze@datasciencenigeria.ai",       gender: "FEMALE", title: "Product Designer",             dept: productDesign.id,    type: "FULL_TIME", hire: "2023-03-01", dob: "1994-07-19", cat: "NON_TECHNICAL", salary: 550000, elevate: true },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@datasciencenigeria.ai",   gender: "MALE",   title: "Programs Lead",                dept: solutionDelivery.id, type: "FULL_TIME", hire: "2021-11-05", dob: "1988-04-25", cat: "NON_TECHNICAL", salary: 520000, elevate: true },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.ai", gender: "FEMALE", title: "Brand & Comms Manager",        dept: brandComms.id,       type: "FULL_TIME", hire: "2022-02-14", dob: "1991-05-08", cat: "NON_TECHNICAL", salary: 480000, elevate: true },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@datasciencenigeria.ai",    gender: "MALE",   title: "Finance Officer",              dept: finance.id,          type: "FULL_TIME", hire: "2022-07-18", dob: "1992-06-17", cat: "NON_TECHNICAL", salary: 400000, elevate: false },
    { name: "Aisha Garba",     email: "aisha.garba@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Engineer",                dept: equalyzai.id,        type: "FULL_TIME", hire: "2023-06-01", dob: "1997-05-21", cat: "TECHNICAL",     salary: 450000, elevate: false },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@datasciencenigeria.ai",     gender: "MALE",   title: "Frontend Engineer",            dept: techDelivery.id,     type: "FULL_TIME", hire: "2023-09-11", dob: "1998-07-03", cat: "TECHNICAL",     salary: 380000, elevate: false },
    { name: "Zainab Hassan",   email: "zainab.hassan@datasciencenigeria.ai",   gender: "FEMALE", title: "Data Science Intern",          dept: equalyzai.id,        type: "INTERN",    hire: "2024-01-08", dob: "2001-06-11", cat: "TECHNICAL",     salary: 120000, elevate: false },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.ai", gender: "MALE",   title: "Backend Engineer",             dept: techDelivery.id,     type: "FULL_TIME", hire: "2022-04-20", dob: "1993-04-28", cat: "TECHNICAL",     salary: 460000, elevate: false },
    { name: "Grace Okeke",     email: "grace.okeke@datasciencenigeria.ai",     gender: "FEMALE", title: "Business Development Officer",  dept: bizDev.id,           type: "CONTRACT",  hire: "2023-11-01", dob: "1995-05-30", cat: "NON_TECHNICAL", salary: 350000, elevate: false },
  ]

  const defaultPwd = hash("dsn-staff")
  const empRecords: Record<string, any> = {}
  const allExisting = await prisma.employee.findMany({ select: { employeeId: true } })
  const maxNum = allExisting.reduce((max, e) => { const n = parseInt(e.employeeId.replace(/\D/g, ""), 10); return isNaN(n) ? max : Math.max(max, n) }, 0)
  let counter = maxNum

  for (const s of samples) {
    const [fn, ...ln] = s.name.split(" ")
    const u = await prisma.user.upsert({
      where:  { email: s.email },
      update: { role: "STAFF", mustChangePassword: false },
      create: { name: s.name, email: s.email, password: defaultPwd, role: "STAFF", mustChangePassword: false },
    })
    const existingEmp = await prisma.employee.findFirst({ where: { userId: u.id } })
    let emp: any
    if (existingEmp) {
      emp = await prisma.employee.update({ where: { id: existingEmp.id }, data: { category: s.cat as any, grossSalary: s.salary, jobTitle: s.title, departmentId: s.dept, dateOfBirth: new Date(s.dob) } })
    } else {
      counter++
      emp = await prisma.employee.upsert({
        where:  { userId: u.id },
        update: { category: s.cat as any, grossSalary: s.salary, dateOfBirth: new Date(s.dob) },
        create: { userId: u.id, employeeId: `DSN-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: ln.join(" "), gender: s.gender as any, jobTitle: s.title, departmentId: s.dept, employmentType: s.type as any, category: s.cat as any, grossSalary: s.salary, employeeStatus: "ACTIVE", hireDate: new Date(s.hire), dateOfBirth: new Date(s.dob) },
      })
    }
    empRecords[s.email] = emp
  }
  console.log("  ✓ Sample employees")

  // Elevate sample employees to hr-admin
  if (hrAdminRole) {
    for (const s of samples.filter(s => s.elevate)) {
      const u = await prisma.user.findUnique({ where: { email: s.email }, select: { id: true } })
      if (u) {
        await prisma.userAdminRole.upsert({
          where:  { userId_adminRoleId: { userId: u.id, adminRoleId: hrAdminRole.id } },
          update: {}, create: { userId: u.id, adminRoleId: hrAdminRole.id },
        })
      }
    }
  }

  // ── Manager / project-lead relationships ──────────────────────────────────────
  const emeka    = empRecords["emeka.okonkwo@datasciencenigeria.ai"]
  const chidi    = empRecords["chidi.nwosu@datasciencenigeria.ai"]
  const tunde    = empRecords["tunde.adeyemi@datasciencenigeria.ai"]
  const blessing = empRecords["blessing.okafor@datasciencenigeria.ai"]

  await Promise.all([
    prisma.employee.update({ where: { id: empRecords["fatima.musa@datasciencenigeria.ai"]?.id },     data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["aisha.garba@datasciencenigeria.ai"]?.id },     data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["zainab.hassan@datasciencenigeria.ai"]?.id },   data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["kelechi.ibe@datasciencenigeria.ai"]?.id },     data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["olumide.adewale@datasciencenigeria.ai"]?.id }, data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["grace.okeke@datasciencenigeria.ai"]?.id },     data: { managerId: blessing?.id } }),
  ])
  await Promise.all([
    prisma.employee.updateMany({ where: { departmentId: equalyzai.id },        data: { projectLeadId: emeka?.id } }),
    prisma.employee.updateMany({ where: { departmentId: techDelivery.id },     data: { projectLeadId: chidi?.id } }),
    prisma.employee.updateMany({ where: { departmentId: solutionDelivery.id }, data: { projectLeadId: tunde?.id } }),
    prisma.employee.updateMany({ where: { departmentId: brandComms.id },       data: { projectLeadId: blessing?.id } }),
    prisma.employee.updateMany({ where: { departmentId: adminFacility.id },    data: { projectLeadId: hrEmp.id } }),
  ])

  // ── Projects ──────────────────────────────────────────────────────────────────
  const projectDefs = [
    { id: "proj-001", name: "AI Talent Analytics Platform",  status: "ACTIVE",  members: ["emeka.okonkwo@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai", "aisha.garba@datasciencenigeria.ai"] },
    { id: "proj-002", name: "DSN Data Labelling Pipeline",   status: "ACTIVE",  members: ["emeka.okonkwo@datasciencenigeria.ai", "zainab.hassan@datasciencenigeria.ai"] },
    { id: "proj-003", name: "HRMS v2.0 Development",         status: "ACTIVE",  members: ["chidi.nwosu@datasciencenigeria.ai", "kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai"] },
    { id: "proj-004", name: "Mobile App Revamp",             status: "ACTIVE",  members: ["kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai", "chidi.nwosu@datasciencenigeria.ai"] },
    { id: "proj-005", name: "Q2 2026 Cohort Launch",         status: "ACTIVE",  members: ["tunde.adeyemi@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
    { id: "proj-006", name: "Brand Identity Refresh",        status: "ACTIVE",  members: ["blessing.okafor@datasciencenigeria.ai", "grace.okeke@datasciencenigeria.ai"] },
    { id: "proj-007", name: "Partner Onboarding Automation", status: "ON_HOLD", members: ["grace.okeke@datasciencenigeria.ai", "blessing.okafor@datasciencenigeria.ai"] },
    { id: "proj-008", name: "Financial Reporting Dashboard",  status: "ACTIVE",  members: ["ibrahim.sule@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
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

  // ── Job Postings & Applications ───────────────────────────────────────────────
  await Promise.all([
    prisma.jobPosting.upsert({ where: { id: "job-ds-001" },     update: {}, create: { id: "job-ds-001",     title: "Senior Data Scientist", departmentId: equalyzai.id,    description: "We are looking for a Senior Data Scientist to join our growing team.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-eng-001" },    update: {}, create: { id: "job-eng-001",    title: "Full Stack Engineer",   departmentId: techDelivery.id, description: "Join our technical delivery team to build the next generation of data platforms.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-intern-001" }, update: {}, create: { id: "job-intern-001", title: "Data Science Intern",   departmentId: equalyzai.id,    description: "Exciting internship opportunity for aspiring data scientists.", employmentType: "INTERN", status: "OPEN", openDate: new Date() } }),
  ])
  for (const a of [
    { name: "Chukwuemeka Obi",  email: "c.obi@gmail.com",       jobId: "job-ds-001",     stage: "INTERVIEW" },
    { name: "Halima Abdullahi", email: "h.abdullahi@yahoo.com", jobId: "job-ds-001",     stage: "ASSESSMENT" },
    { name: "Samuel Adeyinka",  email: "s.adeyinka@gmail.com",  jobId: "job-eng-001",    stage: "TECHNICAL" },
    { name: "Miriam Osei",      email: "m.osei@outlook.com",    jobId: "job-eng-001",    stage: "APPLICATION" },
    { name: "David Umeh",       email: "d.umeh@gmail.com",      jobId: "job-intern-001", stage: "OFFER" },
  ]) {
    const exists = await prisma.jobApplication.findFirst({ where: { candidateEmail: a.email } })
    if (!exists) await prisma.jobApplication.create({ data: { jobPostingId: a.jobId, candidateName: a.name, candidateEmail: a.email, stage: a.stage as any, status: "ACTIVE" } })
  }
  console.log("  ✓ Job postings & applications")

  // ── Leave Test Accounts ───────────────────────────────────────────────────────
  const leavePwd = hash("Welcome@DSN1")
  const leaveAccounts = [
    { email: "projectlead.test@datasciencenigeria.ai", name: "Sarah Lead",   title: "Project Lead",       gender: "FEMALE", elevate: true },
    { email: "relief1.test@datasciencenigeria.ai",     name: "Emeka Relief", title: "Senior Engineer",    gender: "MALE",   elevate: false },
    { email: "relief2.test@datasciencenigeria.ai",     name: "Ngozi Relief", title: "Frontend Developer", gender: "FEMALE", elevate: false },
    { email: "ada.obi@datasciencenigeria.ai",          name: "Ada Obi",      title: "Junior Engineer",    gender: "FEMALE", elevate: false },
  ]
  const leaveEmpRecords: Record<string, any> = {}

  for (const acc of leaveAccounts) {
    const [fn, ...lnParts] = acc.name.split(" ")
    let u = await prisma.user.findUnique({ where: { email: acc.email } })
    if (!u) {
      u = await prisma.user.create({ data: { name: acc.name, email: acc.email, password: leavePwd, role: "STAFF", mustChangePassword: false } })
    } else {
      u = await prisma.user.update({ where: { id: u.id }, data: { role: "STAFF", mustChangePassword: false } })
    }
    let emp = await prisma.employee.findFirst({ where: { userId: u.id } })
    if (!emp) {
      counter++
      emp = await prisma.employee.create({
        data: { userId: u.id, employeeId: `DSN-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: lnParts.join(" "), gender: acc.gender as any, jobTitle: acc.title, departmentId: techDelivery.id, employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date("2023-01-01") },
      })
    }
    leaveEmpRecords[acc.email] = emp
    if (acc.elevate && hrAdminRole) {
      await prisma.userAdminRole.upsert({ where: { userId_adminRoleId: { userId: u.id, adminRoleId: hrAdminRole.id } }, update: {}, create: { userId: u.id, adminRoleId: hrAdminRole.id } })
    }
  }

  const ada      = leaveEmpRecords["ada.obi@datasciencenigeria.ai"]
  const testLead = leaveEmpRecords["projectlead.test@datasciencenigeria.ai"]
  if (ada && testLead) {
    await prisma.employee.update({ where: { id: ada.id }, data: { projectLeadId: testLead.id } })
  }
  console.log("  ✓ Leave test accounts")

  // ── Leave Balances ────────────────────────────────────────────────────────────
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  const sickLeave   = await prisma.leaveType.findFirst({ where: { name: "Sick Leave" } })
  const allEmps = [hrEmp, ...Object.values(empRecords), ...Object.values(leaveEmpRecords)].filter(Boolean)
  for (const emp of allEmps) {
    if (annualLeave) await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026, allocated: 21, used: 0, pending: 0 } })
    if (sickLeave)   await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026, allocated: 14, used: 0, pending: 0 } })
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
  for (const ann of [
    { title: "Welcome to DSN HRMS",                body: "We're excited to launch the new DSN HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more.", behavior: "POPUP" as const,            targetRoles: [] as string[] },
    { title: "Q2 2026 Leave Reminder",             body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: ["STAFF"] as string[] },
    { title: "Performance Review Cycle Open",      body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026.", behavior: "DASHBOARD_SCROLL" as const, targetRoles: [] as string[] },
    { title: "Public Holiday Notice — Workers' Day", body: "May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: [] as string[] },
    { title: "New HR Policy: Remote Work Guidelines", body: "DSN has updated the Remote Work Policy effective May 1, 2026. Staff may work remotely up to 2 days per week with line manager approval.", behavior: "POPUP" as const, targetRoles: ["STAFF"] as string[] },
  ]) {
    const exists = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!exists) await prisma.announcement.create({ data: { ...ann, type: "TEXT", status: "PUBLISHED", sendEmail: false, publishedAt: new Date(), createdById: hrUser.id } })
  }
  console.log("  ✓ Announcements")

  console.log("\n✅ Test seed complete!")
  console.log("\n🔑 Demo login accounts:")
  console.log("   HR Admin:  hr@datasciencenigeria.ai  /  dsn-staff   (SUPER_ADMIN)")
  console.log("   Staff 1:   staff1@dsn-hrms.com       /  dsn-demo    (STAFF)")
  console.log("   Staff 2:   staff2@dsn-hrms.com       /  dsn-demo    (STAFF)")
  console.log("   Staff 3:   staff3@dsn-hrms.com       /  dsn-demo    (STAFF)")
  console.log("   Staff 4:   staff4@dsn-hrms.com       /  dsn-demo    (STAFF)")
  console.log("\n🧪 Leave test accounts (password: Welcome@DSN1):")
  console.log("   Project Lead:  projectlead.test@datasciencenigeria.ai  (STAFF + hr-admin)")
  console.log("   Relief 1:      relief1.test@datasciencenigeria.ai       (STAFF)")
  console.log("   Relief 2:      relief2.test@datasciencenigeria.ai       (STAFF)")
  console.log("   Employee:      ada.obi@datasciencenigeria.ai            (STAFF)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
