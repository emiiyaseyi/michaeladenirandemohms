// In-app notifications for appraisal stage transitions.
// All helpers are best-effort (never throw into the request path).
import { prisma } from "@/lib/prisma"
import { roleBasePath } from "@/lib/api-auth"

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
