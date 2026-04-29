"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import EmptyState from "@/components/ui/EmptyState"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { UserMinus, Plus, CheckCircle2, Circle, Loader2, ClipboardList } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const EXIT_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation", TERMINATION: "Termination",
  RETIREMENT: "Retirement", CONTRACT_END: "Contract End", REDUNDANCY: "Redundancy",
}

export default function OffboardingPage() {
  const { user } = useCurrentUser()
  const [offboardings, setOffboardings] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: "", exitType: "RESIGNATION", lastWorkingDay: "", reason: "" })
  const [managingOb, setManagingOb] = useState<any>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmTask, setConfirmTask] = useState<{ taskId: string; taskTitle: string; empName: string } | null>(null)
  const [confirmInitiate, setConfirmInitiate] = useState(false)
  const [pendingForm, setPendingForm] = useState<typeof form | null>(null)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/offboarding")
    const d = await r.json()
    setOffboardings(d.offboardings ?? [])
    setEmployees(d.employees ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setPendingForm({ ...form })
    setConfirmInitiate(true)
  }

  const confirmAndSubmit = async () => {
    if (!pendingForm) return
    setConfirmInitiate(false)
    await fetch("/api/offboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingForm) })
    setAddOpen(false); load()
  }

  const toggleTask = async (taskId: string) => {
    setConfirmTask(null)
    setTogglingId(taskId)
    const r = await fetch(`/api/offboarding/tasks/${taskId}`, { method: "PATCH" })
    const d = await r.json()
    if (d.offboarding) {
      setManagingOb(d.offboarding)
      setOffboardings(prev => prev.map(o => o.id === d.offboarding.id ? d.offboarding : o))
    }
    setTogglingId(null)
  }

  const requestConfirm = (task: any) => {
    const empName = `${managingOb?.employee?.firstName} ${managingOb?.employee?.lastName}`
    if (task.status === "PENDING") {
      setConfirmTask({ taskId: task.id, taskTitle: task.title, empName })
    } else {
      toggleTask(task.id)
    }
  }

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

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
        {loading
          ? <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
          : offboardings.length === 0
          ? <EmptyState icon={UserMinus} title="No active offboardings" description="Initiate an exit process for a departing employee." action={user?.caps.canManageOffboarding ? <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Initiate Exit</Button> : undefined} />
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Employee", "Exit Type", "Last Day", "Status", "Progress", ""].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offboardings.map((o: any) => {
                    const total = o.tasks?.length ?? 0
                    const done = o.tasks?.filter((t: any) => t.status === "COMPLETED").length ?? 0
                    const pct = total ? Math.round((done / total) * 100) : 0
                    return (
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
                        <td style={{ padding: "14px 20px", fontSize: 13 }}>{EXIT_TYPE_LABEL[o.exitType] ?? o.exitType?.replace(/_/g, " ")}</td>
                        <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{formatDate(o.lastWorkingDay)}</td>
                        <td style={{ padding: "14px 20px" }}><Badge status={o.status} /></td>
                        <td style={{ padding: "14px 20px", minWidth: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 3, background: pct === 100 ? "var(--success)" : "var(--primary)", width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{done}/{total}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <button
                            onClick={() => setManagingOb(o)}
                            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                          >
                            <ClipboardList size={13} /> Manage
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Task management modal */}
      <Modal open={!!managingOb} onClose={() => setManagingOb(null)} title="Offboarding Checklist" width={520}>
        {managingOb && (
          <div>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={`${managingOb.employee?.firstName} ${managingOb.employee?.lastName}`} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{managingOb.employee?.firstName} {managingOb.employee?.lastName}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {EXIT_TYPE_LABEL[managingOb.exitType] ?? managingOb.exitType} · Last day: {formatDate(managingOb.lastWorkingDay)}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}><Badge status={managingOb.status} /></div>
            </div>

            <div style={{ padding: "8px 0" }}>
              {(managingOb.tasks ?? []).map((task: any, i: number) => {
                const completed = task.status === "COMPLETED"
                const isToggling = togglingId === task.id
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "13px 24px",
                      borderBottom: i < managingOb.tasks.length - 1 ? "1px solid var(--border)" : "none",
                      background: completed ? "var(--muted)" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <button
                      onClick={() => !isToggling && requestConfirm(task)}
                      disabled={isToggling}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
                    >
                      {isToggling
                        ? <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--primary)" }} />
                        : completed
                        ? <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
                        : <Circle size={20} style={{ color: "var(--muted-foreground)" }} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: completed ? "line-through" : "none" }}>
                        {task.title}
                      </div>
                      {task.assignedTo && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                          {task.assignedTo}
                        </div>
                      )}
                    </div>
                    {completed && (
                      <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>Done</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm" onClick={() => setManagingOb(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Initiate exit modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Initiate Exit Process" width={500}>
        <form onSubmit={submit}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Employee <span style={{ color: "var(--accent)" }}>*</span></label>
              <select required value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} style={fi}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Exit Type <span style={{ color: "var(--accent)" }}>*</span></label>
              <select value={form.exitType} onChange={e => setForm(f => ({ ...f, exitType: e.target.value }))} style={fi}>
                <option value="RESIGNATION">Resignation</option>
                <option value="TERMINATION">Termination</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="CONTRACT_END">Contract End</option>
                <option value="REDUNDANCY">Redundancy</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Last Working Day <span style={{ color: "var(--accent)" }}>*</span></label>
              <input type="date" required value={form.lastWorkingDay} onChange={e => setForm(f => ({ ...f, lastWorkingDay: e.target.value }))} style={fi} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} style={{ ...fi, resize: "vertical" }} />
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger">Initiate Exit</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm initiate exit */}
      <Modal open={confirmInitiate} onClose={() => setConfirmInitiate(false)} title="Confirm Exit Process" width={420}>
        {pendingForm && (
          <div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Are you sure you want to initiate the exit process for{" "}
                <strong>
                  {employees.find(e => e.id === pendingForm.employeeId)?.firstName}{" "}
                  {employees.find(e => e.id === pendingForm.employeeId)?.lastName}
                </strong>?{" "}
                This will create an offboarding checklist and cannot be undone.
              </p>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmInitiate(false)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={confirmAndSubmit}>Yes, Initiate Exit</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm task completion */}
      <Modal open={!!confirmTask} onClose={() => setConfirmTask(null)} title="Confirm Task" width={420}>
        {confirmTask && (
          <div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Are you sure <strong>{confirmTask.empName}</strong> has completed{" "}
                <strong>"{confirmTask.taskTitle}"</strong>?
              </p>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmTask(null)}>Cancel</Button>
              <Button size="sm" onClick={() => toggleTask(confirmTask.taskId)}>Yes, Mark Complete</Button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
