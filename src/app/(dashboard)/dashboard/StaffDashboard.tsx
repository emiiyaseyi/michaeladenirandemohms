"use client"
import { useState, useEffect } from "react"
import Avatar from "@/components/ui/Avatar"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Link from "next/link"
import {
  Building2, UserCheck, Briefcase, CalendarDays, Clock, Edit2,
  ChevronRight, Cake, Award, ArrowRight, Loader2, AlertCircle,
  CalendarCheck, Star, FileText, HelpCircle, ShoppingBag, Users,
  TrendingUp, CheckCircle, XCircle, Phone, Mail,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { roleLabel } from "@/lib/rbac"

function ProfileCompleteness({ value }: { value: number }) {
  const color = value >= 80 ? "var(--success)" : value >= 50 ? "var(--warning)" : "var(--accent)"
  const circumference = 2 * Math.PI * 20
  const offset = circumference - (value / 100) * circumference
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle cx="28" cy="28" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color }}>
          {value}%
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Profile {value < 100 ? "Incomplete" : "Complete"}</div>
        <Link href="/self-service/edit" style={{ display: "inline-flex", alignItems: "center", gap: 4, color, fontSize: 12, fontWeight: 600, textDecoration: "none", marginTop: 2 }}>
          Edit profile <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

function BalanceChip({ lb }: { lb: any }) {
  const pct = lb.allocated > 0 ? Math.min(100, (lb.remaining / lb.allocated) * 100) : 0
  const color = pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--accent)"
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{lb.name}</div>
        {lb.pending > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--warning-bg)", color: "var(--warning)" }}>{lb.pending}d pending</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{lb.remaining}</span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/ {lb.allocated} days</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{lb.used} used · {lb.remaining} remaining</div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} style={{ color: "var(--primary)" }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, href, color = "var(--primary)" }: { icon: any; label: string; href: string; color?: string }) {
  return (
    <Link href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", textDecoration: "none", transition: "all 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${color}20` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", textAlign: "center" }}>{label}</span>
    </Link>
  )
}

export default function StaffDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/self-service/profile")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError("Failed to load profile"); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, gap: 12, color: "var(--muted-foreground)" }}>
      <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
      <span style={{ fontSize: 14 }}>Loading your dashboard…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !data?.profile) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 60, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={28} style={{ color: "var(--muted-foreground)" }} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Employee Profile Found</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          {error ?? "Your account is not linked to an employee record. Contact HR to set up your profile."}
        </div>
      </div>
    </div>
  )

  const { profile, leaveBalances, teamOnLeave, upcomingEvents } = data
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, var(--primary) 0%, #0a6630 100%)",
        borderRadius: 16, padding: "24px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "white",
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            {greeting}, {profile.firstName} 👋
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {profile.jobTitle ?? roleLabel(profile.role)} · {profile.department ?? "DSN"} · {profile.timeInCompany}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Employee ID</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80" }}>{profile.employeeId}</div>
          </div>
          <Avatar name={profile.fullName} photo={profile.profilePhoto} size={52} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

        {/* Left: Profile Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ padding: "20px 20px 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>My Profile</span>
                <Link href="/self-service/edit" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                  <Edit2 size={12} /> Edit
                </Link>
              </div>
              <ProfileCompleteness value={profile.completeness} />
            </div>
            <div style={{ padding: "8px 20px 12px" }}>
              <InfoItem icon={Building2} label="Department" value={profile.department} />
              <InfoItem icon={UserCheck} label="Manager" value={profile.supervisor?.name} />
              <InfoItem icon={Users} label="Department Lead" value={profile.departmentLead?.name} />
              <InfoItem icon={CalendarDays} label="Work Anniversary" value={profile.workAnniversary} />
              <InfoItem icon={Clock} label="Time in Company" value={profile.timeInCompany} />
              {profile.activeProjects?.length > 0 && (
                <div style={{ padding: "10px 0" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <Briefcase size={14} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 4 }}>Active Projects</div>
                      {profile.activeProjects.map((p: any) => (
                        <div key={p.id} style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
                          {p.name}{p.role && <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>· {p.role}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              <Link href="/self-service/edit" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                <Edit2 size={13} /> Update Profile <ArrowRight size={13} style={{ marginLeft: "auto" }} />
              </Link>
            </div>
          </Card>

          {/* Quick actions */}
          <Card>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Quick Actions</span>
            </div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <QuickAction icon={CalendarDays} label="Apply Leave" href="/self-service/leave" color="var(--primary)" />
              <QuickAction icon={FileText} label="Documents" href="/documents" color="#6366F1" />
              <QuickAction icon={ShoppingBag} label="Requisition" href="/self-service/requisitions" color="#F59E0B" />
              <QuickAction icon={HelpCircle} label="Grievance" href="/self-service/grievance" color="var(--accent)" />
            </div>
          </Card>
        </div>

        {/* Right: Leave Balances + Team + Events */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {leaveBalances?.length > 0 && (
            <Card>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Leave Balances</div>
                <Link href="/self-service/leave" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  Apply for leave <ChevronRight size={13} />
                </Link>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {leaveBalances.map((lb: any) => <BalanceChip key={lb.leaveTypeId} lb={lb} />)}
              </div>
            </Card>
          )}

          {/* Team on leave */}
          <Card>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Team Leave</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Colleagues currently away or on approved leave</div>
              </div>
              {teamOnLeave?.length > 0 && <span style={{ fontSize: 12, color: "var(--muted-foreground)", alignSelf: "center" }}>{teamOnLeave.length} away</span>}
            </div>
            {!teamOnLeave?.length ? (
              <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <CalendarCheck size={22} style={{ marginBottom: 8, opacity: 0.4, display: "block", margin: "0 auto 8px" }} />
                All team members are in — nobody on leave right now
              </div>
            ) : (
              <div>
                {teamOnLeave.map((m: any) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid var(--border)" }}>
                    <Avatar name={m.name} photo={m.profilePhoto} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{m.jobTitle ?? "—"}</div>
                    </div>
                    {m.currentLeave && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--info)", background: "var(--info-bg)", borderRadius: 5, padding: "2px 7px", display: "inline-block" }}>{m.currentLeave.leaveType}</div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>Until {formatDate(m.currentLeave.endDate, "MMM d")}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming celebrations */}
          <Card>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Upcoming Celebrations</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Birthdays & anniversaries in the next 60 days</div>
            </div>
            {!upcomingEvents?.length ? (
              <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <Star size={22} style={{ marginBottom: 8, opacity: 0.4, display: "block", margin: "0 auto 8px" }} />
                No upcoming celebrations in the next 60 days
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {upcomingEvents.slice(0, 6).map((ev: any, i: number) => {
                  const isBday = ev.type === "birthday"
                  const daysUntil = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", borderBottom: "1px solid var(--border)", borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: isBday ? "#FEF3C7" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isBday ? <Cake size={16} style={{ color: "#D97706" }} /> : <Award size={16} style={{ color: "#6366F1" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{isBday ? "Birthday" : `${ev.years}yr anniversary`}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isBday ? "#D97706" : "#6366F1", whiteSpace: "nowrap" }}>
                        {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
