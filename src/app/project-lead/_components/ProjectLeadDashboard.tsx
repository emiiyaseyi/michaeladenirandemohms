import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { differenceInMonths, differenceInYears } from "date-fns"
import DashboardAnnouncements from "@/components/layout/DashboardAnnouncements"
import RecentEmployeesPanel from "@/components/shared/RecentEmployeesPanel"
import PendingLeavePanel from "@/components/shared/PendingLeavePanel"
import CelebrationsCard from "@/components/shared/CelebrationsCard"
import AnnouncementsCard from "@/components/shared/AnnouncementsCard"
import DeptOrgLeaveCard from "@/components/shared/DeptOrgLeaveCard"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import Link from "next/link"
import {
  CalendarDays, Target, TrendingUp, ClipboardList,
  Users, Edit2, Clock, Building2,
} from "lucide-react"

const ACCENTS = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#0EA5E9", "#8B5CF6", "#F97316"]

const QUICK_ACTIONS = [
  { label: "Request Leave",  href: "/project-lead/requests/leave",        color: "#6366F1", icon: CalendarDays },
  { label: "Set KPI Goals",  href: "/project-lead/performance/objectives", color: "#F59E0B", icon: Target },
  { label: "Appraisals",     href: "/project-lead/performance/reviews",   color: "#EC4899", icon: TrendingUp },
  { label: "My Documents",   href: "/project-lead/documents",             color: "#8B5CF6", icon: ClipboardList },
  { label: "My Team",        href: "/project-lead/team",                  color: "#0EA5E9", icon: Users },
]

const REQUIRED_FIELDS = [
  "firstName", "lastName", "gender", "dateOfBirth", "maritalStatus",
  "personalEmail", "phone", "address", "city", "state",
  "profilePhoto", "nokName", "nokPhone",
]
function calcCompleteness(emp: any): number {
  const filled = REQUIRED_FIELDS.filter(f => emp[f] != null && emp[f] !== "").length
  return Math.round((filled / REQUIRED_FIELDS.length) * 100)
}
function timeInCompany(hireDate: Date | null): string {
  if (!hireDate) return "—"
  const now = new Date()
  const years = differenceInYears(now, hireDate)
  const months = differenceInMonths(now, hireDate) % 12
  if (years === 0) return months <= 1 ? "Less than a month" : `${months} month${months !== 1 ? "s" : ""}`
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`
  return `${years} yr ${months} mo`
}

export default async function ProjectLeadDashboard() {
  const session = await auth()
  const userId   = (session?.user as any)?.id   as string | undefined
  const employeeId = (session?.user as any)?.employeeId as string | undefined
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const currentYear = new Date().getFullYear()

  // Current week bounds (UTC) for intern report summary
  const nowUTC = new Date(); nowUTC.setUTCHours(0,0,0,0)
  const dayUTC = nowUTC.getUTCDay()
  const diffToMon = dayUTC === 0 ? -6 : 1 - dayUTC
  const weekStart = new Date(nowUTC); weekStart.setUTCDate(nowUTC.getUTCDate() + diffToMon)

  const [employee, plDepts] = await Promise.all([
    employeeId
      ? prisma.employee.findUnique({
          where: { id: employeeId },
          include: {
            department: true,
            leaveBalances: { where: { year: currentYear }, include: { leaveType: true } },
          },
        })
      : Promise.resolve(null),
    userId
      ? prisma.projectLeadDepartment.findMany({
          where: { userId },
          select: { departmentId: true, department: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ])

  const deptIds   = plDepts.map(d => d.departmentId)
  const deptNames = plDepts.map(d => d.department.name)
  const memberFilter = deptIds.length > 0 ? { departmentId: { in: deptIds } } : { id: "none" }

  const [
    leaveTypes,
    teamSize, active, onLeave,
    pendingLeaveCount, pendingLeaveRequests, teamMembers, deptOnLeaveRaw,
  ] = await Promise.all([
    prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
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
      take: 6, orderBy: { createdAt: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true, profilePhoto: true } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.employee.findMany({
      where: memberFilter, take: 6, orderBy: { firstName: "asc" },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    deptIds.length > 0
      ? prisma.employee.findMany({
          where: {
            departmentId: { in: deptIds },
            leaveRequests: { some: { status: "APPROVED", endDate: { gte: new Date() } } },
          },
          select: {
            id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true,
            leaveRequests: {
              where: { status: "APPROVED", endDate: { gte: new Date() } },
              include: { leaveType: true },
              orderBy: { startDate: "asc" },
              take: 1,
            },
          },
        })
      : Promise.resolve([]),
  ])

  // Intern report summary for this week
  const internReportsThisWeek = employeeId ? await prisma.internWeeklyReport.findMany({
    where: {
      weekStart,
      employee: {
        OR: [{ managerId: employeeId }, { projectLeadId: employeeId }],
        jobTitle: { contains: "intern", mode: "insensitive" },
      },
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
  }) : []

  const internReportsPendingReview = internReportsThisWeek.filter(r =>
    r.status === "SUBMITTED" || r.status === "LATE"
  ).length

  const deptOnLeave = deptOnLeaveRaw.map((m: any) => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    jobTitle: m.jobTitle,
    profilePhoto: m.profilePhoto,
    currentLeave: m.leaveRequests[0]
      ? { leaveType: m.leaveRequests[0].leaveType.name, endDate: m.leaveRequests[0].endDate }
      : null,
  }))

  // Leave balances — compute used/pending dynamically from this PL's leave requests.
  // Approved leave is deducted IMMEDIATELY (not after endDate).
  const ownLeaveRequests = employeeId
    ? await prisma.leaveRequest.findMany({
        where: { employeeId, status: { in: ["PENDING", "APPROVED"] } },
        select: { leaveTypeId: true, days: true, status: true },
      })
    : []
  const ownStats = new Map<string, { used: number; pending: number }>()
  for (const r of ownLeaveRequests) {
    const cur = ownStats.get(r.leaveTypeId) ?? { used: 0, pending: 0 }
    if (r.status === "APPROVED") cur.used += r.days
    else if (r.status === "PENDING") cur.pending += r.days
    ownStats.set(r.leaveTypeId, cur)
  }
  // PLs aren't interns, so hide intern-only types.
  const leaveBalanceSummary = leaveTypes
    .filter(lt => !lt.internOnly)
    .filter(lt => !lt.genderSpecific || !employee?.gender || lt.genderSpecific === employee.gender)
    .map(lt => {
      const bal = employee?.leaveBalances.find(b => b.leaveTypeId === lt.id)
      const stats = ownStats.get(lt.id) ?? { used: 0, pending: 0 }
      const allocated = bal?.allocated ?? lt.defaultDays
      return { name: lt.name, allocated, used: stats.used, pending: stats.pending, remaining: Math.max(0, allocated - stats.used - stats.pending) }
    })

  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : (session?.user?.name ?? "Project Lead")
  const completeness = employee ? calcCompleteness(employee) : null
  const tenure = employee ? timeInCompany(employee.hireDate) : null

  const deptLabel = deptNames.length === 1
    ? deptNames[0]
    : deptNames.length > 1
      ? `${deptNames.slice(0, 2).join(", ")}${deptNames.length > 2 ? ` +${deptNames.length - 2} more` : ""}`
      : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DashboardAnnouncements />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16, overflow: "hidden", position: "relative",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a4e 100%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(99,102,241,0.15)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: 200, width: 260, height: 260, borderRadius: "50%", background: "rgba(16,185,129,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 84, height: 84, borderRadius: "50%", padding: 3, background: "linear-gradient(135deg,#6366F1,#EC4899,#F59E0B)", flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#1a1a2e" }}>
              <Avatar name={fullName} photo={employee?.profilePhoto ?? undefined} size={78} />
            </div>
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
              Good {greeting}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.2 }}>{fullName}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                {employee?.jobTitle ?? "Project Lead"}
              </span>
              {(deptLabel || employee?.department?.name) && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    <Building2 size={11} /> {deptLabel ?? employee?.department?.name}
                  </span>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {employee?.employeeId && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", borderRadius: 6, padding: "3px 10px", border: "1px solid rgba(74,222,128,0.2)" }}>
                  ID: {employee.employeeId}
                </span>
              )}
              {employee?.employeeStatus && <Badge status={employee.employeeStatus} />}
              {tenure && tenure !== "—" && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  <Clock size={10} /> {tenure}
                </span>
              )}
            </div>
          </div>
          {/* Right actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {completeness !== null && (
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: completeness >= 80 ? "#10B981" : completeness >= 50 ? "#F59E0B" : "#EC4899" }}>
                  {completeness}%
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Profile</div>
              </div>
            )}
            <Link href="/project-lead/self-service/edit" style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              color: "white", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}>
              <Edit2 size={12} /> Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── Team Stats ───────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
        {[
          { label: "Team Size",        value: teamSize,          color: "var(--primary)" },
          { label: "Active",           value: active,            color: "var(--success)" },
          { label: "On Leave",         value: onLeave,           color: "var(--warning)" },
          { label: "Pending Approval", value: pendingLeaveCount, color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "4px 2px" }}>
          {QUICK_ACTIONS.map(a => (
            <Link key={a.label} href={a.href} style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 999,
              background: `${a.color}14`, border: `1.5px solid ${a.color}30`,
              color: a.color, fontWeight: 700, fontSize: 13,
              textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <a.icon size={14} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Pending approval banner ───────────────────────────────────────────── */}
      {pendingLeaveCount > 0 && (
        <div style={{ padding: "12px 16px", background: "rgba(234,179,8,0.1)", border: "1px solid var(--warning)", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--warning)" }}>
          {pendingLeaveCount} leave request{pendingLeaveCount !== 1 ? "s" : ""} awaiting your approval —{" "}
          <a href="/project-lead/requests/leave" style={{ color: "inherit", textDecoration: "underline" }}>Review now</a>
        </div>
      )}

      {/* ── Leave Balances ────────────────────────────────────────────────────── */}
      {leaveBalanceSummary.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Leave Balances</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{leaveBalanceSummary.length} type{leaveBalanceSummary.length !== 1 ? "s" : ""}</div>
            </div>
            <Link href="/project-lead/requests/leave" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Request leave
            </Link>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {leaveBalanceSummary.map((lb, i) => {
              const accent = ACCENTS[i % ACCENTS.length]
              const pct = lb.allocated > 0 ? Math.min(100, (lb.remaining / lb.allocated) * 100) : 0
              return (
                <div key={lb.name} style={{
                  borderRadius: 12, padding: 14, border: `1px solid ${accent}22`,
                  background: `linear-gradient(135deg, ${accent}0A 0%, ${accent}05 100%)`,
                  display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}44)`, borderRadius: "12px 12px 0 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 2 }}>{lb.name}</div>
                      {lb.pending > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#F59E0B22", color: "#F59E0B", border: "1px solid #F59E0B33" }}>
                          {lb.pending}d pending
                        </span>
                      )}
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CalendarDays size={12} style={{ color: accent }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: accent, lineHeight: 1 }}>{lb.remaining}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>/ {lb.allocated}d</span>
                  </div>
                  <div>
                    <div style={{ height: 4, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{lb.used} used</span>
                      <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{lb.remaining} left</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Who's On Leave ────────────────────────────────────────────────────── */}
      <DeptOrgLeaveCard deptOnLeave={deptOnLeave} />

      {/* ── Panels ────────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap: 20 }}>
        <RecentEmployeesPanel employees={teamMembers} viewAllHref="/project-lead/people" />
        <PendingLeavePanel leaveRequests={pendingLeaveRequests} viewAllHref="/project-lead/requests/leave" />
        <CelebrationsCard />
        <AnnouncementsCard />
      </div>

      {/* ── Intern Reports This Week ──────────────────────────────────────────── */}
      {internReportsThisWeek.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginTop: 4 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList size={18} style={{ color: "var(--primary)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Intern Reports This Week</div>
                {internReportsPendingReview > 0 && (
                  <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginTop: 2 }}>
                    {internReportsPendingReview} pending your review
                  </div>
                )}
              </div>
            </div>
            <Link href="/project-lead/intern-reports" style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
              View all →
            </Link>
          </div>
          <div>
            {internReportsThisWeek.map((r: any) => (
              <div key={r.id} style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employee.firstName} {r.employee.lastName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{(r.totalHours ?? 0).toFixed(1)}h logged</div>
                </div>
                <span style={{
                  padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: r.status === "REVIEWED" || r.status === "ATTENDANCE_FILLED" ? "#DCFCE7" : r.status === "SUBMITTED" || r.status === "LATE" ? "#DBEAFE" : r.status === "MISSING" ? "#FEE2E2" : "#F3F4F6",
                  color: r.status === "REVIEWED" || r.status === "ATTENDANCE_FILLED" ? "#15803D" : r.status === "SUBMITTED" || r.status === "LATE" ? "#1D4ED8" : r.status === "MISSING" ? "#DC2626" : "#6B7280",
                }}>
                  {r.status === "SUBMITTED" ? "Submitted" : r.status === "LATE" ? "Late" : r.status === "REVIEWED" ? "Reviewed" : r.status === "ATTENDANCE_FILLED" ? "Completed" : r.status === "MISSING" ? "Missed" : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
