import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { format } from "date-fns"

// WAT = UTC+1
const WAT_OFFSET = 1 * 60 * 60 * 1000

function parseMinutes(raw: string): number {
  const s = raw.trim().toLowerCase()
  const colon = s.match(/^(\d+):(\d{1,2})$/)
  if (colon) return +colon[1] * 60 + +colon[2]
  const hm = s.match(/(\d+)\s*h(?:our|r)?s?\s*(?:(\d+)\s*m(?:in)?s?)?/)
  if (hm) return +hm[1] * 60 + (hm[2] ? +hm[2] : 0)
  const mOnly = s.match(/^(\d+)\s*m(?:in)?s?$/)
  if (mOnly) return +mOnly[1]
  return isNaN(+s) ? 0 : +s
}

// Compute hours for one category from new task-array format.
// cellEntries: { monday: [{text, minutes}, ...], tuesday: [...], ... }
// Returns { hours, untimedTask: true|false }
function computeCategoryHours(cellEntries: unknown): { hours: number; hasUntimed: boolean } {
  if (!cellEntries || typeof cellEntries !== "object" || Array.isArray(cellEntries)) {
    return { hours: 0, hasUntimed: false }
  }
  let totalMins = 0; let hasUntimed = false
  for (const rows of Object.values(cellEntries as Record<string, unknown>)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows as { text?: string; minutes?: string }[]) {
      if (!row.text?.trim()) continue
      const mins = parseMinutes(row.minutes ?? "")
      if (mins === 0) { hasUntimed = true; continue }
      totalMins += mins
    }
  }
  return { hours: totalMins / 60, hasUntimed }
}

function toWAT(date: Date): Date {
  return new Date(date.getTime() + WAT_OFFSET)
}

// Saturday/Sunday late deductions and the Monday missing-report deduction are always
// calendar-fixed — they never move even if "Submission Day" (window-open day) is reconfigured.
// Flat per-week deduction: -missingWeeklyDeduction on every Monday the report stays unsubmitted (no streak/escalation).
function missedMondaysCount(weekStart: Date, now: Date): number {
  const firstMissedMonday = new Date(weekStart)
  firstMissedMonday.setDate(weekStart.getDate() + 7)
  if (now.getTime() < firstMissedMonday.getTime()) return 0
  return Math.floor((now.getTime() - firstMissedMonday.getTime()) / (7 * 86400000)) + 1
}

function getWeekBounds(date: Date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d); monday.setDate(d.getDate() + diffToMonday)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)
  return { weekStart: monday, weekEnd: friday }
}

function computeScore(r: any): number {
  const tl = (r.productivityRating ?? 0) + (r.ldRating ?? 0) + (r.reflectionsRating ?? 0)
  const att = r.attendanceRating ?? 0
  return Math.max(0, tl + att - (r.pointDeduction ?? 0))
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const url = req.nextUrl
  const weekParam = url.searchParams.get("week")
  const empParam = url.searchParams.get("employeeId")

  let where: any = {}
  let isOwnReportsView = false
  const asReviewer = url.searchParams.get("asReviewer") === "1"

  if (asReviewer) {
    // Explicit reviewer-scoped request: always restrict to reports this person was
    // personally chosen to review, even if they separately hold canViewInternReports
    // (e.g. a PL or staff member with broader access). Otherwise that permission would
    // silently bypass the scope and leak every intern's submission status to them.
    where = {
      reviewers: { some: { reviewerEmployeeId: user.employeeId } },
      NOT: { employeeId: user.employeeId },
    }
  } else if (user.role === "STAFF" && !user.permissions?.["canViewInternReports"]) {
    // Interns (without elevated permission) see only their own reports
    where = { employeeId: user.employeeId }
    isOwnReportsView = true
  } else if (user.role === "PROJECT_LEAD" && !user.permissions?.["canViewInternReports"]) {
    // Project leads see reports of interns who report to them via the org chart,
    // PLUS any report where they were personally chosen as a reviewer — interns often
    // add their actual PL as an "extra reviewer" because Employee.projectLeadId/managerId
    // isn't populated for most interns, so the org-chart match alone misses them.
    const team = await prisma.employee.findMany({
      where: {
        OR: [{ managerId: user.employeeId }, { projectLeadId: user.employeeId }],
        jobTitle: { contains: "intern", mode: "insensitive" },
      },
      select: { id: true },
    })
    const teamIds = team.map(e => e.id)
    where = {
      OR: [
        { employeeId: { in: teamIds } },
        { reviewers: { some: { reviewerEmployeeId: user.employeeId } } },
      ],
    }
    // AND-in the employeeId filter rather than overwriting `where`, so a PL can't use
    // ?employeeId= to fetch a report outside their team/reviewer scope.
    if (empParam) where = { AND: [where, { employeeId: empParam }] }
  } else {
    // SUPER_ADMIN or has canViewInternReports permission — sees all
    if (empParam) where.employeeId = empParam
  }

  // Drafts are personal — only the intern who owns them sees their own draft.
  // Reviewers, PLs, and admins should never see a report until it's actually submitted.
  if (!isOwnReportsView) where.status = { not: "DRAFT" }

  if (weekParam) {
    const d = new Date(weekParam)
    const { weekStart } = getWeekBounds(d)
    where.weekStart = weekStart
  }

  const fromParam = url.searchParams.get("from")
  const toParam   = url.searchParams.get("to")
  if (!weekParam && fromParam) {
    where.weekStart = {
      gte: new Date(fromParam),
      ...(toParam ? { lte: new Date(toParam) } : {}),
    }
  }

  const reports = await prisma.internWeeklyReport.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true, department: { select: { name: true } } } },
      plReviewer: { select: { id: true, firstName: true, lastName: true } },
      attendanceFiller: { select: { id: true, firstName: true, lastName: true } },
      reviewers: {
        select: {
          id: true, reviewerEmployeeId: true, isPrimary: true, comment: true, reviewedAt: true,
          productivityRating: true, ldRating: true, reflectionsRating: true,
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ weekStart: "desc" }, { submittedAt: "asc" }],
  })

  return NextResponse.json({
    reports: reports.map(r => ({ ...r, totalScore: computeScore(r) })),
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== "STAFF") return forbidden("Only staff members can submit intern reports")

  // Verify this user is an intern
  const emp = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    select: { id: true, jobTitle: true, employmentType: true, firstName: true, lastName: true, projectLeadId: true, createdAt: true, internReportStartDate: true },
  })
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  const isIntern = (emp.jobTitle ?? "").toLowerCase().includes("intern") || emp.employmentType === "INTERN"
  if (!isIntern) return forbidden("Only interns can submit weekly reports")

  // Parse body up front so content validation (reflections) fires before time-window checks.
  const body = await req.json()
  const {
    personalReflection = "",
    taskDescriptions = {} as Record<string, unknown>,
    dailyReflections = {} as Record<string, string>,
    generalReflection = "",
    extraReviewerIds = [] as string[],
    weekNumber,
    isDraft = false,
  } = body

  // Compute hours from the task-array format (new) or fall back to client-sent hours (legacy).
  const CAT_KEYS = [
    "mainProject","specialProject","training","reportingDoc",
    "operational","research","meetings","community","representation","selfDev",
  ] as const
  const CAT_HOUR_KEYS: Record<string, string> = {
    mainProject: "mainProjectHours", specialProject: "specialProjectHours",
    training: "trainingHours", reportingDoc: "reportingDocHours",
    operational: "operationalHours", research: "researchHours",
    meetings: "meetingsHours", community: "communityHours",
    representation: "representationHours", selfDev: "selfDevHours",
  }
  const computedHours: Record<string, number> = {}
  let hasUntimedTasks = false
  for (const key of CAT_KEYS) {
    const cellEntries = taskDescriptions[key]
    // If the cell entries are arrays (new format), compute from minutes
    const isNewFormat = cellEntries && typeof cellEntries === "object" && !Array.isArray(cellEntries) &&
      Object.values(cellEntries as object).some(v => Array.isArray(v))
    if (isNewFormat) {
      const { hours, hasUntimed } = computeCategoryHours(cellEntries)
      computedHours[CAT_HOUR_KEYS[key]] = hours
      if (hasUntimed) hasUntimedTasks = true
    } else {
      // Legacy: use client-sent hours
      computedHours[CAT_HOUR_KEYS[key]] = Number(body[CAT_HOUR_KEYS[key]] ?? 0)
    }
  }

  if (hasUntimedTasks && !isDraft) {
    return NextResponse.json({ error: "Every filled task must have a time entry." }, { status: 400 })
  }

  const {
    mainProjectHours, specialProjectHours, trainingHours, reportingDocHours,
    operationalHours, researchHours, meetingsHours, communityHours,
    representationHours, selfDevHours,
  } = computedHours as Record<string, number>

  // Compute week bounds early — needed by both draft and submit paths.
  const nowWAT = toWAT(new Date())
  const { weekStart: currentWeekStart } = getWeekBounds(nowWAT)
  let ws: Date, we: Date
  if (body.weekStart) {
    const parsed = getWeekBounds(new Date(body.weekStart))
    ws = parsed.weekStart; we = parsed.weekEnd
  } else {
    ws = currentWeekStart
    const friday = new Date(ws); friday.setDate(ws.getDate() + 4)
    we = friday
  }

  // Check for existing report (shared by draft + submit paths)
  const existing = await prisma.internWeeklyReport.findFirst({
    where: { employeeId: emp.id, weekStart: ws },
  })
  if (existing && existing.status !== "DRAFT" && existing.status !== "MISSING") {
    return NextResponse.json({ error: "You have already submitted a report for this week." }, { status: 409 })
  }

  // Draft path — skip reflections, window, and hours-cap validation entirely
  if (isDraft) {
    const draftTotalHours = [
      mainProjectHours, specialProjectHours, trainingHours, reportingDocHours,
      operationalHours, researchHours, meetingsHours, communityHours,
      representationHours, selfDevHours,
    ].reduce((a, b) => a + Number(b), 0)
    const report = await prisma.internWeeklyReport.upsert({
      where: { employeeId_weekStart: { employeeId: emp.id, weekStart: ws } },
      create: {
        employeeId: emp.id, weekStart: ws, weekEnd: we,
        mainProjectHours: mainProjectHours ?? 0,
        specialProjectHours: specialProjectHours ?? 0,
        trainingHours: trainingHours ?? 0,
        reportingDocHours: reportingDocHours ?? 0,
        operationalHours: operationalHours ?? 0,
        researchHours: researchHours ?? 0,
        meetingsHours: meetingsHours ?? 0,
        communityHours: communityHours ?? 0,
        representationHours: representationHours ?? 0,
        selfDevHours: selfDevHours ?? 0,
        totalHours: draftTotalHours, personalReflection, taskDescriptions, dailyReflections, generalReflection,
        lateFlag: false, pointDeduction: 0, status: "DRAFT",
        weekNumber: typeof weekNumber === "number" ? weekNumber : null,
      },
      update: {
        mainProjectHours: mainProjectHours ?? 0,
        specialProjectHours: specialProjectHours ?? 0,
        trainingHours: trainingHours ?? 0,
        reportingDocHours: reportingDocHours ?? 0,
        operationalHours: operationalHours ?? 0,
        researchHours: researchHours ?? 0,
        meetingsHours: meetingsHours ?? 0,
        communityHours: communityHours ?? 0,
        representationHours: representationHours ?? 0,
        selfDevHours: selfDevHours ?? 0,
        totalHours: draftTotalHours, personalReflection, taskDescriptions, dailyReflections, generalReflection,
        status: "DRAFT",
        weekNumber: typeof weekNumber === "number" ? weekNumber : undefined,
      },
    })
    return NextResponse.json({ report }, { status: 200 })
  }

  // Compulsory: week number
  if (weekNumber === undefined || weekNumber === null || typeof weekNumber !== "number") {
    return NextResponse.json({ error: "Week number is required." }, { status: 400 })
  }

  // Compulsory: every Mon-Fri reflection must be non-empty after trim.
  const REFLECTION_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
  for (const key of REFLECTION_KEYS) {
    if (!dailyReflections?.[key] || dailyReflections[key].trim().length === 0) {
      return NextResponse.json({ error: `Daily reflection for ${key} is required.` }, { status: 400 })
    }
  }

  // Compulsory: general reflection
  if (!generalReflection || generalReflection.trim().length === 0) {
    return NextResponse.json({ error: "General reflection is required." }, { status: 400 })
  }

  // Load configurable submission window
  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  const submissionDay      = cfg?.submissionDay        ?? 5
  const openHour           = cfg?.openHour             ?? 16
  const openMinute         = cfg?.openMinute           ?? 0
  const lateHour           = cfg?.lateHour             ?? 20
  const lateMinute         = cfg?.lateMinute           ?? 0
  const lateDeductionSameDay = cfg?.lateDeductionSameDay ?? 1
  const lateDeductionSat   = cfg?.lateDeduction        ?? 2
  const lateDeductionSun   = cfg?.lateDeductionSunday  ?? 3
  const missingWeeklyDeduction = cfg?.missingWeeklyDeduction ?? 10

  const dayWAT = nowWAT.getDay()
  // Minute-of-day so the open/late cutoffs respect the configured minute, not just the hour
  // (e.g. a 13:50 late cutoff must not trip at 13:00).
  const minutesWAT = nowWAT.getHours() * 60 + nowWAT.getMinutes()
  const openThresholdMin = openHour * 60 + openMinute
  const lateThresholdMin = lateHour * 60 + lateMinute
  const pad2 = (n: number) => String(n).padStart(2, "0")

  const isPastWeek = ws.getTime() < currentWeekStart.getTime()

  // Eligibility starts from account creation, not hireDate
  const reportStartDate = emp.internReportStartDate ?? emp.createdAt
  const { weekStart: earliestWeekStart } = getWeekBounds(reportStartDate)
  if (ws.getTime() < earliestWeekStart.getTime()) {
    return NextResponse.json({ error: "You can't submit a report for a week before your reporting start date." }, { status: 400 })
  }

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const OPEN_DAY = submissionDay
  const isOpenDay = dayWAT === OPEN_DAY
  // TEMP TEST: late-deduction days shifted from Sat/Sun to Tue/Wed — revert to 6/0 when done testing
  const isSat = dayWAT === 2
  const isSun = dayWAT === 3

  const TESTING_ALWAYS_OPEN = false

  // Window check — skipped for past-week submissions
  if (!isPastWeek && !TESTING_ALWAYS_OPEN) {
    if (!isOpenDay && !isSat && !isSun) {
      return NextResponse.json({ error: `Submission window opens ${DAY_NAMES[OPEN_DAY]} at ${openHour}:${pad2(openMinute)} WAT and closes Sunday at 11:59 PM WAT.` }, { status: 400 })
    }
    if (isOpenDay && minutesWAT < openThresholdMin) {
      return NextResponse.json({ error: `Submission opens at ${openHour}:${pad2(openMinute)} WAT today.` }, { status: 400 })
    }
  }

  // Compute status + deduction
  let lateFlag = false
  let pointDeduction = 0
  let computedStatus: "SUBMITTED" | "LATE" = "SUBMITTED"

  if (isPastWeek) {
    lateFlag = true; computedStatus = "LATE"
    pointDeduction = missedMondaysCount(ws, nowWAT) * missingWeeklyDeduction
  } else if (isOpenDay && minutesWAT >= lateThresholdMin) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = lateDeductionSameDay
  } else if (isSat) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = lateDeductionSat
  } else if (isSun) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = lateDeductionSun
  }

  // Hours cap: base hard cap = 40h, reduced by 8h per public holiday in the week
  const totalHoursRaw = [
    mainProjectHours, specialProjectHours, trainingHours,
    reportingDocHours, operationalHours, researchHours,
    meetingsHours, communityHours, representationHours, selfDevHours,
  ].reduce((a, b) => a + Number(b), 0)

  const holidaysThisWeek = await prisma.publicHoliday.count({
    where: { date: { gte: ws, lte: we } },
  })
  const hardCap = Math.max(0, 40 - holidaysThisWeek * 8)

  if (totalHoursRaw > hardCap) {
    return NextResponse.json({
      error: `Total hours (${totalHoursRaw.toFixed(1)}h) exceed the weekly limit of ${hardCap}h${holidaysThisWeek > 0 ? ` (adjusted for ${holidaysThisWeek} public holiday${holidaysThisWeek > 1 ? "s" : ""} this week)` : ""}.`,
    }, { status: 400 })
  }

  const totalHours = totalHoursRaw

  const isNew = !existing
  const report = await prisma.internWeeklyReport.upsert({
    where: { employeeId_weekStart: { employeeId: emp.id, weekStart: ws } },
    create: {
      employeeId: emp.id, weekStart: ws, weekEnd: we,
      mainProjectHours, specialProjectHours, trainingHours,
      reportingDocHours, operationalHours, researchHours,
      meetingsHours, communityHours, representationHours, selfDevHours,
      totalHours, personalReflection, taskDescriptions, dailyReflections, generalReflection,
      submittedAt: new Date(), lateFlag,
      pointDeduction,
      status: computedStatus,
      weekNumber: typeof weekNumber === "number" ? weekNumber : null,
    },
    update: {
      mainProjectHours, specialProjectHours, trainingHours,
      reportingDocHours, operationalHours, researchHours,
      meetingsHours, communityHours, representationHours, selfDevHours,
      totalHours, personalReflection, taskDescriptions, dailyReflections, generalReflection,
      submittedAt: new Date(), lateFlag,
      pointDeduction,
      status: computedStatus,
      weekNumber: typeof weekNumber === "number" ? weekNumber : undefined,
    },
  })

  await logAudit({
    req, actor: user,
    action: isNew ? "INTERN_REPORT_SUBMIT" : "INTERN_REPORT_RESUBMIT",
    entity: "InternWeeklyReport", entityId: report.id,
    targetUserId: user.id,
    newValues: { weekStart: ws, weekEnd: we, totalHours, status: report.status, lateFlag },
  })

  // Create InternReportReviewer records
  if (emp.projectLeadId) {
    await prisma.internReportReviewer.upsert({
      where: { reportId_reviewerEmployeeId: { reportId: report.id, reviewerEmployeeId: emp.projectLeadId } },
      create: { reportId: report.id, reviewerEmployeeId: emp.projectLeadId, isPrimary: true },
      update: {},
    }).catch(() => {})
  }
  for (const revId of (extraReviewerIds as string[])) {
    if (revId && revId !== emp.projectLeadId) {
      await prisma.internReportReviewer.upsert({
        where: { reportId_reviewerEmployeeId: { reportId: report.id, reviewerEmployeeId: revId } },
        create: { reportId: report.id, reviewerEmployeeId: revId, isPrimary: false },
        update: {},
      }).catch(() => {})
    }
  }

  // Notification copy
  const internName = `${emp.firstName} ${emp.lastName}`

  // Notify ALL assigned reviewers (primary PL + extras) with in-app notification
  const weekRange = `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`
  const reviewLink = `${process.env.NEXTAUTH_URL ?? ""}/project-lead/intern-reports`

  // Collect all reviewer employee IDs: primary PL + extras
  const allReviewerEmpIds = [
    emp.projectLeadId,
    ...(extraReviewerIds as string[]).filter(id => id && id !== emp.projectLeadId),
  ].filter(Boolean) as string[]

  for (const revEmpId of allReviewerEmpIds) {
    const revEmp = await prisma.employee.findUnique({
      where: { id: revEmpId },
      select: { userId: true, firstName: true, lastName: true },
    })
    if (!revEmp?.userId) continue

    const isPrimaryPL = revEmpId === emp.projectLeadId
    const notifLink = isPrimaryPL ? "/project-lead/intern-reports" : "/staff/intern-reviews"

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: revEmp.userId,
        title: "Intern Weekly Report Submitted",
        message: `${internName} submitted their weekly report for ${weekRange}.${lateFlag ? " (Late submission)" : ""} Please fill your feedback.`,
        type: lateFlag ? "WARNING" : "INFO",
        link: notifLink,
      },
    }).catch(() => {})

  }

  // Notify admins who can fill attendance (SUPER_ADMIN or canFillAttendance permission)
  const alreadyNotifiedUserIds = new Set(
    (await prisma.employee.findMany({
      where: { id: { in: allReviewerEmpIds } },
      select: { userId: true },
    })).map(e => e.userId).filter(Boolean) as string[]
  )

  const superAdmins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } })
  const permUsers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE permissions->>'canFillAttendance' = 'true'
  `
  const attendanceAdminIds = new Set([...superAdmins.map(u => u.id), ...permUsers.map(u => u.id)])

  for (const adminId of attendanceAdminIds) {
    if (alreadyNotifiedUserIds.has(adminId)) continue
    await prisma.notification.create({
      data: {
        userId: adminId,
        title: "Intern Weekly Report Submitted",
        message: `${internName} submitted their weekly report for ${weekRange}.${lateFlag ? " (Late submission)" : ""} Please fill their attendance`,
        type: lateFlag ? "WARNING" : "INFO",
        link: "/admin/reports/intern-reports",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ report }, { status: 201 })
}
