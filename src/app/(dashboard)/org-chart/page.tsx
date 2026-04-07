"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { GitBranch, Users, Building2 } from "lucide-react"

function OrgNode({ emp, depth = 0 }: { emp: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = emp.directReports?.length > 0

  return (
    <div style={{ marginLeft: depth > 0 ? 32 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
        {depth > 0 && <div style={{ width: 24, height: 1, background: "var(--border)", marginRight: 8, flexShrink: 0 }} />}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 220, cursor: hasChildren ? "pointer" : "default", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }} onClick={() => hasChildren && setExpanded(e => !e)}>
          <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{emp.jobTitle ?? "—"}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{emp.department?.name ?? "—"}</div>
          </div>
          {hasChildren && <div style={{ fontSize: 11, background: "var(--muted)", borderRadius: 999, padding: "2px 8px", fontWeight: 700, color: "var(--muted-foreground)" }}>{emp.directReports.length}</div>}
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ borderLeft: "1px solid var(--border)", marginLeft: depth > 0 ? 20 : 20, paddingLeft: 0, marginTop: 0 }}>
          {emp.directReports.map((report: any) => (
            <OrgNode key={report.id} emp={report} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [roots, setRoots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"tree"|"departments">("departments")

  useEffect(() => {
    fetch("/api/org-chart").then(r => r.json()).then(d => {
      setDepartments(d.departments ?? [])
      setRoots(d.roots ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Organisation Chart</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Visualise your organisation structure</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["departments","tree"] as const).map(t => (
          <button key={t} onClick={() => setView(t)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === t ? "var(--card)" : "transparent", color: view === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: view === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t === "departments" ? "Departments" : "Reporting Tree"}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
      : view === "departments" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
          {departments.length === 0 ? (
            <Card style={{ gridColumn: "1/-1" }}>
              <EmptyState icon={Building2} title="No departments yet" description="Create departments in Settings to build your org structure." />
            </Card>
          ) : departments.map((d: any) => (
            <Card key={d.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-50, #EBF3FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 size={18} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</h3>
                  {d.division && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division.name}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Users size={13} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{d._count?.employees ?? 0} employee{(d._count?.employees ?? 0) !== 1 ? "s" : ""}</span>
              </div>
              {d.employees?.slice(0,3).map((e: any) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Avatar name={`${e.firstName} ${e.lastName}`} size={24} />
                  <span style={{ fontSize: 12 }}>{e.firstName} {e.lastName}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ padding: 24 }}>
          {roots.length === 0 ? <EmptyState icon={GitBranch} title="No reporting structure" description="Add managers to employees to build the reporting tree." />
          : roots.map((r: any) => <OrgNode key={r.id} emp={r} />)}
        </Card>
      )}
    </div>
  )
}
