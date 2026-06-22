// In-app notifications for appraisal stage transitions.
// All helpers are best-effort (never throw into the request path).
import { prisma } from "@/lib/prisma"
import { roleBasePath } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"

type NotifType = "INFO" | "SUCCESS" | "WARNING" | "DANGER"

// Build + create one notification per employee, resolving each employee's user/role
// so the link is prefixed for their panel (/admin, /project-lead, /staff).
async function notifyEmployees(
  employeeIds: string[],
  build: (base: string) => { title: string; message: string; link?: string; type?: NotifType },
): Promise<void> {
  if (!employeeIds.length) return
  try {
    const emps = await prisma.employee.findMany({
      where: { id: { in: Array.from(new Set(employeeIds)) } },
      select: { id: true, userId: true, user: { select: { role: true } } },
    })
    const data = emps
      .filter(e => e.userId)
      .map(e => {
        const base = roleBasePath((e.user?.role as string) ?? "STAFF")
        const n = build(base)
        return { userId: e.userId, employeeId: e.id, title: n.title, message: n.message, link: n.link ?? null, type: (n.type ?? "INFO") as any }
      })
    if (data.length) await prisma.notification.createMany({ data, skipDuplicates: true })
  } catch { /* best-effort */ }
}

// Cycle opened → every employee with an appraisal completes self + assigned reviews.
export async function notifyCycleOpened(employeeIds: string[], cycleName: string) {
  await notifyEmployees(employeeIds, base => ({
    title: "Performance appraisal is open",
    message: `${cycleName} is now open. Complete your self-appraisal and any peer/lead reviews assigned to you.`,
    link: `${base}/performance/my`,
    type: "INFO",
  }))
}

// Newly-assigned peers → asked to give an anonymous peer review.
export async function notifyPeersAssigned(peerEmployeeIds: string[]) {
  await notifyEmployees(peerEmployeeIds, base => ({
    title: "Peer review requested",
    message: "You've been asked to give an anonymous peer review. Open your Peer Reviews to complete it.",
    link: `${base}/performance/peer-reviews`,
    type: "INFO",
  }))
}

// Cycle entered REVIEW → reviewers score their assigned appraisals.
export async function notifyReviewStageOpened(reviewerEmployeeIds: string[]) {
  await notifyEmployees(reviewerEmployeeIds, base => ({
    title: "Appraisals ready for review",
    message: "Staff appraisals assigned to you are ready to review and score.",
    link: `${base}/performance/to-review`,
    type: "INFO",
  }))
}

// Employee submitted → notify their assigned reviewers.
export async function notifyEmployeeSubmitted(reviewerEmployeeIds: string[], subjectName: string) {
  await notifyEmployees(reviewerEmployeeIds, base => ({
    title: "Appraisal submitted",
    message: `${subjectName} submitted their appraisal.`,
    link: `${base}/performance/to-review`,
    type: "INFO",
  }))
}

// Finalized → notify the subject their result is ready.
export async function notifyFinalized(employeeId: string) {
  await notifyEmployees([employeeId], base => ({
    title: "Appraisal result ready",
    message: "Your performance appraisal has been finalized. View your result.",
    link: `${base}/performance/my`,
    type: "SUCCESS",
  }))
}

// Cycle closed → email every staff member with a finalized appraisal their final report
// (score breakdown + management comment), plus an in-app notification. Best-effort.
export async function notifyFinalReport(cycleId: string) {
  try {
    const cycle = await prisma.performanceCycle.findUnique({ where: { id: cycleId }, select: { name: true } })
    const appraisals = await prisma.appraisal.findMany({
      where: { cycleId, stage: "FINALIZED" },
      select: {
        employeeId: true, finalPercent: true, behavioural360Rev: true, jobScoreRev: true, coreScoreRev: true, managementComment: true,
        employee: { select: { firstName: true, lastName: true, userId: true } },
      },
    })
    const fmt = (v: number | null) => (v === null || v === undefined ? "—" : Math.round(v * 10) / 10 + "")
    for (const a of appraisals) {
      if (!a.employee?.userId) continue
      await sendEmail({
        eventKey: "appraisal_final_report",
        toUserId: a.employee.userId,
        variables: {
          employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
          cycleName: cycle?.name ?? "the cycle",
          finalPercent: fmt(a.finalPercent),
          behaviouralScore: fmt(a.behavioural360Rev),
          jobScore: fmt(a.jobScoreRev),
          coreScore: fmt(a.coreScoreRev),
          managementComment: a.managementComment?.trim() || "—",
        },
      })
    }
    await notifyEmployees(appraisals.map(a => a.employeeId), base => ({
      title: "Appraisal result ready",
      message: "Your performance appraisal cycle is closed. Your final report has been emailed to you.",
      link: `${base}/performance/my`,
      type: "SUCCESS",
    }))
  } catch { /* best-effort */ }
}
