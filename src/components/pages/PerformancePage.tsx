"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { TrendingUp, Plus, Target, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import StatCard from "@/components/ui/StatCard"
import { useCurrentUser } from "@/hooks/useCurrentUser"

export default function PerformancePage() {
  const { user } = useCurrentUser()
  const [kpis, setKpis] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"kpis"|"cycles">("kpis")
  const [addOpen, setAddOpen] = useState(false)
  const [cycleName, setCycleName] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/performance")
    const d = await r.json()
    setKpis(d.kpis ?? [])
    setCycles(d.cycles ?? [])
    setEmployees(d.employees ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createCycle = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)
    await fetch("/api/performance/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.get("name"), year: data.get("year"), half: data.get("half"), startDate: data.get("startDate"), endDate: data.get("endDate") })
    })
    setAddOpen(false)
    load()
  }

  const totalKPIs = kpis.length
  const approved = kpis.filter(k => k.status === "APPROVED").length
  const pending = kpis.filter(k => k.status === "SUBMITTED").length
  const rejected = kpis.filter(k => k.status === "REJECTED").length

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Performance Management</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>KPIs, appraisals and performance cycles</p>
        </div>
        {user?.caps.canManagePerformanceCycles && (
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> New Cycle</Button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total KPIs" value={totalKPIs} icon={Target} color="var(--primary)" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} color="var(--success)" />
        <StatCard label="Pending Review" value={pending} icon={Clock} color="var(--warning)" />
        <StatCard label="Rejected" value={rejected} icon={AlertCircle} color="var(--danger)" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["kpis","cycles"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t === "kpis" ? "KPIs" : "Cycles"}
          </button>
        ))}
      </div>

      {tab === "kpis" && (
        <Card>
          {loading ? <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
          : kpis.length === 0 ? <EmptyState icon={Target} title="No KPIs yet" description="KPIs will appear here once performance cycles are created." />
          : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Employee","KPI","Weight","Progress","Status"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi: any) => (
                  <tr key={kpi.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${kpi.employee?.firstName} ${kpi.employee?.lastName}`} size={32} />
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{kpi.employee?.firstName} {kpi.employee?.lastName}</div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{kpi.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{kpi.keyResultArea ?? "—"}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13 }}>{kpi.weight}%</td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, background: "var(--primary)", width: `${kpi.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", minWidth: 30 }}>{kpi.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}><Badge status={kpi.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      )}

      {tab === "cycles" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
          {cycles.length === 0 ? (
            <Card style={{ gridColumn: "1/-1" }}>
              <EmptyState icon={TrendingUp} title="No performance cycles" description="Create a performance cycle to start tracking KPIs." action={user?.caps.canManagePerformanceCycles ? <Button onClick={() => setAddOpen(true)}><Plus size={14} /> New Cycle</Button> : undefined} />
            </Card>
          ) : cycles.map((cycle: any) => (
            <Card key={cycle.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14 }}>{cycle.name}</h3>
                {cycle.isActive && <span style={{ background: "var(--success-bg)", color: "var(--success)", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>Active</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                <div>H{cycle.half} {cycle.year}</div>
                <div>{new Date(cycle.startDate).toLocaleDateString()} → {new Date(cycle.endDate).toLocaleDateString()}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Create Performance Cycle" width={480}>
        <form onSubmit={createCycle}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {[["Cycle Name","name","text"],["Year","year","number"],["Start Date","startDate","date"],["End Date","endDate","date"]].map(([label,name,type]) => (
              <div key={name}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label} <span style={{ color: "var(--accent)" }}>*</span></label>
                <input type={type} name={name} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Half</label>
              <select name="half" style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                <option value="1">H1 (Jan–Jun)</option>
                <option value="2">H2 (Jul–Dec)</option>
              </select>
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Cycle</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
