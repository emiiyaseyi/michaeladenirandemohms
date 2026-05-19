import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { format } from "date-fns"
import { sendEmail } from "@/lib/email"
import { generateInternReportXlsx } from "@/lib/intern-report-xlsx"

// WAT = UTC+1
const WAT_OFFSET = 1 * 60 * 60 * 1000

function toWAT(date: Date): Date {
  return new Date(date.getTime() + WAT_OFFSET)
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

  if (user.role === "STAFF" && !user.permissions?.["canViewInternReports"]) {
    const asReviewer = url.searchParams.get("asReviewer") === "1"
    if (asReviewer) {
      // Return reports this staff member has been assigned to review (not their own)
      where = {
        reviewers: { some: { reviewerEmployeeId: user.employeeId } },
        NOT: { employeeId: user.employeeId },
      }
    } else {
      // Interns (without elevated permission) see only their own reports
      where = { employeeId: user.employeeId }
    }
  } else if (user.role === "PROJECT_LEAD" && !user.permissions?.["canViewInternReports"]) {
    // Project leads see reports of interns who report to them
    const team = await prisma.employee.findMany({
      where: {
        OR: [{ managerId: user.employeeId }, { projectLeadId: user.employeeId }],
        jobTitle: { contains: "intern", mode: "insensitive" },
      },
      select: { id: true },
    })
    const teamIds = team.map(e => e.id)
    where = { employeeId: { in: teamIds } }
    if (empParam) where.employeeId = empParam
  } else {
    // SUPER_ADMIN or has canViewInternReports permission — sees all
    if (empParam) where.employeeId = empParam
  }

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
      tlReviewer: { select: { id: true, firstName: true, lastName: true } },
      attendanceFiller: { select: { id: true, firstName: true, lastName: true } },
      reviewers: {
        select: {
          id: true, reviewerEmployeeId: true, isPrimary: true, comment: true, reviewedAt: true,
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
    select: { id: true, jobTitle: true, firstName: true, lastName: true, projectLeadId: true },
  })
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  const isIntern = (emp.jobTitle ?? "").toLowerCase().includes("intern")
  if (!isIntern) return forbidden("Only interns can submit weekly reports")

  // Parse body up front so content validation (reflections) fires before time-window checks.
  const body = await req.json()
  const {
    mainProjectHours = 0, consultingHours = 0, specialProjectHours = 0,
    trainingHours = 0, newBusinessHours = 0, reportingDocHours = 0,
    operationalHours = 0, researchHours = 0, meetingsHours = 0,
    communityHours = 0, representationHours = 0, selfDevHours = 0,
    personalReflection = "",
    taskDescriptions = {},
    dailyReflections = {} as Record<string, string>,
    extraReviewerIds = [] as string[],
  } = body

  // Compulsory: every Mon-Fri reflection must be non-empty after trim.
  // We check content FIRST so the intern always learns about missing fields even if outside the window.
  const REFLECTION_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
  for (const key of REFLECTION_KEYS) {
    if (!dailyReflections?.[key] || dailyReflections[key].trim().length === 0) {
      return NextResponse.json({ error: `Daily reflection for ${key} is required.` }, { status: 400 })
    }
  }

  // Load configurable submission window
  const cfg = await prisma.internReportSettings.findUnique({ where: { id: "singleton" } })
  const submissionDay      = cfg?.submissionDay        ?? 5
  const openHour           = cfg?.openHour             ?? 16
  const lateHour           = cfg?.lateHour             ?? 20
  const lateDeductionSat   = cfg?.lateDeduction        ?? 2
  const lateDeductionSun   = cfg?.lateDeductionSunday  ?? 3

  // Window is: submissionDay (Fri) openHour → Sunday 23:59 WAT.
  // Deductions: Fri before lateHour = 0, Fri after lateHour = 0 (LATE flag),
  // Saturday = lateDeductionSat, Sunday = lateDeductionSun.
  const nowWAT = toWAT(new Date())
  const dayWAT = nowWAT.getDay() // 0=Sun … 5=Fri … 6=Sat
  const hoursWAT = nowWAT.getHours()

  const FRI = submissionDay   // 5
  const SAT = (submissionDay + 1) % 7  // 6
  const SUN = (submissionDay + 2) % 7  // 0
  const isFri = dayWAT === FRI
  const isSat = dayWAT === SAT
  const isSun = dayWAT === SUN

  if (!isFri && !isSat && !isSun) {
    return NextResponse.json({ error: `Submission window opens Friday at ${openHour}:00 WAT and closes Sunday at 11:59 PM WAT.` }, { status: 400 })
  }
  if (isFri && hoursWAT < openHour) {
    return NextResponse.json({ error: `Submission opens at ${openHour}:00 WAT today.` }, { status: 400 })
  }

  // Compute status + deduction by day
  let lateFlag = false
  let pointDeduction = 0
  let computedStatus: "SUBMITTED" | "LATE" = "SUBMITTED"
  if (isFri && hoursWAT >= lateHour) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = 0
  } else if (isSat) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = lateDeductionSat
  } else if (isSun) {
    lateFlag = true; computedStatus = "LATE"; pointDeduction = lateDeductionSun
  }

  const { weekStart: ws, weekEnd: we } = getWeekBounds(new Date())

  // Prevent duplicate / block on MISSING placeholder
  const existing = await prisma.internWeeklyReport.findFirst({
    where: { employeeId: emp.id, weekStart: ws },
  })
  if (existing && existing.status === "MISSING") {
    return NextResponse.json({ error: "A missing-report record exists for this week. Ask an admin to clear it before submitting." }, { status: 409 })
  }
  if (existing && existing.status !== "DRAFT") {
    return NextResponse.json({ error: "You have already submitted a report for this week." }, { status: 409 })
  }

  const totalHours = [
    mainProjectHours, consultingHours, specialProjectHours, trainingHours,
    newBusinessHours, reportingDocHours, operationalHours, researchHours,
    meetingsHours, communityHours, representationHours, selfDevHours,
  ].reduce((a, b) => a + Number(b), 0)

  const isNew = !existing
  const report = await prisma.internWeeklyReport.upsert({
    where: { employeeId_weekStart: { employeeId: emp.id, weekStart: ws } },
    create: {
      employeeId: emp.id, weekStart: ws, weekEnd: we,
      mainProjectHours, consultingHours, specialProjectHours, trainingHours,
      newBusinessHours, reportingDocHours, operationalHours, researchHours,
      meetingsHours, communityHours, representationHours, selfDevHours,
      totalHours, personalReflection, taskDescriptions, dailyReflections,
      submittedAt: new Date(), lateFlag,
      pointDeduction,
      status: computedStatus,
    },
    update: {
      mainProjectHours, consultingHours, specialProjectHours, trainingHours,
      newBusinessHours, reportingDocHours, operationalHours, researchHours,
      meetingsHours, communityHours, representationHours, selfDevHours,
      totalHours, personalReflection, taskDescriptions, dailyReflections,
      submittedAt: new Date(), lateFlag,
      pointDeduction,
      status: computedStatus,
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

  // Fetch full report with employee for Excel + email
  const fullReport = await prisma.internWeeklyReport.findUnique({
    where: { id: report.id },
    include: { employee: { select: { firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } } } },
  })

  // Build email data
  const internName = `${emp.firstName} ${emp.lastName}`
  const weekEndStr = format(we, "MMM d, yyyy")
  const totalHoursStr = (report.totalHours ?? 0).toFixed(1)
  const lateFlagStr = lateFlag ? "Yes (submitted after 8PM WAT)" : "No"
  const reviewLink = `${process.env.NEXTAUTH_URL ?? ""}/project-lead/intern-reports`
  const xlsxFilename = `intern_report_${format(we, "yyyy-MM-dd")}.xlsx`

  let xlsxBuf: Buffer | undefined
  try {
    if (fullReport) xlsxBuf = generateInternReportXlsx(fullReport as any)
  } catch { /* non-fatal */ }

  const attachments = xlsxBuf ? [{ filename: xlsxFilename, content: xlsxBuf }] : undefined

  // Notify + email project lead
  if (emp.projectLeadId) {
    const lead = await prisma.employee.findUnique({ where: { id: emp.projectLeadId }, select: { userId: true } })
    if (lead?.userId) {
      await prisma.notification.create({
        data: {
          userId: lead.userId,
          title: "Intern Weekly Report Submitted",
          message: `${internName} submitted their weekly report for ${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}.${lateFlag ? " (Late submission)" : ""}`,
          type: lateFlag ? "WARNING" : "INFO",
          link: "/project-lead/intern-reports",
        },
      }).catch(() => {})

      // Gather CC emails from extra reviewers
      const ccEmails: string[] = []
      for (const revId of (extraReviewerIds as string[])) {
        if (!revId || revId === emp.projectLeadId) continue
        const revEmp = await prisma.employee.findUnique({ where: { id: revId }, select: { user: { select: { email: true } } } })
        if (revEmp?.user?.email) ccEmails.push(revEmp.user.email)
      }

      sendEmail({
        eventKey: "intern_report_submitted",
        toUserId: lead.userId,
        cc: ccEmails.length ? ccEmails : undefined,
        attachments,
        variables: { internName, weekEnd: weekEndStr, totalHours: totalHoursStr, lateFlag: lateFlagStr, reviewLink },
      }).catch(() => {})
    }
  }

  // Notify + email each extra reviewer individually
  for (const revId of (extraReviewerIds as string[])) {
    if (!revId || revId === emp.projectLeadId) continue
    const revEmp = await prisma.employee.findUnique({ where: { id: revId }, select: { userId: true } })
    if (!revEmp?.userId) continue
    await prisma.notification.create({
      data: {
        userId: revEmp.userId,
        title: "Intern Report: Review Requested",
        message: `${internName} has asked you to review their weekly report for ${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}.`,
        type: "INFO",
        link: "/staff/intern-reviews",
      },
    }).catch(() => {})
    sendEmail({
      eventKey: "intern_report_reviewer_assigned",
      toUserId: revEmp.userId,
      attachments,
      variables: { internName, weekEnd: weekEndStr, totalHours: totalHoursStr, lateFlag: lateFlagStr, reviewLink },
    }).catch(() => {})
  }

  return NextResponse.json({ report }, { status: 201 })
}
