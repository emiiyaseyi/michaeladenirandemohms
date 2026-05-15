import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import GroupStatsRow from "@/components/shared/GroupStatsRow"
import GroupAlerts from "@/components/shared/GroupAlerts"
import ProjectLeadQuickActionsBar from "./ProjectLeadQuickActionsBar"
import RecentEmployeesPanel from "@/components/shared/RecentEmployeesPanel"
import PendingLeavePanel from "@/components/shared/PendingLeavePanel"
import DashboardAnnouncements from "@/components/layout/DashboardAnnouncements"
import CelebrationsCard from "@/components/shared/CelebrationsCard"

export default async function ProjectLeadDashboard() {
  const session = await auth()
  const name = session?.user?.name?.split(" ")[0] ?? "Lead"
  const employeeId = (session?.user as any)?.employeeId as string | undefined
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"

  const memberFilter = employeeId ? { projectLeadId: employeeId } : { id: "none" }

  const [
    teamSize,
    active,
    onLeave,
    pendingLeaveCount,
    kpisToScore,
    teamMembers,
    pendingLeaveRequests,
  ] = await Promise.all([
    prisma.employee.count({ where: memberFilter }),
    prisma.employee.count({ where: { ...memberFilter, employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { ...memberFilter, employeeStatus: "ON_LEAVE" } }),
    prisma.leaveRequest.count({
      where: { status: "PENDING", employee: memberFilter },
    }),
    prisma.kPI.count({
      where: { status: "SUBMITTED", employee: memberFilter },
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
    prisma.leaveRequest.findMany({
      where: { status: "PENDING", employee: memberFilter },
      take: 6,
      orderBy: { createdAt: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true, profilePhoto: true } },
        leaveType: { select: { name: true } },
      },
    }),
  ])

  return (
    <div>
      <DashboardAnnouncements />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
          Good {greeting}, {name} 👋
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>
          Here's an overview of your team members.
        </p>
      </div>

      <GroupStatsRow
        groupSize={teamSize}
        active={active}
        onLeave={onLeave}
        pendingLeave={pendingLeaveCount}
        kpisToScore={kpisToScore}
        groupLabel="Team"
      />

      <GroupAlerts
        pendingLeave={pendingLeaveCount}
        kpisToScore={kpisToScore}
        groupLabel="Team"
      />

      <ProjectLeadQuickActionsBar />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap: 20 }}>
        <RecentEmployeesPanel employees={teamMembers} viewAllHref="/project-lead/people/employees" />
        <PendingLeavePanel leaveRequests={pendingLeaveRequests} viewAllHref="/project-lead/requests/leave" />
        <CelebrationsCard />
      </div>
    </div>
  )
}
