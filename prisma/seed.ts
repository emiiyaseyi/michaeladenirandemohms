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
import { EMAIL_EVENTS } from "../src/lib/email-events"

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

  // ── Leave Types (DSN policy) ────────────────────────────────────────────────
  // All re-seeds also refresh the policy fields so existing rows can't drift.
  const leavePolicy = {
    annual:        { name: "Annual Leave",        description: "Standard annual leave",                                          defaultDays: 10, minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    sick:          { name: "Sick Leave",          description: "Medical leave — align with your Project Lead.",                  defaultDays: 5,  minNoticeDays: 0,  requiresDoc: true,  minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    compassionate: { name: "Compassionate Leave", description: "Bereavement / family emergency — align with your Project Lead.", defaultDays: 5,  minNoticeDays: 0,  requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: null,              excludeWeekends: true,  isActive: true },
    maternity:     { name: "Maternity Leave",     description: "Maternity leave for expectant mothers.",                         defaultDays: 90, minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: "FEMALE" as const, excludeWeekends: true,  isActive: true },
    paternity:     { name: "Paternity Leave",     description: "Paternity leave for new fathers.",                               defaultDays: 5,  minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: false, genderSpecific: "MALE" as const,   excludeWeekends: true,  isActive: true },
    casual:        { name: "Casual Leave",        description: "Casual leave (interns only).",                                   defaultDays: 5,  minNoticeDays: 10, requiresDoc: false, minDocDays: 2, internOnly: true,  genderSpecific: null,              excludeWeekends: true,  isActive: true },
  }

  await Promise.all(Object.values(leavePolicy).map(p =>
    prisma.leaveType.upsert({
      where:  { name: p.name },
      update: p,
      create: p,
    })
  ))

  // One-time cleanup of legacy leave types no longer offered by DSN.
  // "Study Leave" is hard-deleted along with any historical requests/balances (org decision).
  // Other legacy types: hard-delete if no leave requests still reference them, else soft-disable as a fallback.
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

  // ── Request Document Types (starter set; admins can add more from the UI) ────
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
    const hashed = await bcrypt.hash("Admin@DSN2024!", 12)
    await prisma.user.upsert({
      where:  { email: "edodida@datasciencenigeria.ai" },
      update: { role: "SUPER_ADMIN" as any, mustChangePassword: false, isSeeded: true },
      create: { name: "HR Admin", email: "edodida@datasciencenigeria.ai", password: hashed, role: "SUPER_ADMIN" as any, mustChangePassword: false, isSeeded: true },
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
        canViewPerformance: true, canManagePerformancePeriods: true, canManageObjectives: true, canManageGroups: true, canManageReviews: true, canViewFeedback: true, canManageConversations: true,
        canViewAbsences: true, canCreateAbsence: true, canEditAbsence: true, canDeleteAbsence: true, canReviewAbsence: true,
        canViewDisciplinary: true, canManageViolations: true, canManagePolicies: true, canManageViolationTypes: true, canManageTriggers: true, canViewSuspensions: true, canManageSuspensions: true,
        canViewAnnouncements: true, canCreateAnnouncement: true, canEditAnnouncement: true, canDeleteAnnouncement: true, canManageAnnouncementGroups: true,
        canViewAssets: true, canCreateAsset: true, canEditAsset: true, canDeleteAsset: true, canManageAssetAssignments: true,
        canViewContractors: true, canManageContractors: true,
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
        canViewContractors: true, canManageContractors: true,
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
        canViewPerformance: true, canManagePerformancePeriods: true, canManageObjectives: true, canManageGroups: true, canManageReviews: true, canViewFeedback: true, canManageConversations: true,
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
    // Leadership & Executive
    "CEO/Founder",
    "Chief Finance Officer",
    "Executive Director, Talent & Process",
    "Director, AI Solutions Delivery",
    // Technology & Engineering
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
    // Programs & Delivery
    "Business Development Lead",
    "Community Project Analyst",
    "Product Lead",
    "Program Manager",
    "Programe Assistant",
    "Project Analyst",
    "Project Assistant",
    "Project Data Analyst",
    "Project/Delivery Coordinator",
    // Creative & Brand
    "Brand Analyst",
    "Content Creator and Social Media Manager",
    "Creative Analyst",
    // Operations & Administration
    "Admin/Executive Assistant",
    "Finance Officer",
    "HR Analyst",
    "Legal/Administrative Lead",
    // Interns
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

  // ── Email Settings (disabled by default until email is configured) ──────────
  await prisma.emailSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      enabled: false,
      fromName: "DSN HRMS",
      fromEmail: "noreply@hrms.dsnsandbox.com",
      eventToggles: {},
    },
  })
  console.log("  ✓ Email settings (defaults, disabled until configured)")

  // ── Email Templates (seed defaults, inactive by default until email is configured) ──
  let templateCount = 0
  for (const [eventKey, def] of Object.entries(EMAIL_EVENTS)) {
    await prisma.emailTemplate.upsert({
      where: { eventKey },
      update: {}, // never overwrite customised templates
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
  console.log(`  ✓ ${templateCount} email templates seeded (defaults, isActive=true)`)

  // Resolve IDs for elevation assignments in demo data
  const hrAdminRole = await prisma.adminRole.findUnique({ where: { slug: "hr-admin" } })

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

  // Quick-login demo accounts (2 elevated admin + 2 staff + 2 project leads + 1 intern)
  // The intern entry uses jobTitle that includes "Intern" so the session's isIntern flag is true.
  const demoStaffs = [
    { email: "staff1@dsn-hrms.com",  name: "Admin 1",  empId: "DSN-D001", fn: "Admin",  ln: "1", title: "HR Manager",        dept: adminFacility, gender: "FEMALE", dob: "1992-03-10", salary: 480000, role: "STAFF", elevate: true,  isIntern: false },
    { email: "staff3@dsn-hrms.com",  name: "Staff 1",  empId: "DSN-D003", fn: "Staff",  ln: "1", title: "Data Analyst",      dept: equalyzai,     gender: "FEMALE", dob: "1996-01-15", salary: 360000, role: "STAFF", elevate: false, isIntern: false },
    { email: "staff4@dsn-hrms.com",  name: "Staff 2",  empId: "DSN-D004", fn: "Staff",  ln: "2", title: "Finance Officer",   dept: finance,       gender: "MALE",   dob: "1991-09-05", salary: 390000, role: "STAFF", elevate: false, isIntern: false },
    { email: "intern1@datasciencenigeria.ai", name: "Intern 1", empId: "DSN-D007", fn: "Intern", ln: "1", title: "Data Science Intern", dept: equalyzai, gender: "FEMALE", dob: "2002-04-12", salary: 100000, role: "STAFF", elevate: false, isIntern: true  },
  ]
  const demoEmpIds: Record<string, string> = {}
  for (const s of demoStaffs) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { mustChangePassword: false, password: hash("dsn-demo"), role: "STAFF" as any, isSeeded: true },
      create: { name: s.name, email: s.email, password: hash("dsn-demo"), role: "STAFF" as any, mustChangePassword: false, isSeeded: true },
    })
    const emp = await prisma.employee.upsert({
      where: { userId: u.id },
      update: { dateOfBirth: new Date(s.dob) },
      create: { userId: u.id, employeeId: s.empId, firstName: s.fn, lastName: s.ln, jobTitle: s.title, departmentId: s.dept?.id ?? null, employeeStatus: "ACTIVE", employmentType: s.isIntern ? "INTERN" : "FULL_TIME", hireDate: new Date("2024-01-01"), gender: s.gender as any, dateOfBirth: new Date(s.dob) },
    })
    demoEmpIds[s.email] = emp.id
    if (s.elevate && hrAdminRole) {
      await prisma.userAdminRole.upsert({
        where: { userId_adminRoleId: { userId: u.id, adminRoleId: hrAdminRole.id } },
        update: {},
        create: { userId: u.id, adminRoleId: hrAdminRole.id },
      })
    }
  }

  // PROJECT_LEAD demo accounts
  const demoPLs = [
    { email: "lead1@dsn-hrms.com", name: "Lead 1", empId: "DSN-D005", fn: "Lead", ln: "1", title: "Team Lead — Technology",   dept: equalyzai,     gender: "MALE",   dob: "1990-06-15", salary: 550000, deptIds: [equalyzai?.id, techDelivery?.id].filter(Boolean) as string[] },
    { email: "lead2@dsn-hrms.com", name: "Lead 2", empId: "DSN-D006", fn: "Lead", ln: "2", title: "Team Lead — Operations",   dept: adminFacility, gender: "FEMALE", dob: "1993-09-20", salary: 520000, deptIds: [adminFacility?.id, finance?.id].filter(Boolean) as string[] },
  ]
  const demoPLEmpIds: Record<string, string> = {}
  const demoPLUserIds: Record<string, string> = {}
  for (const pl of demoPLs) {
    const u = await prisma.user.upsert({
      where: { email: pl.email },
      update: { mustChangePassword: false, password: hash("dsn-demo"), role: "PROJECT_LEAD" as any, isSeeded: true },
      create: { name: pl.name, email: pl.email, password: hash("dsn-demo"), role: "PROJECT_LEAD" as any, mustChangePassword: false, isSeeded: true },
    })
    demoPLUserIds[pl.email] = u.id
    const emp = await prisma.employee.upsert({
      where: { userId: u.id },
      update: { dateOfBirth: new Date(pl.dob) },
      create: { userId: u.id, employeeId: pl.empId, firstName: pl.fn, lastName: pl.ln, jobTitle: pl.title, departmentId: pl.dept?.id ?? null, employeeStatus: "ACTIVE", employmentType: "FULL_TIME", hireDate: new Date("2024-01-01"), gender: pl.gender as any, dateOfBirth: new Date(pl.dob) },
    })
    demoPLEmpIds[pl.email] = emp.id
    // Assign departments
    for (const deptId of pl.deptIds) {
      await prisma.projectLeadDepartment.upsert({
        where: { userId_departmentId: { userId: u.id, departmentId: deptId } },
        update: {},
        create: { userId: u.id, departmentId: deptId },
      })
    }
  }
  console.log("  ✓ Demo accounts (admin, staff, project lead)")

  // ── MANAGERS ──────────────────────────────────────────────────────────────────
  // REPLACE placeholder emails and names with real ones before prod deployment.
  // Until provisioned: log in as the super admin and update via /admin/people/employees.
  // Manager 1 = CEO (male) | Manager 2 = Executive Director (female)
  // Both are SUPER_ADMIN so they have full admin access without a staff/PL panel switcher.
  const managerSeeds = [
    { email: "manager1@datasciencenigeria.ai", name: "Manager One", fn: "Manager", ln: "One", empId: "DSN-M001", title: "CEO/Founder",                          gender: "MALE",   dob: "1980-01-01", hire: "2020-01-01" },
    { email: "manager2@datasciencenigeria.ai", name: "Manager Two", fn: "Manager", ln: "Two", empId: "DSN-M002", title: "Executive Director, Talent & Process", gender: "FEMALE", dob: "1982-01-01", hire: "2020-01-01" },
  ]
  const managerEmpIds: Record<string, string> = {}
  for (const m of managerSeeds) {
    const u = await prisma.user.upsert({
      where:  { email: m.email },
      update: { role: "SUPER_ADMIN" as any, isSeeded: true },
      create: { name: m.name, email: m.email, password: hash("Welcome@DSN1"), role: "SUPER_ADMIN" as any, mustChangePassword: true, isSeeded: true },
    })
    const emp = await prisma.employee.upsert({
      where:  { userId: u.id },
      update: { jobTitle: m.title, employeeStatus: "ACTIVE" },
      create: {
        userId: u.id, employeeId: m.empId,
        firstName: m.fn, lastName: m.ln, gender: m.gender as any,
        jobTitle: m.title, employmentType: "FULL_TIME", employeeStatus: "ACTIVE",
        hireDate: new Date(m.hire), dateOfBirth: new Date(m.dob),
        managerId: null,  // top of the tree
      },
    })
    managerEmpIds[m.email] = emp.id
    // Manager-table row (isSystem: true → protected from deletion in the UI)
    await prisma.manager.upsert({
      where:  { employeeId: emp.id },
      update: { isSystem: true },
      create: { employeeId: emp.id, isSystem: true },
    })
  }
  const manager1EmpId = managerEmpIds["manager1@datasciencenigeria.ai"]
  const manager2EmpId = managerEmpIds["manager2@datasciencenigeria.ai"]
  console.log("  ✓ Seeded managers (CEO + Executive Director, SUPER_ADMIN, Manager rows isSystem: true)")

  // Reparent demo PLs so they sit under the new top tier
  if (manager1EmpId && demoPLEmpIds["lead1@dsn-hrms.com"]) {
    await prisma.employee.update({ where: { id: demoPLEmpIds["lead1@dsn-hrms.com"] }, data: { managerId: manager1EmpId } })
  }
  if (manager2EmpId && demoPLEmpIds["lead2@dsn-hrms.com"]) {
    await prisma.employee.update({ where: { id: demoPLEmpIds["lead2@dsn-hrms.com"] }, data: { managerId: manager2EmpId } })
  }
  console.log("  ✓ Reparented demo PLs (lead1 → Manager 1, lead2 → Manager 2)")

  // 12 sample employees
  const samples = [
    { name: "Emeka Okonkwo",   email: "emeka.okonkwo@datasciencenigeria.ai",   gender: "MALE",   title: "Senior Data Scientist",       dept: equalyzai!.id,        type: "FULL_TIME", hire: "2022-05-10", dob: "1990-05-14", role: "STAFF", elevate: true },
    { name: "Fatima Musa",     email: "fatima.musa@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Analyst",                dept: equalyzai!.id,        type: "FULL_TIME", hire: "2023-01-15", dob: "1996-06-02", role: "STAFF", elevate: false },
    { name: "Chidi Nwosu",     email: "chidi.nwosu@datasciencenigeria.ai",     gender: "MALE",   title: "Software Engineer",           dept: techDelivery!.id,     type: "FULL_TIME", hire: "2022-08-22", dob: "1993-08-30", role: "STAFF", elevate: true },
    { name: "Ngozi Eze",       email: "ngozi.eze@datasciencenigeria.ai",       gender: "FEMALE", title: "Product Designer",            dept: productDesign!.id,    type: "FULL_TIME", hire: "2023-03-01", dob: "1994-07-19", role: "STAFF", elevate: true },
    { name: "Tunde Adeyemi",   email: "tunde.adeyemi@datasciencenigeria.ai",   gender: "MALE",   title: "Programs Lead",               dept: solutionDelivery!.id, type: "FULL_TIME", hire: "2021-11-05", dob: "1988-04-25", role: "STAFF", elevate: true },
    { name: "Blessing Okafor", email: "blessing.okafor@datasciencenigeria.ai", gender: "FEMALE", title: "Brand & Comms Manager",       dept: brandComms!.id,       type: "FULL_TIME", hire: "2022-02-14", dob: "1991-05-08", role: "STAFF", elevate: true },
    { name: "Ibrahim Sule",    email: "ibrahim.sule@datasciencenigeria.ai",    gender: "MALE",   title: "Finance Officer",             dept: finance!.id,          type: "FULL_TIME", hire: "2022-07-18", dob: "1992-06-17", role: "STAFF", elevate: false },
    { name: "Aisha Garba",     email: "aisha.garba@datasciencenigeria.ai",     gender: "FEMALE", title: "Data Engineer",               dept: equalyzai!.id,        type: "FULL_TIME", hire: "2023-06-01", dob: "1997-05-21", role: "STAFF", elevate: false },
    { name: "Kelechi Ibe",     email: "kelechi.ibe@datasciencenigeria.ai",     gender: "MALE",   title: "Frontend Engineer",           dept: techDelivery!.id,     type: "FULL_TIME", hire: "2023-09-11", dob: "1998-07-03", role: "STAFF", elevate: false },
    { name: "Zainab Hassan",   email: "zainab.hassan@datasciencenigeria.ai",   gender: "FEMALE", title: "Data Science Intern",         dept: equalyzai!.id,        type: "INTERN",    hire: "2024-01-08", dob: "2001-06-11", role: "STAFF", elevate: false },
    { name: "Olumide Adewale", email: "olumide.adewale@datasciencenigeria.ai", gender: "MALE",   title: "Backend Engineer",            dept: techDelivery!.id,     type: "FULL_TIME", hire: "2022-04-20", dob: "1993-04-28", role: "STAFF", elevate: false },
    { name: "Grace Okeke",     email: "grace.okeke@datasciencenigeria.ai",     gender: "FEMALE", title: "Business Development Officer",dept: bizDev!.id,           type: "CONTRACT",  hire: "2023-11-01", dob: "1995-05-30", role: "STAFF", elevate: false },
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
      update: { role: s.role as any, mustChangePassword: false, isSeeded: true },
      create: { name: s.name, email: s.email, password: defaultPwd, role: s.role as any, mustChangePassword: false, isSeeded: true },
    })
    const existingEmp = await prisma.employee.findFirst({ where: { userId: u.id } })
    let emp: any
    if (existingEmp) {
      emp = await prisma.employee.update({ where: { id: existingEmp.id }, data: { jobTitle: s.title, departmentId: s.dept, dateOfBirth: new Date(s.dob) } })
    } else {
      counter++
      emp = await prisma.employee.upsert({
        where: { userId: u.id },
        update: { dateOfBirth: new Date(s.dob) },
        create: { userId: u.id, employeeId: `DSN-${String(counter).padStart(4, "0")}`, firstName: fn, lastName: ln.join(" "), gender: s.gender as any, jobTitle: s.title, departmentId: s.dept, employmentType: s.type as any, employeeStatus: "ACTIVE", hireDate: new Date(s.hire), dateOfBirth: new Date(s.dob) },
      })
    }
    empRecords[s.email] = emp
  }
  console.log("  ✓ Sample employees")

  // Elevate sample employees that have elevate: true to hr-admin
  if (hrAdminRole) {
    for (const s of samples.filter(s => s.elevate)) {
      const u = await prisma.user.findUnique({ where: { email: s.email }, select: { id: true } })
      if (u) {
        await prisma.userAdminRole.upsert({
          where: { userId_adminRoleId: { userId: u.id, adminRoleId: hrAdminRole.id } },
          update: {}, create: { userId: u.id, adminRoleId: hrAdminRole.id },
        })
      }
    }
  }

  // Manager / dept lead relationships
  const emeka = empRecords["emeka.okonkwo@datasciencenigeria.ai"]
  const chidi = empRecords["chidi.nwosu@datasciencenigeria.ai"]
  const blessing = empRecords["blessing.okafor@datasciencenigeria.ai"]
  await Promise.all([
    prisma.employee.update({ where: { id: empRecords["fatima.musa@datasciencenigeria.ai"]?.id },    data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["aisha.garba@datasciencenigeria.ai"]?.id },    data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["zainab.hassan@datasciencenigeria.ai"]?.id },  data: { managerId: emeka?.id, projectLeadId: emeka?.id } }),
    prisma.employee.update({ where: { id: empRecords["kelechi.ibe@datasciencenigeria.ai"]?.id },    data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["olumide.adewale@datasciencenigeria.ai"]?.id },data: { managerId: chidi?.id, projectLeadId: chidi?.id } }),
    prisma.employee.update({ where: { id: empRecords["grace.okeke@datasciencenigeria.ai"]?.id },    data: { managerId: blessing?.id } }),
  ])

  // Intern demo account reports to lead1 (PL of EqualyzAI)
  const intern1EmpId = demoEmpIds["intern1@datasciencenigeria.ai"]
  const lead1EmpId = demoPLEmpIds["lead1@dsn-hrms.com"]
  if (intern1EmpId && lead1EmpId) {
    await prisma.employee.update({
      where: { id: intern1EmpId },
      data: { managerId: lead1EmpId, projectLeadId: lead1EmpId },
    })
  }

  // Backfill EmployeeDepartment junction rows for everyone with a primary departmentId
  const allEmployeesWithDept = await prisma.employee.findMany({
    where: { departmentId: { not: null } },
    select: { id: true, departmentId: true },
  })
  for (const e of allEmployeesWithDept) {
    if (!e.departmentId) continue
    await prisma.employeeDepartment.upsert({
      where: { employeeId_departmentId: { employeeId: e.id, departmentId: e.departmentId } },
      update: { isPrimary: true },
      create: { employeeId: e.id, departmentId: e.departmentId, isPrimary: true },
    })
  }
  console.log(`  ✓ EmployeeDepartment backfill (${allEmployeesWithDept.length} rows)`)

  // Department leads — point each demo dept at the right PL
  const lead1Emp = demoPLEmpIds["lead1@dsn-hrms.com"]
  const lead2Emp = demoPLEmpIds["lead2@dsn-hrms.com"]
  if (equalyzai && lead1Emp)        await prisma.department.update({ where: { id: equalyzai.id },        data: { leadEmployeeId: lead1Emp } })
  if (techDelivery && lead1Emp)     await prisma.department.update({ where: { id: techDelivery.id },     data: { leadEmployeeId: lead1Emp } })
  if (adminFacility && lead2Emp)    await prisma.department.update({ where: { id: adminFacility.id },    data: { leadEmployeeId: lead2Emp } })
  if (finance && lead2Emp)          await prisma.department.update({ where: { id: finance.id },          data: { leadEmployeeId: lead2Emp } })
  console.log("  ✓ Department leads assigned")

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

  // Leave balances — all employees including demo accounts
  const annualLeave = await prisma.leaveType.findFirst({ where: { name: "Annual Leave" } })
  const sickLeave   = await prisma.leaveType.findFirst({ where: { name: "Sick Leave" } })
  const allEmpIds = [
    ...Object.values(empRecords).filter(Boolean).map((e: any) => e.id as string),
    ...Object.values(demoEmpIds),
    ...Object.values(demoPLEmpIds),
  ]
  for (const empId of allEmpIds) {
    if (annualLeave) await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: empId, leaveTypeId: annualLeave.id, year: 2026 } }, update: {}, create: { employeeId: empId, leaveTypeId: annualLeave.id, year: 2026, allocated: 21, used: 0, pending: 0 } })
    if (sickLeave)   await prisma.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: empId, leaveTypeId: sickLeave.id,   year: 2026 } }, update: {}, create: { employeeId: empId, leaveTypeId: sickLeave.id,   year: 2026, allocated: 14, used: 0, pending: 0 } })
  }
  console.log("  ✓ Leave balances")

  // Announcements
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
    create: {
      key:   "company_details",
      value: { companyName: "Data Science Nigeria" },
    },
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

  console.log("\n✅ Demo data complete.")
  console.log("\n🔑 Demo login accounts:")
  console.log("   HR Admin:  edodida@datasciencenigeria.ai     /  Admin@DSN2024!  (SUPER_ADMIN)")
  console.log("   Manager 1: manager1@datasciencenigeria.ai    /  Welcome@DSN1    (SUPER_ADMIN — CEO, mustChange on first login)")
  console.log("   Manager 2: manager2@datasciencenigeria.ai    /  Welcome@DSN1    (SUPER_ADMIN — Executive Director, mustChange)")
  console.log("   Admin 1:   staff1@dsn-hrms.com               /  dsn-demo        (STAFF + HR Admin role — elevated)")
  console.log("   Staff 1:   staff3@dsn-hrms.com               /  dsn-demo        (plain STAFF)")
  console.log("   Staff 2:   staff4@dsn-hrms.com               /  dsn-demo        (plain STAFF)")
  console.log("   Lead 1:    lead1@dsn-hrms.com                /  dsn-demo        (PROJECT_LEAD — EqualyzAI + Tech Delivery, reports to Manager 1)")
  console.log("   Lead 2:    lead2@dsn-hrms.com                /  dsn-demo        (PROJECT_LEAD — Admin & Facility + Finance, reports to Manager 2)")
  console.log("   Intern 1:  intern1@datasciencenigeria.ai     /  dsn-demo        (STAFF + INTERN — reports to lead1)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

 