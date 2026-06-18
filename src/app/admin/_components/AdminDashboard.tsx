import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import OrgStatsRow from "@/components/shared/OrgStatsRow"
import AlertsBanner from "@/components/shared/AlertsBanner"
import AdminQuickActionsBar from "./AdminQuickActionsBar"
import RecentEmployeesPanel from "@/components/shared/RecentEmployeesPanel"
import PendingLeavePanel from "@/components/shared/PendingLeavePanel"
import DashboardAnnouncements from "@/components/layout/DashboardAnnouncements"
import AttritionTrendChart from "./AttritionTrendChart"
import HeadcountPieChart from "./HeadcountPieChart"
import CelebrationsCard from "@/components/shared/CelebrationsCard"

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

async function getAttritionData() {
  const now = new Date()
  const months: { month: number; year: number; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yr = d.getFullYear().toString().slice(2)
    months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTH_LABELS[d.getMonth()]} '${yr}` })
  }
  const results = await Promise.all(
    months.map(async ({ month, year, label }) => {
      const start = new Date(year, month - 1, 1)
      const end   = new Date(year, month, 0, 23, 59, 59, 999)
      const [inCompany, exited] = await Promise.all([
        prisma.employee.count({ where: { ...NO_SUPER_ADMIN, createdAt: { lte: end }, OR: [{ endDate: null }, { endDate: { gt: end } }] } }),
        prisma.employee.count({ where: { ...NO_SUPER_ADMIN, endDate: { gte: start, lte: end } } }),
      ])
      return { label, inCompany, exited }
    })
  )
  return results
}

const NO_SUPER_ADMIN = { NOT: { user: { role: "SUPER_ADMIN" as any } } }

async function getHeadcountData() {
  const [total, male, female] = await Promise.all([
    prisma.employee.count({ where: { ...NO_SUPER_ADMIN, employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] } } }),
    prisma.employee.count({ where: { ...NO_SUPER_ADMIN, gender: "MALE",   employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] } } }),
    prisma.employee.count({ where: { ...NO_SUPER_ADMIN, gender: "FEMALE", employeeStatus: { in: ["ACTIVE", "ON_LEAVE"] } } }),
  ])
  return { total, male, female }
}

export default async function AdminDashboard() {
  const session = await auth()
  const name = session?.user?.name?.split(" ")[0] ?? "Admin"
  const role = (session?.user as any)?.role ?? "STAFF"
  const isSuperAdmin = role === "SUPER_ADMIN"
  const permissions = (session?.user as any)?.permissions ?? {}
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"

  const can = (key: string) => isSuperAdmin || !!permissions[key]

  const canViewEmployees  = can("canViewAllEmployees")
  const canViewLeave      = can("canViewAllLeave")
  const canViewAnalytics  = can("canViewAnalytics")
  const canViewPerformance = can("canViewPerformance")

  // Only fetch data the user is permitted to see
  const [
    totalEmployees,
    activeEmployees,
    onLeave,
    deptCount,
    openJobs,
    pendingKPIs,
    pendingLeaveCount,
    recentEmployees,
    pendingLeaveRequests,
    departments,
    attritionData,
    headcount,
  ] = await Promise.all([
    canViewEmployees ? prisma.employee.count({ where: NO_SUPER_ADMIN }) : Promise.resolve(0),
    canViewEmployees ? prisma.employee.count({ where: { ...NO_SUPER_ADMIN, employeeStatus: "ACTIVE" } }) : Promise.resolve(0),
    canViewEmployees ? prisma.employee.count({ where: { ...NO_SUPER_ADMIN, employeeStatus: "ON_LEAVE" } }) : Promise.resolve(0),
    prisma.department.count(),
    prisma.jobPosting.count({ where: { status: "OPEN" } }),
    canViewPerformance ? prisma.appraisal.count({ where: { stage: "SUBMITTED" } }) : Promise.resolve(0),
    canViewLeave ? prisma.leaveRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    canViewEmployees
      ? prisma.employee.findMany({
          where: NO_SUPER_ADMIN,
          take: 6, orderBy: { createdAt: "desc" },
          include: {
            department: true,
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
    canViewLeave
      ? prisma.leaveRequest.findMany({
          where: { status: "PENDING" }, take: 6, orderBy: { createdAt: "asc" },
          include: {
            employee: { select: { firstName: true, lastName: true, profilePhoto: true } },
            leaveType: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    canViewAnalytics ? getAttritionData() : Promise.resolve([]),
    canViewAnalytics ? getHeadcountData() : Promise.resolve({ total: 0, male: 0, female: 0 }),
  ])

  return (
    <div>
      <DashboardAnnouncements />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
          Good {greeting}, {name} 👋
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>
          Here's what's happening at DSN today.
        </p>
      </div>

      {canViewEmployees && (
        <OrgStatsRow
          totalEmployees={totalEmployees}
          activeEmployees={activeEmployees}
          onLeave={onLeave}
          departments={deptCount}
          openJobs={openJobs}
          pendingLeave={canViewLeave ? pendingLeaveCount : 0}
        />
      )}

      {(canViewLeave || canViewPerformance) && (
        <AlertsBanner
          pendingLeave={canViewLeave ? pendingLeaveCount : 0}
          pendingKPIs={canViewPerformance ? pendingKPIs : 0}
        />
      )}

      <AdminQuickActionsBar departments={departments} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      {canViewAnalytics && (
        <div style={{ display: "flex", gap: 20, marginBottom: 20, alignItems: "stretch", flexWrap: "wrap" }}>
          <AttritionTrendChart data={attritionData} />
          <HeadcountPieChart total={(headcount as any).total} male={(headcount as any).male} female={(headcount as any).female} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap: 20 }}>
        {canViewEmployees && <RecentEmployeesPanel employees={recentEmployees} viewAllHref="/admin/people/employees" />}
        {canViewLeave && <PendingLeavePanel leaveRequests={pendingLeaveRequests} viewAllHref="/admin/requests/leave" />}
        <CelebrationsCard />
      </div>
    </div>
  )
}
