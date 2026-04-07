"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import EmptyState from "@/components/ui/EmptyState"
import { UserCheck, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import StatCard from "@/components/ui/StatCard"
import { formatDate } from "@/lib/utils"

export default function OnboardingPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/onboarding").then(r => r.json()).then(d => { setTasks(d.tasks ?? []); setLoading(false) })
  }, [])

  const pending = tasks.filter(t => t.status === "PENDING").length
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length
  const completed = tasks.filter(t => t.status === "COMPLETED").length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Onboarding</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Track new employee onboarding progress</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Pending Tasks" value={pending} icon={Clock} color="var(--warning)" />
        <StatCard label="In Progress" value={inProgress} icon={AlertCircle} color="var(--info)" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="var(--success)" />
      </div>

      <Card>
        {loading ? <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        : tasks.length === 0 ? <EmptyState icon={UserCheck} title="No onboarding tasks" description="Onboarding tasks are created when new employees are added via the ATS or manually." />
        : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Employee","Task","Category","Assigned To","Due Date","Status"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${t.employee?.firstName} ${t.employee?.lastName}`} size={32} />
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.employee?.firstName} {t.employee?.lastName}</div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 500 }}>{t.title}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12 }}><span style={{ background: "var(--muted)", padding: "3px 10px", borderRadius: 999, fontWeight: 600, color: "var(--muted-foreground)" }}>{t.category}</span></td>
                  <td style={{ padding: "14px 20px", fontSize: 13 }}>{t.assignedTo ?? "—"}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--muted-foreground)" }}>{formatDate(t.dueDate)}</td>
                  <td style={{ padding: "14px 20px" }}><Badge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
