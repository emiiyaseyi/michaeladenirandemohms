"use client"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import { formatDate } from "@/lib/utils"
import { Clock } from "lucide-react"

interface LeaveRequest {
  id: string
  days: number
  startDate: Date | string
  endDate: Date | string
  employee: { firstName: string; lastName: string; profilePhoto?: string | null }
  leaveType: { name: string }
}

interface Props {
  leaveRequests: LeaveRequest[]
  viewAllHref?: string
}

export default function PendingLeavePanel({ leaveRequests, viewAllHref = "/admin/requests/leave" }: Props) {
  return (
    <Card>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Pending Leave Requests</h3>
        <a href={viewAllHref} style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
      </div>
      {leaveRequests.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No pending requests</div>
      ) : (
        <div>
          {leaveRequests.map(req => (
            <a
              key={req.id}
              href={viewAllHref}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)", transition: "background 0.1s", textDecoration: "none", color: "inherit" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
            >
              <Avatar name={`${req.employee.firstName} ${req.employee.lastName}`} photo={req.employee.profilePhoto ?? undefined} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {req.employee.firstName} {req.employee.lastName}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {req.leaveType.name} · {req.days} day{req.days !== 1 ? "s" : ""} · {formatDate(req.startDate)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--warning)", flexShrink: 0 }}>
                <Clock size={11} /> Pending
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  )
}
