"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { LogOut, CheckCircle2, Circle, Loader2, UserMinus, Send } from "lucide-react"
import { formatDate } from "@/lib/utils"

const EXIT_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation", TERMINATION: "Termination",
  RETIREMENT: "Retirement", CONTRACT_END: "Contract End", REDUNDANCY: "Redundancy",
}

const CATEGORY_COLOR: Record<string, string> = {
  ADMIN: "#6366F1", IT: "#0EA5E9", FINANCE: "#10B981", HR: "#F59E0B",
  EMPLOYEE: "#8B5CF6", TEAM_LEAD: "#F59E0B", SUPER_ADMIN: "#EF4444",
}

export default function SSExitPage() {
  const [offboarding, setOffboarding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)
  const [form, setForm] = useState({ exitType: "RESIGNATION", reason: "", intendedLastDay: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    fetch("/api/self-service/exit")
      .then(r => r.json())
      .then(d => { setOffboarding(d.offboarding ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const requestConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setConfirmStep(true)
  }

  const submitRequest = async () => {
    setSubmitting(true); setSubmitError("")
    try {
      const r = await fetch("/api/self-service/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (r.ok) { setSubmitted(true); setModalOpen(false); setConfirmStep(false) }
      else setSubmitError(d.error ?? "Failed to submit")
    } catch {
      setSubmitError("Network error, please try again")
    } finally {
      setSubmitting(false)
    }
  }

  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // No offboarding yet — show request form
  if (!offboarding) return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Exit Request</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>Submit a resignation request to HR.</p>
      </div>

      <Card>
        <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F3E8FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={32} style={{ color: "#7C3AED" }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              {submitted ? "Request Submitted" : "Request to Exit"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 380 }}>
              {submitted
                ? "Your exit request has been sent to HR. They will initiate the offboarding process and you will be notified."
                : "If you wish to resign, submit a request to HR. They will review it and begin the offboarding process."}
            </div>
          </div>
          {!submitted && (
            <Button onClick={() => setModalOpen(true)}>
              <Send size={14} /> Submit Exit Request
            </Button>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setConfirmStep(false) }} title={confirmStep ? "Confirm Exit Request" : "Submit Exit Request"} width={460}>
        {confirmStep ? (
          <div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Are you sure you want to submit an exit request for yourself? HR will be notified and will begin the offboarding process.
              </p>
              {submitError && <p style={{ fontSize: 12, color: "var(--accent)", margin: "12px 0 0" }}>{submitError}</p>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmStep(false)}>Back</Button>
              <Button size="sm" variant="danger" disabled={submitting} onClick={submitRequest}>
                {submitting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Submitting…</> : "Yes, Submit Request"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={requestConfirm}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Exit Type <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <select required value={form.exitType} onChange={e => setForm(f => ({ ...f, exitType: e.target.value }))} style={fi}>
                  <option value="RESIGNATION">Resignation</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="CONTRACT_END">Contract End</option>
                  <option value="REDUNDANCY">Redundancy</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Intended Last Working Day <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="date" required value={form.intendedLastDay}
                  onChange={e => setForm(f => ({ ...f, intendedLastDay: e.target.value }))}
                  style={fi}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Reason</label>
                <textarea
                  value={form.reason} rows={4}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Briefly describe your reason for leaving (optional)"
                  style={{ ...fi, resize: "vertical" }}
                />
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" variant="danger">Review Request</Button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Offboarding exists — show checklist
  const tasks = offboarding.tasks ?? []
  const done = tasks.filter((t: any) => t.status === "COMPLETED").length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Offboarding</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>Your exit process status and checklist.</p>
      </div>

      <Card>
        <div style={{ padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserMinus size={24} style={{ color: "#EF4444" }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{EXIT_TYPE_LABEL[offboarding.exitType] ?? offboarding.exitType}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              Last working day: <strong>{formatDate(offboarding.lastWorkingDay)}</strong>
            </div>
          </div>
          <Badge status={offboarding.status} />
        </div>

        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
            <span>Checklist progress</span>
            <span>{done}/{tasks.length} tasks complete</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: pct === 100 ? "var(--success)" : "var(--primary)", width: `${pct}%`, transition: "width .3s" }} />
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Offboarding Checklist</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tasks.map((task: any, i: number) => {
              const completed = task.status === "COMPLETED"
              return (
                <div key={task.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                  borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  {completed
                    ? <CheckCircle2 size={20} style={{ color: "var(--success)", flexShrink: 0 }} />
                    : <Circle size={20} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: completed ? "line-through" : "none" }}>
                      {task.title}
                    </div>
                    {task.assignedTo && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Assigned to: {task.assignedTo}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                    background: CATEGORY_COLOR[task.category] ? `${CATEGORY_COLOR[task.category]}18` : "var(--muted)",
                    color: CATEGORY_COLOR[task.category] ?? "var(--muted-foreground)",
                  }}>
                    {task.category}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
