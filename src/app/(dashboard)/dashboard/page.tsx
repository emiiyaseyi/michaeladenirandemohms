import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCapabilities } from "@/lib/rbac"
import StatCard from "@/components/ui/StatCard"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import { Users, CalendarDays, Briefcase, TrendingUp, UserCheck, Clock, AlertCircle, ShieldAlert } from "lucide-react"
import { formatDate } from "@/lib/utils"
import StaffDashboard from "./StaffDashboard"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await auth()
  const sp = await searchParams
  const accessDenied = sp?.denied === "1"

  const role = (session?.user as any)?.role ?? "STAFF"

  // Staff and interns see their personal profile dashboard
  if (role === "STAFF" || role === "INTERN") {
    return <StaffDashboard />
  }

  const employeeId = (session?.user as any)?.employeeId
  const c = getCapabilities(role)

  // Scope DB queries by role
  let teamFilter: any = {}
  if (!c.canViewAllEmployees && c.canViewTeamEmployees && employeeId) {
    if (role === "MANAGER") {
      teamFilter = { managerId: employeeId }
    } else if (role === "DEPARTMENT_LEAD") {
      const me = await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } })
      teamFilter = me?.departmentId ? { departmentId: me.departmentId } : {}
    }
  }

  const isAdmin = c.canViewAllEmployees

  const [
    totalEmployees, activeEmployees, onLeave, pendingLeave,
    openJobs, pendingKPIs, recentEmployees, recentLeave,
  ] = await Promise.all([
    isAdmin
      ? prisma.employee.count()
      : c.canViewTeamEmployees ? prisma.employee.count({ where: teamFilter }) : Promise.resolve(1),

    isAdmin
      ? prisma.employee.count({ where: { employeeStatus: "ACTIVE" } })
      : c.canViewTeamEmployees ? prisma.employee.count({ where: { ...teamFilter, employeeStatus: "ACTIVE" } }) : Promise.resolve(1),

    isAdmin
      ? prisma.employee.count({ where: { employeeStatus: "ON_LEAVE" } })
      : c.canViewTeamEmployees ? prisma.employee.count({ where: { ...teamFilter, employeeStatus: "ON_LEAVE" } }) : Promise.resolve(0),

    c.canApproveLeave
      ? prisma.leaveRequest.count({ where: { status: "PENDING" } })
      : employeeId ? prisma.leaveRequest.count({ where: { employeeId, status: "PENDING" } }) : Promise.resolve(0),

    c.canViewRecruitment ? prisma.jobPosting.count({ where: { status: "OPEN" } }) : Promise.resolve(0),

    c.canScoreKPIs ? prisma.kPI.count({ where: { status: "SUBMITTED" } }) : Promise.resolve(0),

    isAdmin
      ? prisma.employee.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { department: true } })
      : c.canViewTeamEmployees
        ? prisma.employee.findMany({ where: teamFilter, take: 5, orderBy: { createdAt: "desc" }, include: { department: true } })
        : employeeId
          ? prisma.employee.findMany({ where: { id: employeeId }, include: { department: true } })
          : Promise.resolve([]),

    c.canViewAllLeave || c.canViewTeamLeave
      ? prisma.leaveRequest.findMany({
          take: 5, orderBy: { createdAt: "desc" },
          include: { employee: true, leaveType: true },
          where: {
            status: "PENDING",
            ...(c.canViewTeamLeave && !c.canViewAllLeave && role === "MANAGER"
              ? { employee: { managerId: employeeId } }
              : {}),
          }
        })
      : employeeId
        ? prisma.leaveRequest.findMany({
            where: { employeeId },
            take: 5, orderBy: { createdAt: "desc" },
            include: { employee: true, leaveType: true },
          })
        : Promise.resolve([]),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"

  return (
    <div>
      {/* Access Denied Banner */}
      {accessDenied && (
        <div style={{
          background: "rgba(227,25,42,0.08)", border: "1px solid rgba(227,25,42,0.3)",
          borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center",
          gap: 12, marginBottom: 20,
        }}>
          <ShieldAlert size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>Access Denied</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              You do not have permission to access that page. Contact your administrator if you need access.
            </div>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
          Good {greeting}, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>
          {isAdmin
            ? "Here's what's happening at DSN today."
            : c.canViewTeamEmployees
              ? "Here's an overview of your team."
              : "Here's a summary of your activity."}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label={isAdmin ? "Total Employees" : c.canViewTeamEmployees ? "Team Size" : "My Profile"} value={totalEmployees} icon={Users} color="var(--primary)" />
        <StatCard label="Active" value={activeEmployees} icon={UserCheck} color="var(--success)" />
        <StatCard label="On Leave" value={onLeave} icon={CalendarDays} color="var(--warning)" />
        {c.canViewRecruitment
          ? <StatCard label="Open Positions" value={openJobs} icon={Briefcase} color="var(--accent)" />
          : <StatCard label="My Pending Leave" value={pendingLeave} icon={Clock} color="var(--accent)" />}
      </div>

      {/* Alerts */}
      {(pendingLeave > 0 || pendingKPIs > 0) && (c.canApproveLeave || c.canScoreKPIs) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {pendingLeave > 0 && c.canApproveLeave && (
            <div style={{ background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <AlertCircle size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>{pendingLeave} Leave Request{pendingLeave !== 1 ? "s" : ""} Awaiting</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Requires your action</div>
              </div>
            </div>
          )}
          {pendingKPIs > 0 && c.canScoreKPIs && (
            <div style={{ background: "var(--info-bg)", border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <TrendingUp size={18} style={{ color: "var(--info)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>{pendingKPIs} KPI{pendingKPIs !== 1 ? "s" : ""} Pending Approval</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Performance cycle active</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>
              {isAdmin ? "Recent Employees" : c.canViewTeamEmployees ? "Team Members" : "My Profile"}
            </h3>
            {(isAdmin || c.canViewTeamEmployees) && (
              <a href="/employees" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
            )}
          </div>
          <div>
            {recentEmployees.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No employees yet</div>
            ) : (recentEmployees as any[]).map((emp: any) => (
              <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)" }}>
                <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.jobTitle ?? "—"} · {emp.department?.name ?? "—"}</div>
                </div>
                <Badge status={emp.employeeStatus} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>
              {c.canApproveLeave ? "Pending Leave Requests" : "My Leave Requests"}
            </h3>
            <a href="/leave" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          <div>
            {recentLeave.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No pending requests</div>
            ) : (recentLeave as any[]).map((req: any) => (
              <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)" }}>
                <Avatar name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{req.employee.firstName} {req.employee.lastName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.leaveType.name} · {req.days} day{req.days !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{formatDate(req.startDate)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
