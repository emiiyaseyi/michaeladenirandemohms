import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import { Users, CalendarDays, Briefcase, TrendingUp, UserCheck, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()

  const [totalEmployees, activeEmployees, onLeave, pendingLeave, openJobs, pendingKPIs, recentEmployees, recentLeave] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { employeeStatus: "ON_LEAVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.jobPosting.count({ where: { status: "OPEN" } }),
    prisma.kPI.count({ where: { status: "SUBMITTED" } }),
    prisma.employee.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { department: true } }),
    prisma.leaveRequest.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { employee: true, leaveType: true }, where: { status: "PENDING" } }),
  ])

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>Here's what's happening at DSN today.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Employees" value={totalEmployees} icon={Users} color="var(--primary)" />
        <StatCard label="Active Staff" value={activeEmployees} icon={UserCheck} color="var(--success)" />
        <StatCard label="On Leave" value={onLeave} icon={CalendarDays} color="var(--warning)" />
        <StatCard label="Open Positions" value={openJobs} icon={Briefcase} color="var(--accent)" />
      </div>

      {/* Alerts row */}
      {(pendingLeave > 0 || pendingKPIs > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {pendingLeave > 0 && (
            <div style={{ background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <AlertCircle size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>{pendingLeave} Leave Request{pendingLeave > 1 ? "s" : ""} Awaiting</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Requires your action</div>
              </div>
            </div>
          )}
          {pendingKPIs > 0 && (
            <div style={{ background: "var(--info-bg)", border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <TrendingUp size={18} style={{ color: "var(--info)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>{pendingKPIs} KPI{pendingKPIs > 1 ? "s" : ""} Pending Approval</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Performance cycle active</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tables row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Employees */}
        <Card>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent Employees</h3>
            <a href="/employees" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          <div>
            {recentEmployees.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No employees yet</div>
            ) : recentEmployees.map(emp => (
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

        {/* Pending Leave */}
        <Card>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Pending Leave Requests</h3>
            <a href="/leave" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          <div>
            {recentLeave.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No pending requests</div>
            ) : recentLeave.map(req => (
              <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)" }}>
                <Avatar name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{req.employee.firstName} {req.employee.lastName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.leaveType.name} · {req.days} day{req.days > 1 ? "s" : ""}</div>
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
