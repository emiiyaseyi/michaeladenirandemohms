"use client"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import { Briefcase } from "lucide-react"

export default function EmployeePreviewModal({ employee }: { employee: any }) {
  const activeProjects = (employee?.projectAssignments ?? []).filter((a: any) => a.project?.status === "ACTIVE")

  return (
    <div style={{ padding: 24, maxHeight: "75vh", overflowY: "auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
        padding: "16px 20px",
        background: "linear-gradient(135deg, var(--primary) 0%, #0a6630 100%)",
        borderRadius: 12, color: "white",
      }}>
        <Avatar name={`${employee.firstName} ${employee.lastName}`} photo={employee.profilePhoto} size={64} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
            {employee.firstName} {employee.lastName}
          </h2>
          <p style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            {employee.jobTitle ?? "—"} · {employee.department?.name ?? "—"}
          </p>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            {employee.employeeId} · {employee.workEmail}
          </p>
          <div style={{ marginTop: 6 }}><Badge status={employee.employeeStatus} /></div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Employee ID",      value: employee.employeeId },
          { label: "Email",            value: employee.workEmail },
          { label: "Phone",            value: employee.phone ?? "—" },
          { label: "Employment Type",  value: employee.employmentType?.replace(/_/g, " ") },
          { label: "Hire Date",        value: formatDate(employee.hireDate) },
          { label: "Department",       value: employee.department?.name ?? "—" },
          { label: "Manager",          value: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "—" },
          { label: "Category",         value: employee.category === "TECHNICAL" ? "Technical" : "Non-Technical" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>
          <Briefcase size={13} /> Active Projects
        </div>
        {activeProjects.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>No active projects</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {activeProjects.map((a: any) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: 20, padding: "4px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>{a.project?.name}</span>
                {a.role && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>· {a.role}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
