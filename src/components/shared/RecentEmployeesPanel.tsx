"use client"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"

interface Props {
  employees: any[]
  viewAllHref?: string
}

export default function RecentEmployeesPanel({ employees, viewAllHref = "/admin/people/employees" }: Props) {
  return (
    <Card>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent Employees</h3>
        <a href={viewAllHref} style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
      </div>
      {employees.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No employees yet</div>
      ) : (
        <div>
          {employees.map((emp: any) => (
            <div
              key={emp.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border-light, #f5f7fa)", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
            >
              <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.firstName} {emp.lastName}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.jobTitle ?? "—"} · {emp.department?.name ?? "—"}</div>
              </div>
              <Badge status={emp.employeeStatus} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
