/**
 * Production seed — safe to run in any environment.
 * Creates reference data the app needs to function:
 *   - Divisions & Departments
 *   - Leave Types
 *   - Public Holidays (Nigeria)
 *   - Active Performance Cycle
 *   - Super admin account (edodida@datasciencenigeria.ai)
 *   - CEO + Executive Director accounts (top-tier managers)
 *
 * Run: npm run db:seed
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { EMAIL_EVENTS } from "../src/lib/email-events"
import { defaultQuestions, DEFAULT_GLOBAL_KPIS, DEFAULT_WEIGHTS, DEFAULT_QUERY_BANDS, DEFAULT_RECOMMENDATION_BANDS } from "../src/lib/appraisal-defaults"

const prisma = new PrismaClient()

const hash = (pw: string) => bcrypt.hashSync(pw, 10)

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
    prisma.department.upsert({ where: { name: "Human Resources" },                   update: {}, create: { name: "Human Resources",                   description: "Human resources and people operations",            divisionId: opsDiv.id } }),
  ])
  console.log("  ✓ Divisions & Departments")

  // ── Leave Types (DSN policy) ────────────────────────────────────────────────
  const leavePolicy = {
    annual:        { name: "Annual Leave",        description: "Standard annual leave",                                          defaultDays: 10, minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    sick:          { name: "Sick Leave",          description: "Medical leave — align with your Project Lead.",                  defaultDays: 5,  minNoticeDays: 0,  requiresDoc: true,  minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    compassionate: { name: "Compassionate Leave", description: "Bereavement / family emergency — align with your Project Lead.", defaultDays: 5,  minNoticeDays: 0,  requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    maternity:     { name: "Maternity Leave",     description: "Maternity leave for expectant mothers.",                         defaultDays: 90, minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: "FEMALE" as const, excludeWeekends: true,  isActive: true },
    paternity:     { name: "Paternity Leave",     description: "Paternity leave for new fathers.",                               defaultDays: 5,  minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: "MALE" as const,   excludeWeekends: true,  isActive: true },
    casual:        { name: "Casual Leave",        description: "Casual leave (interns only).",                                   defaultDays: 5,  minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: true,  genderSpecific: null,              excludeWeekends: true,  isActive: true },
  }

  await Promise.all(Object.values(leavePolicy).map(p =>
    prisma.leaveType.upsert({ where: { name: p.name }, update: p, create: p })
  ))

  // Clean up legacy leave types no longer offered by DSN.
  for (const legacyName of ["Study Leave", "Work From Home"]) {
    const lt = await prisma.leaveType.findUnique({ where: { name: legacyName } })
    if (!lt) continue
    if (legacyName === "Study Leave") {
      await prisma.leaveRequest.deleteMany({ where: { leaveTypeId: lt.id } })
      await prisma.leaveBalance.deleteMany({ where: { leaveTypeId: lt.id } })
      await prisma.leaveType.delete({ where: { id: lt.id } })
      continue
    }
    const refs = await prisma.leaveRequest.count({ where: { leaveTypeId: lt.id } })
    if (refs === 0) {
      await prisma.leaveBalance.deleteMany({ where: { leaveTypeId: lt.id } })
      await prisma.leaveType.delete({ where: { id: lt.id } })
    } else {
      await prisma.leaveType.update({ where: { id: lt.id }, data: { isActive: false } })
    }
  }
  console.log("  ✓ Leave Types (6 active per DSN policy)")

  // ── Request Document Types ────────────────────────────────────────────────────
  await Promise.all([
    prisma.requestDocumentType.upsert({ where: { name: "Employment Confirmation Letter" }, update: {}, create: { name: "Employment Confirmation Letter" } }),
    prisma.requestDocumentType.upsert({ where: { name: "Experience Letter" },              update: {}, create: { name: "Experience Letter" } }),
    prisma.requestDocumentType.upsert({ where: { name: "NOC Letter" },                     update: {}, create: { name: "NOC Letter" } }),
    prisma.requestDocumentType.upsert({ where: { name: "Other" },                          update: {}, create: { name: "Other" } }),
  ])
  console.log("  ✓ Request Document Types")

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

// ── Production HR Admin (Super Admin) ────────────────────────────────────────
  // isSeeded: false — real person, emails flow normally.
  {
    const hashed = await bcrypt.hash("Admin@DSN2024!", 12)
    await prisma.user.upsert({
      where:  { email: "edodida@datasciencenigeria.ai" },
      update: { role: "SUPER_ADMIN" as any, mustChangePassword: false, isSeeded: false },
      create: { name: "HR Admin", email: "edodida@datasciencenigeria.ai", password: hashed, role: "SUPER_ADMIN" as any, mustChangePassword: false, isSeeded: false },
    })
    console.log("  ✓ Admin account (edodida@datasciencenigeria.ai)")
  }

  // ── System Admin Roles ────────────────────────────────────────────────────────
  const SYSTEM_ROLES = [
    {
      slug: "secondary-admin",
      name: "Secondary Admin",
      description: "Full admin panel access — same as Primary Admin except account management.",
      permissions: {
        canViewAllEmployees: true, canCreateEmployee: true, canEditEmployee: true, canDeleteEmployee: true, canApproveEmployee: true,
        canViewOffers: true, canManageOffers: true, canViewOrgChart: true,
        canViewCustomGroups: true, canManageCustomGroups: true,
        canViewPersonalDetails: true, canManageProfileRequests: true, canViewPersonalDocuments: true,
        canManageDepartments: true, canViewJobTitles: true, canManageJobTitles: true,
        canViewJobs: true, canCreateJob: true, canEditJob: true, canDeleteJob: true, canPostJob: true, canApproveJob: true, canViewApplicants: true, canManageHiringSettings: true,
        canViewAllLeave: true, canCreateLeave: true, canEditLeave: true, canDeleteLeave: true, canApproveLeave: true, canViewLeaveTypes: true, canManageLeaveTypes: true,
        canViewSurveys: true, canCreateSurvey: true, canEditSurvey: true, canDeleteSurvey: true,
        canViewDocuments: true, canManageDocuments: true, canRecallDocuments: true, canDeleteDocuments: true, canMakeOffers: true, canManageOfferTemplates: true,
        canViewBenefits: true, canManageBenefits: true,
        canViewPerformance: true, canManageAppraisalCycles: true, canAssignReviewers: true, canCompileAppraisals: true,
        canViewAbsences: true, canCreateAbsence: true, canEditAbsence: true, canDeleteAbsence: true, canReviewAbsence: true,
        canViewDisciplinary: true, canManageViolations: true, canManagePolicies: true, canManageViolationTypes: true, canManageTriggers: true, canViewSuspensions: true, canManageSuspensions: true,
        canViewAnnouncements: true, canCreateAnnouncement: true, canEditAnnouncement: true, canDeleteAnnouncement: true, canManageAnnouncementGroups: true,
        canViewAssets: true, canCreateAsset: true, canEditAsset: true, canDeleteAsset: true, canManageAssetAssignments: true,
        canViewRentDocuments: true, canManageRentDocuments: true,
        canViewInternReports: true, canReviewInternReports: true, canFillAttendance: true,
        canViewReports: true, canDownloadReports: true, canViewAnalytics: true,
        canViewAuditLog: true,
        canManageSettings: true, canManageHRSettings: true, canManageDepartmentSettings: true, canManageLeaveTypeSettings: true, canManageHolidaySettings: true, canManageApprovalWorkflows: true, canManageCustomization: true,
        canManageAdmins: true, canCreateCustomRole: true, canEditCustomRole: true, canDeleteCustomRole: true,
      },
    },
    {
      slug: "hr-admin",
      name: "HR Admin",
      description: "People management, hiring, leave, documents, benefits, and disciplinary.",
      permissions: {
        canViewAllEmployees: true, canCreateEmployee: true, canEditEmployee: true, canDeleteEmployee: true, canApproveEmployee: true,
        canViewOffers: true, canManageOffers: true, canViewOrgChart: true,
        canViewCustomGroups: true, canManageCustomGroups: true,
        canViewPersonalDetails: true, canManageProfileRequests: true, canViewPersonalDocuments: true,
        canManageDepartments: true, canViewJobTitles: true, canManageJobTitles: true,
        canViewJobs: true, canCreateJob: true, canEditJob: true, canDeleteJob: true, canPostJob: true, canApproveJob: true, canViewApplicants: true, canManageHiringSettings: true,
        canViewAllLeave: true, canCreateLeave: true, canEditLeave: true, canDeleteLeave: true, canApproveLeave: true, canViewLeaveTypes: true, canManageLeaveTypes: true,
        canViewSurveys: true, canCreateSurvey: true, canEditSurvey: true, canDeleteSurvey: true,
        canViewDocuments: true, canManageDocuments: true, canRecallDocuments: true, canDeleteDocuments: true, canMakeOffers: true, canManageOfferTemplates: true,
        canViewBenefits: true, canManageBenefits: true,
        canViewDisciplinary: true, canManageViolations: true, canManagePolicies: true, canManageViolationTypes: true, canManageTriggers: true, canViewSuspensions: true, canManageSuspensions: true,
        canViewAnnouncements: true, canCreateAnnouncement: true, canEditAnnouncement: true, canDeleteAnnouncement: true, canManageAnnouncementGroups: true,
        canViewPerformance: true, canManageAppraisalCycles: true, canAssignReviewers: true, canCompileAppraisals: true,
        canViewInternReports: true, canReviewInternReports: true, canFillAttendance: true,
        canViewReports: true, canDownloadReports: true, canViewAnalytics: true,
        canManageSettings: true, canManageHRSettings: true, canManageDepartmentSettings: true, canManageLeaveTypeSettings: true, canManageHolidaySettings: true, canManageApprovalWorkflows: true,
      },
    },
    {
      slug: "time-leave-admin",
      name: "Time Tracking and Leave Admin",
      description: "Leave requests, leave types, and absence tracking.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true, canViewPersonalDetails: true,
        canViewAllLeave: true, canCreateLeave: true, canEditLeave: true, canDeleteLeave: true, canApproveLeave: true, canViewLeaveTypes: true, canManageLeaveTypes: true,
        canViewAbsences: true, canCreateAbsence: true, canEditAbsence: true, canDeleteAbsence: true, canReviewAbsence: true,
        canManageSettings: true,
      },
    },
    {
      slug: "benefits-admin",
      name: "Benefits Admin",
      description: "Benefits plans and employee enrollments.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true, canViewPersonalDetails: true,
        canViewBenefits: true, canManageBenefits: true,
      },
    },
    {
      slug: "it-admin",
      name: "IT Admin",
      description: "Assets, document management, and audit log access.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true, canViewPersonalDetails: true,
        canViewDocuments: true, canManageDocuments: true, canRecallDocuments: true, canDeleteDocuments: true,
        canViewAssets: true, canCreateAsset: true, canEditAsset: true, canDeleteAsset: true, canManageAssetAssignments: true,
        canViewAuditLog: true,
      },
    },
    {
      slug: "assets-admin",
      name: "Assets Admin",
      description: "Asset inventory and assignments.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true, canViewPersonalDetails: true,
        canViewAssets: true, canCreateAsset: true, canEditAsset: true, canDeleteAsset: true, canManageAssetAssignments: true,
      },
    },
    {
      slug: "performance-admin",
      name: "Performance Admin",
      description: "Performance cycles, objectives, groups, and reviews.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true, canViewPersonalDetails: true,
        canViewPerformance: true, canManageAppraisalCycles: true, canAssignReviewers: true, canCompileAppraisals: true,
        canViewReports: true, canDownloadReports: true, canViewAnalytics: true,
      },
    },
    {
      slug: "auditor",
      name: "Auditor",
      description: "Read-only access to audit logs, reports, and employee records.",
      permissions: {
        canViewAllEmployees: true, canViewOrgChart: true,
        canViewAuditLog: true,
        canViewReports: true, canDownloadReports: true,
      },
    },
  ]

  for (const r of SYSTEM_ROLES) {
    await prisma.adminRole.upsert({
      where:  { slug: r.slug },
      update: { name: r.name, description: r.description, permissions: r.permissions },
      create: { slug: r.slug, name: r.name, description: r.description, isSystem: true, permissions: r.permissions },
    })
  }
  console.log(`  ✓ ${SYSTEM_ROLES.length} system admin roles seeded`)

  // ── Job Titles ────────────────────────────────────────────────────────────────
  const JOB_TITLES = [
    "CEO/Founder",
    "Chief Finance Officer",
    "Executive Director, Talent & Process",
    "Director, AI Solutions Delivery",
    "AI/DPI Lead",
    "Data Analyst",
    "Data Analyst/Geospatial Lead",
    "Data Analyst/ML Engineer",
    "EqualyzAI AI Solutions",
    "Enterprise Technical Solutions/Products Consultant",
    "Northern Nigeria Technical Project Lead",
    "Quality Assurance Engineer",
    "Senior Quality Assurance Engineer",
    "Software Analyst",
    "System Support Analyst",
    "System Support/Admin Analyst",
    "Technical Delivery (Consultant) Lead",
    "Technical Delivery (Solutions and Training) Lead",
    "UI/UX Designer",
    "UI/UX Designer (Associate)",
    "Business Development Lead",
    "Community Project Analyst",
    "Product Lead",
    "Program Manager",
    "Programe Assistant",
    "Project Analyst",
    "Project Assistant",
    "Project Data Analyst",
    "Project/Delivery Coordinator",
    "Brand Analyst",
    "Content Creator and Social Media Manager",
    "Creative Analyst",
    "Admin/Executive Assistant",
    "Finance Officer",
    "HR Analyst",
    "HR Associate",
    "HR Intern",
    "Performance/HR Data Analyst",
    "Creative/HR Analyst",
    "Legal/Administrative Lead",
    "Admin Intern",
    "Finance Intern",
    "Legal Intern",
    "Intern",
  ]
  await prisma.jobTitle.createMany({
    data: JOB_TITLES.map(name => ({ name })),
    skipDuplicates: true,
  })
  console.log(`  ✓ ${JOB_TITLES.length} job titles seeded`)

  // ── Email Settings (disabled by default until email is configured) ────────────
  await prisma.emailSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      enabled: false,
      fromName: "DSN HRMS",
      fromEmail: process.env.EMAIL_FROM_ADDRESS ?? "noreply@hrms.dsnsandbox.com",
      eventToggles: {},
    },
  })
  console.log("  ✓ Email settings (disabled by default — enable via Settings → Customization)")

  // ── Email Templates ───────────────────────────────────────────────────────────
  let templateCount = 0
  for (const [eventKey, def] of Object.entries(EMAIL_EVENTS)) {
    await prisma.emailTemplate.upsert({
      where:  { eventKey },
      update: {},  // never overwrite customised templates
      create: {
        eventKey,
        name: def.name,
        subject: def.defaultSubject,
        body: def.defaultBody,
        variables: def.variables,
        isActive: true,
      },
    })
    templateCount++
  }
  console.log(`  ✓ ${templateCount} email templates seeded`)

  // ── Top-tier Managers (CEO + Executive Director) ─────────────────────────────
  // SUPER_ADMIN users with Employee + Manager records — they sit at the top of the
  // org hierarchy (managerId = null). PLs report to them via Employee.managerId.
  // The Manager table FK requires an Employee record — that's the only reason they
  // have one. They do NOT appear in the staff/PL employee directory.
  // mustChangePassword: true — they set their own password on first login.
  const managerSeeds = [
    { email: "olubayo@datasciencenigeria.ai", name: "Olubayo Adekanbi", fn: "Olubayo", ln: "Adekanbi", empId: "DSN-M001", title: "CEO/Founder",                          gender: "MALE"   },
    { email: "toyin@datasciencenigeria.ai",   name: "Toyin Adekanbi",   fn: "Toyin",   ln: "Adekanbi", empId: "DSN-M002", title: "Executive Director, Talent & Process", gender: "FEMALE" },
  ]
  for (const m of managerSeeds) {
    const u = await prisma.user.upsert({
      where:  { email: m.email },
      update: { role: "SUPER_ADMIN" as any, isSeeded: false },
      create: { name: m.name, email: m.email, password: hash("Welcome@DSN1"), role: "SUPER_ADMIN" as any, mustChangePassword: true, isSeeded: false },
    })
    const emp = await prisma.employee.upsert({
      where:  { userId: u.id },
      update: { jobTitle: m.title, employeeStatus: "ACTIVE", firstName: m.fn, lastName: m.ln },
      create: {
        userId: u.id, employeeId: m.empId,
        firstName: m.fn, lastName: m.ln, gender: m.gender as any,
        jobTitle: m.title, employmentType: "FULL_TIME", employeeStatus: "ACTIVE",
        managerId: null,
      },
    })
    await prisma.manager.upsert({
      where:  { employeeId: emp.id },
      update: { isSystem: true },
      create: { employeeId: emp.id, isSystem: true },
    })
  }
  console.log("  ✓ Top-tier managers (CEO: Olubayo Adekanbi, ED: Toyin Adekanbi)")

  // ── Announcements ─────────────────────────────────────────────────────────────
  const superAdminUser = await prisma.user.findUnique({ where: { email: "edodida@datasciencenigeria.ai" }, select: { id: true } })
  const annDefs = [
    { title: "Welcome to DSN HRMS",              body: "We're excited to launch the new DSN HR Management System! This platform will be your one-stop hub for leave requests, payslips, documents, performance reviews, and more.", behavior: "POPUP" as const,            targetRoles: [] as string[] },
    { title: "Q2 2026 Leave Reminder",           body: "Please ensure all annual leave requests for Q2 (April–June) are submitted by April 20, 2026.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: ["STAFF", "PROJECT_LEAD"] as string[] },
    { title: "Performance Review Cycle Open",    body: "The Q1 2026 performance review cycle is now open. All employees should complete their self-assessment by April 30, 2026.", behavior: "DASHBOARD_SCROLL" as const, targetRoles: [] as string[] },
    { title: "Public Holiday Notice — Workers' Day", body: "May 1, 2026 (Workers' Day) is a public holiday. All offices will be closed.", behavior: "NOTIFICATION_BAR" as const,  targetRoles: [] as string[] },
    { title: "New HR Policy: Remote Work Guidelines", body: "DSN has updated the Remote Work Policy effective May 1, 2026. Staff may work remotely up to 2 days per week with line manager approval.", behavior: "POPUP" as const, targetRoles: ["STAFF", "PROJECT_LEAD"] as string[] },
  ]
  if (superAdminUser) {
    for (const ann of annDefs) {
      const exists = await prisma.announcement.findFirst({ where: { title: ann.title } })
      if (!exists) await prisma.announcement.create({ data: { ...ann, type: "TEXT", status: "PUBLISHED", sendEmail: false, publishedAt: new Date(), createdById: superAdminUser.id } })
    }
    console.log("  ✓ Announcements")
  }

  // ── Company Details ───────────────────────────────────────────────────────────
  await prisma.systemSetting.upsert({
    where:  { key: "company_details" },
    update: {},
    create: { key: "company_details", value: { companyName: "Data Science Nigeria" } },
  })

  const existingWorkplace = await prisma.workplace.findFirst({ where: { displayName: "Data Science Nigeria" } })
  if (!existingWorkplace) {
    await prisma.workplace.create({
      data: {
        displayName:  "Data Science Nigeria",
        addressLine1: "33 Queen Street, Alagomeji-Yaba, Lagos",
        city:         "Yaba",
        state:        "Lagos",
        country:      "Nigeria",
        zipCode:      "11011",
        phone:        "08140000853",
        email:        "info@datasciencenigeria.ai",
        isActive:     true,
      },
    })
  }
  console.log("  ✓ Company details & workplace")

  // ── Test accounts — one per role, known passwords (all: Test@1234) ─────────
  {
    const testDept = await prisma.department.findFirst({ orderBy: { createdAt: "asc" } })
    const pw = hash("Test@1234")
    async function ensureTestUser(email: string, role: "SUPER_ADMIN" | "PROJECT_LEAD" | "STAFF", employeeCode: string, fn: string, ln: string, jobTitle: string, extra: Record<string, unknown> = {}) {
      const existing = await prisma.user.findUnique({ where: { email }, include: { employee: true } })
      if (existing?.employee) {
        // keep relationships fresh on reseed
        if (Object.keys(extra).length) await prisma.employee.update({ where: { id: existing.employee.id }, data: extra as any })
        return existing.employee
      }
      const user = existing ?? await prisma.user.create({ data: { email, name: `${fn} ${ln}`, password: pw, role, mustChangePassword: false } })
      return prisma.employee.create({
        data: {
          userId: user.id, employeeId: employeeCode, firstName: fn, lastName: ln, jobTitle,
          departmentId: testDept?.id ?? null, employmentType: "FULL_TIME", employeeStatus: "ACTIVE",
          hireDate: new Date(`${new Date().getFullYear() - 1}-01-15`), ...extra,
        },
      })
    }
    // Admin test login (in addition to the production edodida account)
    await ensureTestUser("admin@dsn-hrms.com", "SUPER_ADMIN", "TEST-ADMIN", "Test", "Admin", "HR Administrator")
    // Project lead — will be the primary reviewer for the test staff
    const leadEmp = await ensureTestUser("lead@dsn-hrms.com", "PROJECT_LEAD", "TEST-LEAD", "Test", "Lead", "Team Lead")
    // Staff — reviewed by the test lead (so the lead gets a "To Review" item and the staff can rate their lead)
    await ensureTestUser("staff@dsn-hrms.com", "STAFF", "TEST-STAFF", "Test", "Staff", "Officer", { projectLeadId: leadEmp.id })
    // A second staff in the same dept so peer pools are never empty
    await ensureTestUser("staff2@dsn-hrms.com", "STAFF", "TEST-STAFF2", "Sam", "Peer", "Officer", { projectLeadId: leadEmp.id })
    console.log("  ✓ Test accounts (admin/lead/staff/staff2 @dsn-hrms.com — Test@1234)")
  }

  // ── Active appraisal cycle (open) — generation is idempotent (tops up on reseed) ──
  {
    const year = new Date().getFullYear()
    const cycleName = `H1 ${year} Performance Appraisal`
    let cycle = await prisma.performanceCycle.findFirst({ where: { name: cycleName } })
    if (!cycle) {
      cycle = await prisma.performanceCycle.create({
        data: {
          name: cycleName, year, half: 1,
          startDate: new Date(`${year}-01-01`), endDate: new Date(`${year}-06-30`),
          kpiDeadline: new Date(`${year}-06-15`),
          isActive: true, stage: "OPEN", peerCount: 3,
          weights: DEFAULT_WEIGHTS as any,
          queryBands: DEFAULT_QUERY_BANDS as any,
          recommendationBands: DEFAULT_RECOMMENDATION_BANDS as any,
          questions: { create: defaultQuestions().map(q => ({ section: q.section as any, text: q.text, scaleMax: q.scaleMax, order: q.order, adminScored: q.adminScored ?? false })) },
          globalKpis: { create: DEFAULT_GLOBAL_KPIS.map((k, i) => ({ projectName: k.projectName, deliverable: k.deliverable, kpi: k.kpi, weight: k.weight, order: i })) },
        },
      })
      await prisma.performanceCycle.updateMany({ where: { isActive: true, id: { not: cycle.id } }, data: { isActive: false } })
    }

    // Top-up: one appraisal per active employee that doesn't have one yet
    // (primary reviewer = project lead / manager; inject the global KPI rows).
    const globalKpis = await prisma.appraisalGlobalKpi.findMany({ where: { cycleId: cycle.id }, orderBy: { order: "asc" } })
    const employees = await prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, projectLeadId: true, managerId: true } })
    const existing = new Set((await prisma.appraisal.findMany({ where: { cycleId: cycle.id }, select: { employeeId: true } })).map(a => a.employeeId))
    let created = 0
    for (const emp of employees) {
      if (existing.has(emp.id)) continue
      const primaryReviewerId = emp.projectLeadId ?? emp.managerId ?? null
      await prisma.appraisal.create({
        data: {
          cycleId: cycle.id, employeeId: emp.id, stage: "NOT_STARTED",
          kpis: { create: globalKpis.map(g => ({ projectName: g.projectName, deliverable: g.deliverable, kpi: g.kpi, weight: g.weight, source: "ADMIN" as const, order: g.order })) },
          ...(primaryReviewerId && primaryReviewerId !== emp.id ? { reviewers: { create: { reviewerId: primaryReviewerId, role: "PRIMARY" as const } } } : {}),
        },
      })
      created++
    }

    // Auto-assign peers from the same department (cross-dept fallback), up to peerCount each.
    const allActive = await prisma.employee.findMany({ where: { employeeStatus: "ACTIVE" }, select: { id: true, departmentId: true } })
    const subjectDept = new Map(allActive.map(e => [e.id, e.departmentId]))
    const appraisals = await prisma.appraisal.findMany({ where: { cycleId: cycle.id }, include: { reviewers: true, peers: true } })
    for (const a of appraisals) {
      if (a.peers.length >= (cycle.peerCount ?? 3)) continue
      const myDept = subjectDept.get(a.employeeId) ?? null
      const excluded = new Set<string>([a.employeeId, ...a.reviewers.map(r => r.reviewerId), ...a.peers.map(p => p.peerId)])
      const pool = allActive.filter(e => !excluded.has(e.id))
      const sameDept = pool.filter(e => myDept && e.departmentId === myDept).map(e => e.id)
      const others = pool.filter(e => !(myDept && e.departmentId === myDept)).map(e => e.id)
      const pick = [...sameDept, ...others].slice(0, (cycle.peerCount ?? 3) - a.peers.length)
      for (const peerId of pick) await prisma.appraisalPeer.create({ data: { appraisalId: a.id, peerId } })
    }
    console.log(`  ✓ Appraisal cycle "${cycleName}" (OPEN) — ${appraisals.length} appraisals (${created} new this run)`)
  }

  console.log("\n✅ Seed complete.")
  console.log("\n🔑 Test accounts (password for all: Test@1234):")
  console.log("   SUPER_ADMIN:   admin@dsn-hrms.com")
  console.log("   PROJECT_LEAD:  lead@dsn-hrms.com   (primary reviewer for the staff below)")
  console.log("   STAFF:         staff@dsn-hrms.com  (reviewed by lead@; can rate lead@)")
  console.log("   STAFF #2:      staff2@dsn-hrms.com")
  console.log("\n🔑 Production accounts:")
  console.log("   HRMS Admin:     edodida@datasciencenigeria.ai  /  Admin@DSN2024!  (SUPER_ADMIN)")
  console.log("   CEO:            olubayo@datasciencenigeria.ai  /  Welcome@DSN1   (SUPER_ADMIN — must change password on first login)")
  console.log("   Exec Director:  toyin@datasciencenigeria.ai    /  Welcome@DSN1   (SUPER_ADMIN — must change password on first login)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
