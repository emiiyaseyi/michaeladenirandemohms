import "dotenv/config";
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding DSN HRMS...")

  // Divisions
  const techDiv = await prisma.division.upsert({ where: { name: "Technology" }, update: {}, create: { name: "Technology", description: "Technology and Engineering" } })
  const opsDiv = await prisma.division.upsert({ where: { name: "Operations" }, update: {}, create: { name: "Operations", description: "Business Operations" } })
  const commsDiv = await prisma.division.upsert({ where: { name: "Communications" }, update: {}, create: { name: "Communications", description: "Media and Communications" } })

  // Departments
  const depts = await Promise.all([
    prisma.department.upsert({ where: { name: "Data Science" }, update: {}, create: { name: "Data Science", description: "AI/ML and Data Analytics", divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "Engineering" }, update: {}, create: { name: "Engineering", description: "Software Development", divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "Product" }, update: {}, create: { name: "Product", description: "Product Management", divisionId: techDiv.id } }),
    prisma.department.upsert({ where: { name: "Human Resources" }, update: {}, create: { name: "Human Resources", description: "People & Culture", divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance", description: "Finance & Accounting", divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Programs" }, update: {}, create: { name: "Programs", description: "Training Programs", divisionId: opsDiv.id } }),
    prisma.department.upsert({ where: { name: "Marketing" }, update: {}, create: { name: "Marketing", description: "Brand & Marketing", divisionId: commsDiv.id } }),
    prisma.department.upsert({ where: { name: "Partnerships" }, update: {}, create: { name: "Partnerships", description: "Strategic Partnerships", divisionId: commsDiv.id } }),
  ])
  const [dsn, eng, prod, hr, fin, prog, mkt, part] = depts

  // Leave types
  await Promise.all([
    prisma.leaveType.upsert({ where: { name: "Annual Leave" }, update: {}, create: { name: "Annual Leave", description: "Standard annual leave", defaultDays: 21, waitingDays: 7, excludeWeekends: true } }),
    prisma.leaveType.upsert({ where: { name: "Sick Leave" }, update: {}, create: { name: "Sick Leave", description: "Medical leave", defaultDays: 14, requiresDoc: true, minDocDays: 2 } }),
    prisma.leaveType.upsert({ where: { name: "Maternity Leave" }, update: {}, create: { name: "Maternity Leave", description: "Maternity leave for new mothers", defaultDays: 90, genderSpecific: "FEMALE", waitingDays: 14 } }),
    prisma.leaveType.upsert({ where: { name: "Paternity Leave" }, update: {}, create: { name: "Paternity Leave", description: "Paternity leave for new fathers", defaultDays: 5, genderSpecific: "MALE" } }),
    prisma.leaveType.upsert({ where: { name: "Casual Leave" }, update: {}, create: { name: "Casual Leave", description: "Short casual leave", defaultDays: 5 } }),
    prisma.leaveType.upsert({ where: { name: "Work From Home" }, update: {}, create: { name: "Work From Home", description: "Remote work days", defaultDays: 12 } }),
    prisma.leaveType.upsert({ where: { name: "Study Leave" }, update: {}, create: { name: "Study Leave", description: "Educational leave", defaultDays: 5, waitingDays: 14 } }),
  ])

  // Public Holidays (Nigeria 2026)
  const year = 2026
  const holidays = [
    { name: "New Year's Day", date: new Date(`${year}-01-01`) },
    { name: "Democracy Day", date: new Date(`${year}-06-12`) },
    { name: "Independence Day", date: new Date(`${year}-10-01`) },
    { name: "Christmas Day", date: new Date(`${year}-12-25`) },
    { name: "Boxing Day", date: new Date(`${year}-12-26`) },
    { name: "Workers Day", date: new Date(`${year}-05-01`) },
    { name: "Eid el-Fitr", date: new Date(`${year}-03-30`) },
    { name: "Eid el-Kabir", date: new Date(`${year}-06-06`) },
    { name: "Maulid un-Nabi", date: new Date(`${year}-09-04`) },
    { name: "Good Friday", date: new Date(`${year}-04-03`) },
    { name: "Easter Monday", date: new Date(`${year}-04-06`) },
    { name: "National Day", date: new Date(`${year}-10-02`) },
  ]
  for (const h of holidays) {
    const existing = await prisma.publicHoliday.findFirst({ where: { name: h.name, year } })
    if (!existing) await prisma.publicHoliday.create({ data: { ...h, year } })
  }

  // Super Admin user (password unchanged)
  const adminPwd = await bcrypt.hash("Admin@DSN2024!", 10)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@datasciencenigeria.ai" },
    update: {},
    create: { name: "DSN Admin", email: "admin@datasciencenigeria.ai", password: adminPwd, role: "SUPER_ADMIN" }
  })

  // HR Admin (keep existing password)
  const hrPwd = await bcrypt.hash("dsn-staff", 10)
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@datasciencenigeria.ai" },
    update: {},
    create: { name: "Amina Bello", email: "hr@datasciencenigeria.ai", password: hrPwd, role: "HR_ADMIN" }
  })
  const hrEmp = await prisma.employee.upsert({
    where: { workEmail: "hr@datasciencenigeria.ai" },
    update: {},
    create: {
      userId: hrUser.id, employeeId: "DSN0001", firstName: "Amina", lastName: "Bello",
      workEmail: "hr@datasciencenigeria.ai", phone: "+234 801 234 5678",
      gender: "FEMALE", jobTitle: "HR Manager", departmentId: hr.id,
      employmentType: "FULL_TIME", category: "NON_TECHNICAL",
      grossSalary: 750000, employeeStatus: "ACTIVE", hireDate: new Date("2021-03-01"),
    }
  })

  // Manager (Tunde Adeyemi) + Programs Lead (Ngozi Eze)
  // We set up managers and dept leads after all employees are created

  // Sample employees with category and salary
  const sampleEmployees = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@datasciencenigeria.ai",   gender: "MALE",   title: "Senior Data Scientist",  dept: dsn.id,  type: "FULL_TIME", hire: "2022-05-10", cat: "TECHNICAL",     salary: 600000, role: "MANAGER" },
    { name: "Fatima Musa",     email: "fatima.musa@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Analyst",            dept: dsn.id,  type: "FULL_TIME", hire: "2023-01-15", cat: "TECHNICAL",     salary: 420000, role: "STAFF" },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@datasciencenigeria.ai",     gender: "MALE",   title: "Software Engineer",       dept: eng.id,  type: "FULL_TIME", hire: "2022-08-22", cat: "TECHNICAL",     salary: 480000, role: "DEPARTMENT_LEAD" },
    { name: "Ngozi Eze",       email: "ngozi.eze@datasciencenigeria.ai",       gender: "FEMALE", title: "Product Manager",         dept: prod.id, type: "FULL_TIME", hire: "2023-03-01", cat: "NON_TECHNICAL", salary: 550000, role: "MANAGER" },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@datasciencenigeria.ai",   gender: "MALE",   title: "Programs Lead",           dept: prog.id, type: "FULL_TIME", hire: "2021-11-05", cat: "NON_TECHNICAL", salary: 520000, role: "DEPARTMENT_LEAD" },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.ai", gender: "FEMALE", title: "Marketing Manager",       dept: mkt.id,  type: "FULL_TIME", hire: "2022-02-14", cat: "NON_TECHNICAL", salary: 480000, role: "MANAGER" },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@datasciencenigeria.ai",    gender: "MALE",   title: "Finance Officer",         dept: fin.id,  type: "FULL_TIME", hire: "2022-07-18", cat: "NON_TECHNICAL", salary: 400000, role: "PAYROLL_OFFICER" },
    { name: "Aisha Garba",     email: "aisha.garba@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Engineer",           dept: dsn.id,  type: "FULL_TIME", hire: "2023-06-01", cat: "TECHNICAL",     salary: 450000, role: "STAFF" },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@datasciencenigeria.ai",     gender: "MALE",   title: "Frontend Engineer",       dept: eng.id,  type: "FULL_TIME", hire: "2023-09-11", cat: "TECHNICAL",     salary: 380000, role: "STAFF" },
    { name: "Zainab Hassan",   email: "zainab.hassan@datasciencenigeria.ai",   gender: "FEMALE", title: "Data Science Intern",     dept: dsn.id,  type: "INTERN",    hire: "2024-01-08", cat: "TECHNICAL",     salary: 120000, role: "INTERN" },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.ai", gender: "MALE",   title: "Backend Engineer",        dept: eng.id,  type: "FULL_TIME", hire: "2022-04-20", cat: "TECHNICAL",     salary: 460000, role: "STAFF" },
    { name: "Grace Okeke",     email: "grace.okeke@datasciencenigeria.ai",     gender: "FEMALE", title: "Partnerships Officer",    dept: part.id, type: "CONTRACT",  hire: "2023-11-01", cat: "NON_TECHNICAL", salary: 350000, role: "STAFF" },
  ]

  const defaultPwd = await bcrypt.hash("dsn-staff", 10)
  const empRecords: Record<string, any> = {}

  // Get max existing employeeId number so we don't collide
  const allExistingEmps = await prisma.employee.findMany({ select: { employeeId: true } })
  const maxEmpNum = allExistingEmps.reduce((max, e) => {
    const n = parseInt(e.employeeId.replace(/\D/g, ""), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
  let empIdCounter = maxEmpNum

  for (let i = 0; i < sampleEmployees.length; i++) {
    const s = sampleEmployees[i]
    const [fn, ...ln] = s.name.split(" ")
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { password: defaultPwd, role: s.role as any },
      create: { name: s.name, email: s.email, password: defaultPwd, role: s.role as any }
    })
    // Check if employee already exists for this user
    const existingEmpForUser = await prisma.employee.findFirst({ where: { userId: u.id } })
    let emp: any
    if (existingEmpForUser) {
      emp = await prisma.employee.update({
        where: { id: existingEmpForUser.id },
        data: { category: s.cat as any, grossSalary: s.salary, jobTitle: s.title, departmentId: s.dept }
      })
    } else {
      empIdCounter++
      emp = await prisma.employee.upsert({
        where: { workEmail: s.email },
        update: { category: s.cat as any, grossSalary: s.salary },
        create: {
          userId: u.id, employeeId: `DSN-${String(empIdCounter).padStart(4, "0")}`,
          firstName: fn, lastName: ln.join(" "), workEmail: s.email,
          gender: s.gender as any, jobTitle: s.title, departmentId: s.dept,
          employmentType: s.type as any, category: s.cat as any,
          grossSalary: s.salary, employeeStatus: "ACTIVE",
          hireDate: new Date(s.hire),
        }
      })
    }
    empRecords[s.email] = emp
  }

  // Set up managers and dept leads
  const emeka = empRecords["emeka.okonkwo@datasciencenigeria.ai"]
  const chidi  = empRecords["chidi.nwosu@datasciencenigeria.ai"]
  const ngozi  = empRecords["ngozi.eze@datasciencenigeria.ai"]
  const tunde  = empRecords["tunde.adeyemi@datasciencenigeria.ai"]
  const blessing = empRecords["blessing.okafor@datasciencenigeria.ai"]

  // Set managers for technical employees
  await Promise.all([
    prisma.employee.update({ where: { workEmail: "fatima.musa@datasciencenigeria.ai" }, data: { managerId: emeka.id, departmentLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "aisha.garba@datasciencenigeria.ai" }, data: { managerId: emeka.id, departmentLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "zainab.hassan@datasciencenigeria.ai" }, data: { managerId: emeka.id, departmentLeadId: emeka.id } }),
    prisma.employee.update({ where: { workEmail: "kelechi.ibe@datasciencenigeria.ai" }, data: { managerId: chidi.id, departmentLeadId: chidi.id } }),
    prisma.employee.update({ where: { workEmail: "olumide.adewale@datasciencenigeria.ai" }, data: { managerId: chidi.id, departmentLeadId: chidi.id } }),
    prisma.employee.update({ where: { workEmail: "grace.okeke@datasciencenigeria.ai" }, data: { managerId: blessing.id } }),
  ])

  // Set dept leads — stored on employees via departmentLeadId
  await Promise.all([
    prisma.employee.updateMany({ where: { departmentId: dsn.id },  data: { departmentLeadId: emeka.id } }),
    prisma.employee.updateMany({ where: { departmentId: eng.id },  data: { departmentLeadId: chidi.id } }),
    prisma.employee.updateMany({ where: { departmentId: prog.id }, data: { departmentLeadId: tunde.id } }),
    prisma.employee.updateMany({ where: { departmentId: mkt.id },  data: { departmentLeadId: blessing.id } }),
    prisma.employee.updateMany({ where: { departmentId: hr.id },   data: { departmentLeadId: hrEmp.id } }),
  ])

  // Performance cycle
  await prisma.performanceCycle.upsert({
    where: { id: "perf-2026-h1" },
    update: {},
    create: {
      id: "perf-2026-h1",
      name: "2026 H1 Performance Cycle",
      year: 2026, half: 1, isActive: true,
      startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
      kpiDeadline: new Date("2026-01-31"),
    }
  })

  // Projects — at least 2 per tech employee
  const projectDefs = [
    { id: "proj-001", name: "AI Talent Analytics Platform", status: "ACTIVE",   members: ["emeka.okonkwo@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai", "aisha.garba@datasciencenigeria.ai"] },
    { id: "proj-002", name: "DSN Data Labelling Pipeline",  status: "ACTIVE",   members: ["emeka.okonkwo@datasciencenigeria.ai", "zainab.hassan@datasciencenigeria.ai"] },
    { id: "proj-003", name: "HRMS v2.0 Development",        status: "ACTIVE",   members: ["chidi.nwosu@datasciencenigeria.ai", "kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai"] },
    { id: "proj-004", name: "Mobile App Revamp",             status: "ACTIVE",   members: ["kelechi.ibe@datasciencenigeria.ai", "olumide.adewale@datasciencenigeria.ai", "chidi.nwosu@datasciencenigeria.ai"] },
    { id: "proj-005", name: "Q2 2026 Cohort Launch",         status: "ACTIVE",   members: ["tunde.adeyemi@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
    { id: "proj-006", name: "Brand Identity Refresh",        status: "ACTIVE",   members: ["blessing.okafor@datasciencenigeria.ai", "grace.okeke@datasciencenigeria.ai"] },
    { id: "proj-007", name: "Partner Onboarding Automation", status: "ON_HOLD",  members: ["grace.okeke@datasciencenigeria.ai", "blessing.okafor@datasciencenigeria.ai"] },
    { id: "proj-008", name: "Financial Reporting Dashboard",  status: "ACTIVE",   members: ["ibrahim.sule@datasciencenigeria.ai", "fatima.musa@datasciencenigeria.ai"] },
  ]

  for (const p of projectDefs) {
    const existing = await prisma.project.findUnique({ where: { id: p.id } })
    if (!existing) {
      await prisma.project.create({
        data: { id: p.id, name: p.name, status: p.status as any, startDate: new Date("2026-01-01") }
      })
    }
    for (const email of p.members) {
      const emp = empRecords[email]
      if (!emp) continue
      const exists = await prisma.projectAssignment.findUnique({ where: { projectId_employeeId: { projectId: p.id, employeeId: emp.id } } })
      if (!exists) {
        await prisma.projectAssignment.create({ data: { projectId: p.id, employeeId: emp.id, role: email === p.members[0] ? "LEAD" : "MEMBER" } })
      }
    }
  }

  // Job postings
  await Promise.all([
    prisma.jobPosting.upsert({ where: { id: "job-ds-001" }, update: {}, create: { id: "job-ds-001", title: "Senior Data Scientist", departmentId: dsn.id, description: "We are looking for a Senior Data Scientist to join our growing team.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-eng-001" }, update: {}, create: { id: "job-eng-001", title: "Full Stack Engineer", departmentId: eng.id, description: "Join our engineering team to build the next generation of data platforms.", employmentType: "FULL_TIME", status: "OPEN", openDate: new Date() } }),
    prisma.jobPosting.upsert({ where: { id: "job-intern-001" }, update: {}, create: { id: "job-intern-001", title: "Data Science Intern", departmentId: dsn.id, description: "Exciting internship opportunity for aspiring data scientists.", employmentType: "INTERN", isInternal: false, status: "OPEN", openDate: new Date() } }),
  ])

  // Sample applications
  const apps = [
    { name: "Chukwuemeka Obi", email: "c.obi@gmail.com", jobId: "job-ds-001", stage: "INTERVIEW" },
    { name: "Halima Abdullahi", email: "h.abdullahi@yahoo.com", jobId: "job-ds-001", stage: "ASSESSMENT" },
    { name: "Samuel Adeyinka", email: "s.adeyinka@gmail.com", jobId: "job-eng-001", stage: "TECHNICAL" },
    { name: "Miriam Osei", email: "m.osei@outlook.com", jobId: "job-eng-001", stage: "APPLICATION" },
    { name: "David Umeh", email: "d.umeh@gmail.com", jobId: "job-intern-001", stage: "OFFER" },
  ]
  for (const a of apps) {
    const existing = await prisma.jobApplication.findFirst({ where: { candidateEmail: a.email } })
    if (!existing) {
      await prisma.jobApplication.create({
        data: { jobPostingId: a.jobId, candidateName: a.name, candidateEmail: a.email, stage: a.stage as any, status: "ACTIVE" }
      })
    }
  }

  // Leave request (sample)
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  if (annualLeave && emeka) {
    const existing = await prisma.leaveRequest.findFirst({ where: { employeeId: emeka.id } })
    if (!existing) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emeka.id, leaveTypeId: annualLeave.id,
          departmentId: emeka.departmentId, startDate: new Date("2026-04-14"),
          endDate: new Date("2026-04-18"), days: 5,
          reason: "Annual leave for family vacation", status: "PENDING",
        }
      })
    }
  }

  // ── Payslips — Jan–Mar 2026 for all employees ─────────────────────────────
  const allEmps = [
    { emp: hrEmp,   salary: 750000 },
    ...sampleEmployees.map(s => ({ emp: empRecords[s.email], salary: s.salary })),
  ].filter(e => e.emp)

  for (const { emp, salary } of allEmps) {
    const basic       = salary * 0.5
    const housing     = salary * 0.2
    const transport   = salary * 0.1
    const meal        = salary * 0.05
    const gross       = salary
    const pension     = basic * 0.08           // 8% of basic
    const nhf         = basic * 0.025          // 2.5% NHF
    const paye        = Math.max(0, (gross - 200000) * 0.07)  // simplified PAYE
    const healthIns   = 15000
    const net         = gross - pension - nhf - paye - healthIns

    for (const month of [1, 2, 3]) {
      const ex = await prisma.payslip.findUnique({ where: { employeeId_month_year: { employeeId: emp.id, month, year: 2026 } } })
      if (!ex) {
        await prisma.payslip.create({
          data: {
            employeeId: emp.id, month, year: 2026,
            grossSalary: gross, basicSalary: basic,
            housing, transport, meal, otherAllowances: 0,
            payeTax: Math.round(paye), pension: Math.round(pension),
            nhf: Math.round(nhf), healthInsurance: healthIns,
            otherDeductions: 0, netPay: Math.round(net),
            status: "RELEASED", releasedAt: new Date(`2026-0${month}-28`),
          }
        })
      }
    }
  }

  // ── Announcements ─────────────────────────────────────────────────────────
  const announcementData = [
    {
      title: "Welcome to DSN HRMS",
      body: "We're excited to launch the new DSN HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more. Explore the Self Service menu to get started.",
      type: "TEXT" as const, behavior: "POPUP" as const, status: "PUBLISHED" as const, targetRoles: [] as string[], sendEmail: false,
    },
    {
      title: "Q2 2026 Leave Reminder",
      body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026. Requests submitted after this date may not be approved due to team capacity. Contact HR at hr@datasciencenigeria.ai for assistance.",
      type: "TEXT" as const, behavior: "NOTIFICATION_BAR" as const, status: "PUBLISHED" as const, targetRoles: ["STAFF", "INTERN"] as string[], sendEmail: true,
    },
    {
      title: "Performance Review Cycle Open",
      body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026. Line managers should submit team reviews by May 7. Log in to the Performance module to begin.",
      type: "TEXT" as const, behavior: "DASHBOARD_SCROLL" as const, status: "PUBLISHED" as const, targetRoles: [] as string[], sendEmail: false,
    },
    {
      title: "Public Holiday Notice — Workers' Day",
      body: "Please note that May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed. Employees on shift work should consult their line managers for scheduling arrangements. The day will not be deducted from annual leave.",
      type: "TEXT" as const, behavior: "NOTIFICATION_BAR" as const, status: "PUBLISHED" as const, targetRoles: [] as string[], sendEmail: false,
    },
    {
      title: "New HR Policy: Remote Work Guidelines",
      body: "DSN has updated the Remote Work Policy effective May 1, 2026. Key changes include: (1) Staff may work remotely up to 2 days per week with line manager approval. (2) Remote work requests must be submitted 48 hours in advance. (3) All remote workers must be reachable during core hours (9am–3pm). Please review the full policy document in the Document Library.",
      type: "TEXT" as const, behavior: "POPUP" as const, status: "PUBLISHED" as const, targetRoles: ["STAFF", "INTERN"] as string[], sendEmail: true,
    },
  ]

  for (const ann of announcementData) {
    const existing = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!existing) {
      await prisma.announcement.create({ data: { ...ann, publishedAt: new Date(), createdById: adminUser.id } })
    }
  }

  console.log("✅ Seed complete!")
  console.log("\n📧 Login credentials (all staff use: dsn-staff):")
  console.log("   Super Admin:    admin@datasciencenigeria.ai  / Admin@DSN2024!")
  console.log("   HR Admin:       hr@datasciencenigeria.ai     / dsn-staff")
  console.log("   Manager:        emeka.okonkwo@...            / dsn-staff")
  console.log("   Payroll Off:    ibrahim.sule@...             / dsn-staff")
  console.log("   Staff:          fatima.musa@...              / dsn-staff")
  console.log("   Intern:         zainab.hassan@...            / dsn-staff")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
