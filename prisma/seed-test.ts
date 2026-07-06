/**
 * Test / dev seed - DO NOT run in production.
 * Requires seed.ts to have been run first (departments, leave types, etc. must exist).
 *
 * Demo login accounts:
 *   admin@michaeldemohrms.example     /  Admin@MDH2024!   (SUPER_ADMIN - set by seed.ts)
 *   staff1@michaeldemohrms.example          /  mdh-demo    (STAFF)
 *   staff2@michaeldemohrms.example          /  mdh-demo    (STAFF)
 *   staff3@michaeldemohrms.example          /  mdh-demo    (STAFF)
 *   staff4@michaeldemohrms.example          /  mdh-demo    (STAFF)
 *   + 12 sample employees        /  mdh-staff
 *
 * Leave-flow test accounts (password: Welcome@MDH1):
 *   projectlead.test@michaeldemohrms.example  (STAFF + hr-admin role)
 *   relief1.test@michaeldemohrms.example      (STAFF)
 *   relief2.test@michaeldemohrms.example      (STAFF)
 *   ada.obi@michaeldemohrms.example           (STAFF, reports to projectlead.test)
 *   intern@michaeldemohrms.example            (STAFF/Intern) - reports to lead1@michaeldemohrms.example
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

  // ── HR Admin (SUPER_ADMIN) - don't override role set by seed.ts ───────────────
  const hrUser = await prisma.user.upsert({
    where:  { email: "admin@michaeldemohrms.example" },
    update: { mustChangePassword: false, isSeeded: true },
    create: { name: "HR Admin", email: "admin@michaeldemohrms.example", password: hash("mdh-staff"), role: "SUPER_ADMIN", mustChangePassword: false, isSeeded: true },
  })
  const hrEmp = await prisma.employee.upsert({
    where:  { userId: hrUser.id },
    update: {},
    create: { userId: hrUser.id, employeeId: "MDH0001", firstName: "HR", lastName: "Admin", phone: "+234 801 234 5678", gender: "FEMALE", jobTitle: "HR Manager", departmentId: adminFacility.id, employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date("2021-03-01") },
  })

  // ── Intern test account (reports to lead1@michaeldemohrms.example) ──────────────────
  // Clean up legacy intern.test account if it exists
  const oldInternUser = await prisma.user.findUnique({ where: { email: "intern@michaeldemohrms.example" } })
  if (oldInternUser) {
    await prisma.employee.deleteMany({ where: { userId: oldInternUser.id } })
    await prisma.user.delete({ where: { id: oldInternUser.id } })
  }
  // Also free up the MDH-IN01 employeeId if held by someone else
  await prisma.employee.deleteMany({ where: { employeeId: "MDH-IN01", NOT: { user: { email: "intern@michaeldemohrms.example" } } } })

  const lead1Emp = await prisma.employee.findFirst({ where: { user: { email: "lead1@michaeldemohrms.example" } } })
  const internTestUser = await prisma.user.upsert({
    where:  { email: "intern@michaeldemohrms.example" },
    update: { mustChangePassword: false, password: hash("mdh-demo"), isSeeded: true },
    create: { name: "Intern Demo", email: "intern@michaeldemohrms.example", password: hash("mdh-demo"), role: "STAFF", mustChangePassword: false, isSeeded: true },
  })
  await prisma.employee.upsert({
    where:  { userId: internTestUser.id },
    update: { projectLeadId: lead1Emp?.id ?? null },
    create: { userId: internTestUser.id, employeeId: "MDH-IN01", firstName: "Intern", lastName: "Demo", jobTitle: "Data Science Intern", departmentId: techDelivery.id, employmentType: "INTERN", employeeStatus: "ACTIVE", hireDate: new Date("2024-06-01"), gender: "FEMALE", projectLeadId: lead1Emp?.id },
  })
  console.log("  ✓ Intern test account")

  // ── Quick-login demo staff accounts ──────────────────────────────────────────
  const demoStaffs = [
    { email: "staff1@michaeldemohrms.example", name: "Demo Staff One",   empId: "MDH-D001", fn: "Demo", ln: "Staff One",   title: "Staff",             deptId: adminFacility.id,  gender: "FEMALE", dob: "1992-03-10", salary: 380000 },
    { email: "staff2@michaeldemohrms.example", name: "Demo Staff Two",   empId: "MDH-D002", fn: "Demo", ln: "Staff Two",   title: "Software Engineer", deptId: techDelivery.id,   gender: "MALE",   dob: "1994-07-22", salary: 420000 },
    { email: "staff3@michaeldemohrms.example", name: "Demo Staff Three", empId: "MDH-D003", fn: "Demo", ln: "Staff Three", title: "Data Analyst",       deptId: equalyzai.id,      gender: "FEMALE", dob: "1996-01-15", salary: 360000 },
    { email: "staff4@michaeldemohrms.example", name: "Demo Staff Four",  empId: "MDH-D004", fn: "Demo", ln: "Staff Four",  title: "Finance Officer",    deptId: finance.id,        gender: "MALE",   dob: "1991-09-05", salary: 390000 },
  ]
  for (const s of demoStaffs) {
    const u = await prisma.user.upsert({
      where:  { email: s.email },
      update: { mustChangePassword: false, password: hash("mdh-demo"), isSeeded: true },
      create: { name: s.name, email: s.email, password: hash("mdh-demo"), role: "STAFF", mustChangePassword: false, isSeeded: true },
    })
    await prisma.employee.upsert({
      where:  { userId: u.id },
      update: { dateOfBirth: new Date(s.dob) },
      create: { userId: u.id, employeeId: s.empId, firstName: s.fn, lastName: s.ln, jobTitle: s.title, departmentId: s.deptId, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-01-01"), gender: s.gender as any, dateOfBirth: new Date(s.dob) },
    })
  }
  console.log("  ✓ Demo login accounts")

  // ── 12 Sample Employees ───────────────────────────────────────────────────────
  const samples = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@michaeldemohrms.example",   gender: "MALE",   title: "Senior Data Scientist",        dept: equalyzai.id,        type: "FULL_TIME", hire: "2022-05-10", dob: "1990-05-14", elevate: true },
    { name: "Fatima Musa",     email: "fatima.musa@michaeldemohrms.example",     gender: "FEMALE", title: "Data Analyst",                 dept: equalyzai.id,        type: "FULL_TIME", hire: "2023-01-15", dob: "1996-06-02", elevate: false },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@michaeldemohrms.example",     gender: "MALE",   title: "Software Engineer",            dept: techDelivery.id,     type: "FULL_TIME", hire: "2022-08-22", dob: "1993-08-30", elevate: true },
    { name: "Ngozi Eze",       email: "ngozi.eze@michaeldemohrms.example",       gender: "FEMALE", title: "Product Designer",             dept: productDesign.id,    type: "FULL_TIME", hire: "2023-03-01", dob: "1994-07-19", elevate: true },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@michaeldemohrms.example",   gender: "MALE",   title: "Programs Lead",                dept: solutionDelivery.id, type: "FULL_TIME", hire: "2021-11-05", dob: "1988-04-25", elevate: true },
    { name: "Blessing Okafor", email: "blessing.okafor@michaeldemohrms.example", gender: "FEMALE", title: "Brand & Comms Manager",        dept: brandComms.id,       type: "FULL_TIME", hire: "2022-02-14", dob: "1991-05-08", elevate: true },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@michaeldemohrms.example",    gender: "MALE",   title: "Finance Officer",              dept: finance.id,          type: "FULL_TIME", hire: "2022-07-18", dob: "1992-06-17", elevate: false },
    { name: "Aisha Garba",     email: "aisha.garba@michaeldemohrms.example",     gender: "FEMALE", title: "Data Engineer",                dept: equalyzai.id,        type: "FULL_TIME", hire: "2023-06-01", dob: "1997-05-21", elevate: false },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@michaeldemohrms.example",     gender: "MALE",   title: "Frontend Engineer",            dept: techDelivery.id,     type: "FULL_TIME", hire: "2023-09-11", dob: "1998-07-03", elevate: false },
    { name: "Zainab Hassan",   email: "zainab.hassan@michaeldemohrms.example",   gender: "FEMALE", title: "Data Science Intern",          dept: equalyzai.id,        type: "INTERN",    hire: "2024-01-08", dob: "2001-06-11", elevate: false },
    { name: "Olumide Adewale", email: "olumide.adewale@michaeldemohrms.example", gender: "MALE",   title: "Backend Engineer",             dept: techDelivery.id,     type: "FULL_TIME", hire: "2022-04-20", dob: "1993-04-28", elevate: false },
    { name: "Grace Okeke",     email: "grace.okeke@michaeldemohrms.example",     gender: "FEMALE", title: "Business Development Officer",  dept: bizDev.id,           type: "CONTRACT",  hire: "2023-11-01", dob: "1995-05-30", elevate: false },
  ]

  const defaultPwd = hash("mdh-staff")
  const empRecords: Record<string, any> = {}
  const allExisting = await prisma.employee.findMany({ select: { employeeId: true } })
  const maxNum = allExisting.reduce((max, e) => { const n = parseInt(e.employeeId.replace(/\D/g, ""), 10); return isNaN(n) ? max : Math.max(max, n) }, 0)
  let counter = maxNum

  for (const s of samples) {
    const [fn, ...ln] = s.name.split(" ")
    const u = await prisma.user.upsert({
      where:  { email: s.email },
      update: { role: "STAFF", mustChangePassword: false, isSeeded: true },
      create: { name: s.name, email: s.email, password: defaultPwd, role: "STAFF", mustChangePassword: false, isSeeded: true },
    })
    const existingEmp = await prisma.employee.findFirst({ where: { userId: u.id } })
    let emp: any
    if (existingEmp) {
      emp = await prisma.employee.update({ where: { id: existingEmp.id }, data: { jobTitle: s.title, departmentId: s.dept, dateOfBirth: new Date(s.dob) } })
    } else {
      counter++
      emp = await prisma.employee.upsert({
        where:  { userId: u.id },
        update: { dateOfBirth: new Date(s.dob) },
        create: { userId: u.id, employeeId: `MDH-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: ln.join(" "), gender: s.gender as any, jobTitle: s.title, departmentId: s.dept, employmentType: s.type as any, employeeStatus: "ACTIVE", hireDate: new Date(s.hire), dateOfBirth: new Date(s.dob) },
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
  const emeka    = empRecords["emeka.okonkwo@michaeldemohrms.example"]
  const chidi    = empRecords["chidi.nwosu@michaeldemohrms.example"]
  const tunde    = empRecords["tunde.adeyemi@michaeldemohrms.example"]
  const blessing = empRecords["blessing.okafor@michaeldemohrms.example"]

  await Promise.all([
    prisma.employee.update({ where: { id: empRecords["fatima.musa@michaeldemohrms.example"]?.id },     data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["aisha.garba@michaeldemohrms.example"]?.id },     data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["zainab.hassan@michaeldemohrms.example"]?.id },   data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["kelechi.ibe@michaeldemohrms.example"]?.id },     data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["olumide.adewale@michaeldemohrms.example"]?.id }, data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["grace.okeke@michaeldemohrms.example"]?.id },     data: { managerId: blessing?.id } }),
  ])
  await Promise.all([
    prisma.employee.updateMany({ where: { departmentId: equalyzai.id },        data: { projectLeadId: emeka?.id } }),
    prisma.employee.updateMany({ where: { departmentId: techDelivery.id },     data: { projectLeadId: chidi?.id } }),
    prisma.employee.updateMany({ where: { departmentId: solutionDelivery.id }, data: { projectLeadId: tunde?.id } }),
    prisma.employee.updateMany({ where: { departmentId: brandComms.id },       data: { projectLeadId: blessing?.id } }),
    prisma.employee.updateMany({ where: { departmentId: adminFacility.id },    data: { projectLeadId: hrEmp.id } }),
  ])
  // Restore intern's projectLead to lead1 (department bulk-update above overrides it)
  if (lead1Emp) {
    await prisma.employee.updateMany({
      where: { user: { email: "intern@michaeldemohrms.example" } },
      data: { projectLeadId: lead1Emp.id },
    })
  }

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
  const leavePwd = hash("Welcome@MDH1")
  const leaveAccounts = [
    { email: "projectlead.test@michaeldemohrms.example", name: "Sarah Lead",   title: "Project Lead",       gender: "FEMALE", elevate: true },
    { email: "relief1.test@michaeldemohrms.example",     name: "Emeka Relief", title: "Senior Engineer",    gender: "MALE",   elevate: false },
    { email: "relief2.test@michaeldemohrms.example",     name: "Ngozi Relief", title: "Frontend Developer", gender: "FEMALE", elevate: false },
    { email: "ada.obi@michaeldemohrms.example",          name: "Ada Obi",      title: "Junior Engineer",    gender: "FEMALE", elevate: false },
  ]
  const leaveEmpRecords: Record<string, any> = {}

  for (const acc of leaveAccounts) {
    const [fn, ...lnParts] = acc.name.split(" ")
    let u = await prisma.user.findUnique({ where: { email: acc.email } })
    if (!u) {
      u = await prisma.user.create({ data: { name: acc.name, email: acc.email, password: leavePwd, role: "STAFF", mustChangePassword: false, isSeeded: true } })
    } else {
      u = await prisma.user.update({ where: { id: u.id }, data: { role: "STAFF", mustChangePassword: false, isSeeded: true } })
    }
    let emp = await prisma.employee.findFirst({ where: { userId: u.id } })
    if (!emp) {
      counter++
      emp = await prisma.employee.create({
        data: { userId: u.id, employeeId: `MDH-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: lnParts.join(" "), gender: acc.gender as any, jobTitle: acc.title, departmentId: techDelivery.id, employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date("2023-01-01") },
      })
    }
    leaveEmpRecords[acc.email] = emp
    if (acc.elevate && hrAdminRole) {
      await prisma.userAdminRole.upsert({ where: { userId_adminRoleId: { userId: u.id, adminRoleId: hrAdminRole.id } }, update: {}, create: { userId: u.id, adminRoleId: hrAdminRole.id } })
    }
  }

  const ada      = leaveEmpRecords["ada.obi@michaeldemohrms.example"]
  const testLead = leaveEmpRecords["projectlead.test@michaeldemohrms.example"]
  if (ada && testLead) {
    await prisma.employee.update({ where: { id: ada.id }, data: { projectLeadId: testLead.id } })
  }
  console.log("  ✓ Leave test accounts")

  // ── Leave Balances ────────────────────────────────────────────────────────────
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  const sickLeave   = await prisma.leaveType.findFirst({ where: { name: "Sick Leave" } })
  const internTestEmp = await prisma.employee.findFirst({ where: { user: { email: "intern@michaeldemohrms.example" } } })
  const allEmps = [hrEmp, ...Object.values(empRecords), ...Object.values(leaveEmpRecords), internTestEmp].filter(Boolean)
  for (const emp of allEmps) {
    if (annualLeave) await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: annualLeave.id, year: 2026, allocated: 21, used: 0, pending: 0 } })
    if (sickLeave)   await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026 } }, update: {}, create: { employeeId: emp.id, leaveTypeId: sickLeave.id,   year: 2026, allocated: 14, used: 0, pending: 0 } })
  }
  console.log("  ✓ Leave balances")

  // ── Announcements ─────────────────────────────────────────────────────────────
  for (const ann of [
    { title: "Welcome to Michael Demo HRMS",       body: "We're excited to launch the new HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more.", behavior: "POPUP" as const,            targetRoles: [] as string[] },
    { title: "Q2 2026 Leave Reminder",             body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: ["STAFF", "PROJECT_LEAD"] as string[] },
    { title: "Performance Review Cycle Open",      body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026.", behavior: "DASHBOARD_SCROLL" as const, targetRoles: [] as string[] },
    { title: "Public Holiday Notice - Workers' Day", body: "May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: [] as string[] },
    { title: "New HR Policy: Remote Work Guidelines", body: "The Remote Work Policy has been updated effective May 1, 2026. Staff may work remotely up to 2 days per week with line manager approval.", behavior: "POPUP" as const, targetRoles: ["STAFF", "PROJECT_LEAD"] as string[] },
  ]) {
    const exists = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!exists) await prisma.announcement.create({ data: { ...ann, type: "TEXT", status: "PUBLISHED", sendEmail: false, publishedAt: new Date(), createdById: hrUser.id } })
  }
  console.log("  ✓ Announcements")

  console.log("\n✅ Test seed complete!")
  console.log("\n🔑 Demo login accounts:")
  console.log("   HR Admin:  admin@michaeldemohrms.example  /  Admin@MDH2024!   (SUPER_ADMIN)")
  console.log("   Staff 1:   staff1@michaeldemohrms.example       /  mdh-demo    (STAFF)")
  console.log("   Staff 2:   staff2@michaeldemohrms.example       /  mdh-demo    (STAFF)")
  console.log("   Staff 3:   staff3@michaeldemohrms.example       /  mdh-demo    (STAFF)")
  console.log("   Staff 4:   staff4@michaeldemohrms.example       /  mdh-demo    (STAFF)")
  console.log("\n🧪 Leave test accounts (password: Welcome@MDH1):")
  console.log("   Project Lead:  projectlead.test@michaeldemohrms.example  (STAFF + hr-admin)")
  console.log("   Relief 1:      relief1.test@michaeldemohrms.example       (STAFF)")
  console.log("   Relief 2:      relief2.test@michaeldemohrms.example       (STAFF)")
  console.log("   Employee:      ada.obi@michaeldemohrms.example            (STAFF)")
  console.log("\n🎓 Intern test account (password: mdh-demo):")
  console.log("   Intern:        intern@michaeldemohrms.example        (STAFF/Intern → lead1@michaeldemohrms.example)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
