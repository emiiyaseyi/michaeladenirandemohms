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

  // Super Admin user
  const adminPwd = await bcrypt.hash("Admin@DSN2024!", 10)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@datasciencenigeria.org" },
    update: {},
    create: { name: "DSN Admin", email: "admin@datasciencenigeria.org", password: adminPwd, role: "SUPER_ADMIN" }
  })

  // HR Admin
  const hrPwd = await bcrypt.hash("Welcome@DSN1", 10)
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@datasciencenigeria.org" },
    update: {},
    create: { name: "Amina Bello", email: "hr@datasciencenigeria.org", password: hrPwd, role: "HR_ADMIN" }
  })
  const hrEmp = await prisma.employee.upsert({
    where: { workEmail: "hr@datasciencenigeria.org" },
    update: {},
    create: {
      userId: hrUser.id, employeeId: "DSN0001", firstName: "Amina", lastName: "Bello",
      workEmail: "hr@datasciencenigeria.org", phone: "+234 801 234 5678",
      gender: "FEMALE", jobTitle: "HR Manager", departmentId: hr.id,
      employmentType: "FULL_TIME", employeeStatus: "ACTIVE", hireDate: new Date("2021-03-01"),
    }
  })

  // Sample employees
  const sampleEmployees = [
    { name: "Emeka Okonkwo", email: "emeka.okonkwo@datasciencenigeria.org", gender: "MALE", title: "Senior Data Scientist", dept: dsn.id, type: "FULL_TIME", hire: "2022-05-10" },
    { name: "Fatima Musa", email: "fatima.musa@datasciencenigeria.org", gender: "FEMALE", title: "Data Analyst", dept: dsn.id, type: "FULL_TIME", hire: "2023-01-15" },
    { name: "Chidi Nwosu", email: "chidi.nwosu@datasciencenigeria.org", gender: "MALE", title: "Software Engineer", dept: eng.id, type: "FULL_TIME", hire: "2022-08-22" },
    { name: "Ngozi Eze", email: "ngozi.eze@datasciencenigeria.org", gender: "FEMALE", title: "Product Manager", dept: prod.id, type: "FULL_TIME", hire: "2023-03-01" },
    { name: "Tunde Adeyemi", email: "tunde.adeyemi@datasciencenigeria.org", gender: "MALE", title: "Programs Lead", dept: prog.id, type: "FULL_TIME", hire: "2021-11-05" },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.org", gender: "FEMALE", title: "Marketing Manager", dept: mkt.id, type: "FULL_TIME", hire: "2022-02-14" },
    { name: "Ibrahim Sule", email: "ibrahim.sule@datasciencenigeria.org", gender: "MALE", title: "Finance Officer", dept: fin.id, type: "FULL_TIME", hire: "2022-07-18" },
    { name: "Aisha Garba", email: "aisha.garba@datasciencenigeria.org", gender: "FEMALE", title: "Data Engineer", dept: dsn.id, type: "FULL_TIME", hire: "2023-06-01" },
    { name: "Kelechi Ibe", email: "kelechi.ibe@datasciencenigeria.org", gender: "MALE", title: "Frontend Engineer", dept: eng.id, type: "FULL_TIME", hire: "2023-09-11" },
    { name: "Zainab Hassan", email: "zainab.hassan@datasciencenigeria.org", gender: "FEMALE", title: "Data Science Intern", dept: dsn.id, type: "INTERN", hire: "2024-01-08" },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.org", gender: "MALE", title: "Backend Engineer", dept: eng.id, type: "FULL_TIME", hire: "2022-04-20" },
    { name: "Grace Okeke", email: "grace.okeke@datasciencenigeria.org", gender: "FEMALE", title: "Partnerships Officer", dept: part.id, type: "CONTRACT", hire: "2023-11-01" },
  ]

  for (let i = 0; i < sampleEmployees.length; i++) {
    const s = sampleEmployees[i]
    const [fn, ...ln] = s.name.split(" ")
    const pwd = await bcrypt.hash("Welcome@DSN1", 10)
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, password: pwd, role: "STAFF" }
    })
    await prisma.employee.upsert({
      where: { workEmail: s.email },
      update: {},
      create: {
        userId: u.id, employeeId: `DSN${String(i+2).padStart(4,"0")}`,
        firstName: fn, lastName: ln.join(" "), workEmail: s.email,
        gender: s.gender as any, jobTitle: s.title, departmentId: s.dept,
        employmentType: s.type as any, employeeStatus: "ACTIVE",
        hireDate: new Date(s.hire),
      }
    })
  }

  // Performance cycle
  const cycle = await prisma.performanceCycle.upsert({
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
  const emeka = await prisma.employee.findFirst({ where: { workEmail: "emeka.okonkwo@datasciencenigeria.org" } })
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

  console.log("✅ Seed complete!")
  console.log("\n📧 Login credentials:")
  console.log("   Super Admin: admin@datasciencenigeria.org / Admin@DSN2024!")
  console.log("   HR Admin:    hr@datasciencenigeria.org / Welcome@DSN1")
  console.log("   Staff:       emeka.okonkwo@datasciencenigeria.org / Welcome@DSN1")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
