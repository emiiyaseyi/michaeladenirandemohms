"use client"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { CalendarDays, Inbox, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

const SECTIONS = [
  { id: "leave", label: "Leave", icon: CalendarDays, path: "/requests/leave" },
]

const LEAVE_COLS = ["Type", "Start Date", "End Date", "Days", "Status"]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED:             { bg: "#DCFCE7", color: "#16a34a", label: "Approved" },
  REJECTED:             { bg: "#FEE2E2", color: "#DC2626", label: "Rejected" },
  CANCELLED:            { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  CANCELLED_BY_ADMIN:   { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  PENDING_PROJECT_LEAD: { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
  PENDING_HR_ADMIN:     { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
  PENDING:              { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
}

const th: React.CSSProperties = {
  padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: "1px solid var(--border)", background: "var(--card)", whiteSpace: "nowrap",
}
const td: React.CSSProperties = { padding: "12px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

export default function RequestsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const base = pathname?.startsWith("/project-lead") ? "/project-lead" : "/staff"

  const [active, setActive] = useState("leave")
  const [leaveRows, setLeaveRows] = useState<any[]>([])
  const [myEmpId, setMyEmpId] = useState("")
  const [loading, setLoading] = useState(false)

  const section = SECTIONS.find(s => s.id === active)!

  // Get own employee id once
  useEffect(() => {
    fetch("/api/self-service/employee-raw")
      .then(r => r.json())
      .then(d => { if (d?.employee?.id) setMyEmpId(d.employee.id) })
      .catch(() => {})
  }, [])

  // Load leave data when leave tab is active (and we have the employee id)
  useEffect(() => {
    if (active !== "leave") return
    setLoading(true)
    fetch("/api/leave")
      .then(r => r.json())
      .then(d => {
        const all: any[] = d.requests ?? []
        // Only show the current user's own requests in the index overview
        const mine = myEmpId ? all.filter(r => r.employeeId === myEmpId) : all
        setLeaveRows(mine)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [active, myEmpId])

  return (
    <div style={{ display: "flex", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", minHeight: 520 }}>

      {/* Left nav */}
      <div style={{ width: 220, borderRight: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ padding: "18px 20px 12px", fontWeight: 800, fontSize: 14, borderBottom: "1px solid var(--border)" }}>
          All Requests
        </div>
        {SECTIONS.map(s => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "13px 20px", background: "none",
                borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                borderTop: "none", borderRight: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer", textAlign: "left", fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "var(--primary)" : "var(--foreground)",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: isActive ? "var(--primary)" : "var(--muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={15} color={isActive ? "white" : "var(--muted-foreground)"} />
              </div>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{section.label}</span>
          <button
            onClick={() => router.push(`${base}${section.path}`)}
            style={{ padding: "8px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >
            Manage Leave
          </button>
        </div>

        {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}>
              <Loader2 size={15} style={{ animation: "spin .8s linear infinite" }} /> Loading…
            </div>
          ) : leaveRows.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 40px" }}>
              <Inbox size={38} style={{ color: "var(--border)" }} />
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No leave requests yet</span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{LEAVE_COLS.map(c => <th key={c} style={th}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {leaveRows.slice(0, 10).map((req: any) => {
                    const badge = STATUS_BADGE[req.currentStage ?? req.status] ?? { bg: "#F3F4F6", color: "#6B7280", label: req.status }
                    return (
                      <tr key={req.id}
                        onClick={() => router.push(`${base}${section.path}`)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                        <td style={td}>{req.leaveType?.name ?? "—"}</td>
                        <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(req.startDate)}</td>
                        <td style={{ ...td, color: "var(--muted-foreground)" }}>{formatDate(req.endDate)}</td>
                        <td style={{ ...td, color: "var(--muted-foreground)" }}>{req.days ?? "—"}</td>
                        <td style={td}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {leaveRows.length > 10 && (
                <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
                  Showing 10 of {leaveRows.length} — <button onClick={() => router.push(`${base}${section.path}`)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}>View all</button>
                </div>
              )}
            </div>
          )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
