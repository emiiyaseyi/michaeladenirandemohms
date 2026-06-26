import { prisma } from "@/lib/prisma"

/**
 * Sends an in-app notification to every Project Lead assigned to a given
 * department (via ProjectLeadDepartment). Used when a staff member is added
 * to, removed from, or otherwise changed within a department.
 *
 * Optionally excludes one userId (useful when the actor or the staff being
 * added is themselves a PL of the same dept - don't notify them about themselves).
 *
 * R6: This helper previously also sent emails via the `department_member_change`
 * event. The email was dropped - PLs check the app daily; inbox spam per dept
 * change was unnecessary. If we ever bring it back, re-add the sendEmail loop
 * and a matching template entry in `src/lib/email-events.ts`.
 */
export async function notifyDepartmentPLs(opts: {
  departmentId: string
  excludeUserId?: string
  title: string
  message: string
  link?: string
}): Promise<void> {
  const { departmentId, excludeUserId, title, message, link } = opts
  const pls = await prisma.projectLeadDepartment.findMany({
    where: {
      departmentId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  })

  if (pls.length === 0) return

  await prisma.notification.createMany({
    data: pls.map(p => ({
      userId: p.userId,
      title,
      message,
      type: "INFO" as any,
      link: link ?? null,
    })),
    skipDuplicates: true,
  }).catch(() => {})
}
