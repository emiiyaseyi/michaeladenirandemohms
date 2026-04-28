"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import EmptyState from "@/components/ui/EmptyState"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { UserMinus, Plus, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"

export default function OffboardingPage() {
  const { user } = useCurrentUser()
  const [offboardings, setOffboardings] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: "", exitType: "RESIGNATION", lastWorkingDay: "", reason: "" })

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/offboarding")
    const d = await r.json()
    setOffboardings(d.offboardings ?? [])
    setEmployees(d.employees ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/offboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setAddOpen(false); load()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Offboarding</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Manage employee exits systematically</p>
        </div>
        {user?.caps.canManageOffboarding && (
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Initiate Exit</Button>
        )}
      </div>
      <Card>
        {loading ? <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        : offboardings.length === 0 ? <EmptyState icon={UserMinus} title="No active offboardings" description="Initiate an exit process for a departing employee." action={user?.caps.canManageOffboarding ? <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Initiate Exit</Button> : undefined} />
        : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Employee","Exit Type","Last Day","Status","Progress"].map(h => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {offboardings.map((o: any) => (
                <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${o.employee?.firstName} ${o.employee?.lastName}`} size={34} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.employee?.firstName} {o.employee?.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{o.employee?.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13 }}>{o.exitType?.replace(/_/g," ")}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{formatDate(o.lastWorkingDay)}</td>
                  <td style={{ padding: "14px 20px" }}><Badge status={o.status} /></td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {(() => {
                        const total = o.tasks?.length ?? 0
                        const done = o.tasks?.filter((t: any) => t.status === "COMPLETED").length ?? 0
                        const pct = total ? Math.round((done/total)*100) : 0
                        return <>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: "var(--primary)", width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{done}/{total}</span>
                        </>
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Initiate Exit Process" width={500}>
        <form onSubmit={submit}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Employee <span style={{ color: "var(--accent)" }}>*</span></label>
              <select required value={form.employeeId} onChange={e => setForm(f => ({...f, employeeId: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Exit Type <span style={{ color: "var(--accent)" }}>*</span></label>
              <select value={form.exitType} onChange={e => setForm(f => ({...f, exitType: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                <option value="RESIGNATION">Resignation</option>
                <option value="TERMINATION">Termination</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="CONTRACT_END">Contract End</option>
                <option value="REDUNDANCY">Redundancy</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Last Working Day <span style={{ color: "var(--accent)" }}>*</span></label>
              <input type="date" required value={form.lastWorkingDay} onChange={e => setForm(f => ({...f, lastWorkingDay: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} rows={3} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger">Initiate Exit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
