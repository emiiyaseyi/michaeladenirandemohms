import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import DashboardAnnouncements from "@/components/layout/DashboardAnnouncements"
import RecentEmployeesPanel from "@/components/shared/RecentEmployeesPanel"
import PendingLeavePanel from "@/components/shared/PendingLeavePanel"
import CelebrationsCard from "@/components/shared/CelebrationsCard"

export default async function ProjectLeadDashboard() {
  const session = await auth()
  const name = session?.user?.name?.split(" ")[0] ?? "Lead"
  const userId = (session?.user as any)?.id as string | undefined
  const employeeId = (session?.user as any)?.employeeId as string | undefined
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"

  // Get departments this PL leads
  const plDepts = userId
    ? await prisma.projectLeadDepartment.findMany({
        where: { userId },
        select: { departmentId: true, department: { select: { name: true } } },
      })
    : []

  const deptIds = plDepts.map(d => d.departmentId)
  const deptNames = plDepts.map(d => d.department.name)

  const memberFilter = deptIds.length > 0
    ? { departmentId: { in: deptIds } }
    : { id: "none" }

  const [
    teamSize, active, onLeave,
    pendingLeaveCount, pendingLeaveRequests, teamMembers,
  ] = await Promise.all([
    prisma.employee.count({ where: memberFilter }),
    prisma.employee.count({ where: { ...memberFilter, employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { ...memberFilter, employeeStatus: "ON_LEAVE" } }),
    prisma.leaveRequest.count({
      where: {
        status: "PENDING",
        approvals: { some: { employeeId: employeeId ?? "none", stage: "PROJECT_LEAD", action: null } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        approvals: { some: { employeeId: employeeId ?? "none", stage: "PROJECT_LEAD", action: null } },
      },
      take: 6,
      orderBy: { createdAt: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true, profilePhoto: true } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.employee.findMany({
      where: memberFilter,
      take: 6,
      orderBy: { firstName: "asc" },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        projectAssignments: { include: { project: { select: { id: true, name: true, status: true } } } },
      },
    }),
  ])

  const deptLabel = deptNames.length === 1
    ? deptNames[0]
    : deptNames.length > 1
      ? `${deptNames.slice(0, 2).join(", ")}${deptNames.length > 2 ? ` +${deptNames.length - 2} more` : ""}`
      : null

  return (
    <div>
      <DashboardAnnouncements />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
          Good {greeting}, {name} 👋
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>
          {deptLabel
            ? <>You lead <strong>{deptLabel}</strong> — here&apos;s today&apos;s overview.</>
            : <>No departments assigned yet — ask an admin to assign you to a department.</>}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Team Size",     value: teamSize,         color: "var(--primary)" },
          { label: "Active",        value: active,           color: "var(--success)" },
          { label: "On Leave",      value: onLeave,          color: "var(--warning)" },
          { label: "Pending Approval", value: pendingLeaveCount, color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {pendingLeaveCount > 0 && (
        <div style={{ padding: "12px 16px", background: "rgba(234,179,8,0.1)", border: "1px solid var(--warning)", borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600, color: "var(--warning)" }}>
          {pendingLeaveCount} leave request{pendingLeaveCount !== 1 ? "s" : ""} awaiting your approval —{" "}
          <a href="/project-lead/requests/leave" style={{ color: "inherit", textDecoration: "underline" }}>Review now</a>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap: 20 }}>
        <RecentEmployeesPanel employees={teamMembers} viewAllHref="/project-lead/people" />
        <PendingLeavePanel leaveRequests={pendingLeaveRequests} viewAllHref="/project-lead/requests/leave" />
        <CelebrationsCard />
      </div>
    </div>
  )
}
