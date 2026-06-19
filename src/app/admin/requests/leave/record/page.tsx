"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, X, Plus, Search } from "lucide-react"
import { useDropdownPosition } from "@/hooks/useDropdownPosition"

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function EmpSelect({ employees, value, onChange, placeholder = "Please Select" }: {
  employees: any[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const { ref: btnRef, pos, recompute } = useDropdownPosition<HTMLButtonElement>()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [])
  const sel = employees.find(e => e.id === value)
  const fi: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" ref={btnRef} onClick={() => { recompute(); setOpen(o => !o); setQ("") }}
        style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: sel ? "var(--foreground)" : "var(--muted-foreground)" }}>
          {sel ? `${sel.firstName} ${sel.lastName}` : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 6, padding: "6px 10px" }}>
              <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search employees…"
                style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase())).map(e => (
              <button key={e.id} type="button" onClick={() => { onChange(e.id); setOpen(false); setQ("") }}
                style={{ display: "block", width: "100%", padding: "10px 16px", background: value === e.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>
                {e.firstName} {e.lastName}
                {e.jobTitle && <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 6 }}>{e.jobTitle}</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function RecordLeavePage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [form, setForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    alreadyOccurred: false,
  })

  const [relievers, setRelievers] = useState<{ employeeId: string; taskName: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/employees?status=ACTIVE").then(r => r.json()),
      fetch("/api/leave").then(r => r.json()),
    ]).then(([empData, leaveData]) => {
      setEmployees(empData.employees ?? [])
      setLeaveTypes(leaveData.leaveTypes ?? [])
    })
  }, [])

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const addReliever = () => setRelievers(r => [...r, { employeeId: "", taskName: "" }])
  const removeReliever = (i: number) => setRelievers(r => r.filter((_, idx) => idx !== i))
  const updateReliever = (i: number, k: "employeeId" | "taskName", v: string) =>
    setRelievers(r => r.map((rel, idx) => idx === i ? { ...rel, [k]: v } : rel))

  const submit = async () => {
    if (!form.employeeId) { setErr("Please select an employee"); return }
    if (!form.leaveTypeId) { setErr("Please select a leave policy"); return }
    if (!form.startDate) { setErr("Start date is required"); return }
    if (!form.endDate) { setErr("End date is required"); return }
    if (!form.reason.trim()) { setErr("Reason is required"); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        projectLeads: relievers.filter(r => r.employeeId).map(r => ({ employeeId: r.employeeId, taskName: r.taskName || "Cover duties" })),
      }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed to record leave"); return }
    router.push("/admin/requests/leave")
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/requests/leave")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/requests/leave")}>Leave Requests</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Record Leave for an Employee</span>
      </div>

      <div style={{ padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Record Leave for an Employee</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Record a leave request on behalf of an employee. They will be notified by email.
            </p>
          </div>

          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Employee */}
            <Field label="Employee" required>
              <EmpSelect employees={employees} value={form.employeeId} onChange={v => setForm(f => ({ ...f, employeeId: v }))} />
            </Field>

            {/* Policy */}
            <Field label="Policy" required>
              <select value={form.leaveTypeId} onChange={set("leaveTypeId")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                <option value="">Select leave policy…</option>
                {leaveTypes.map((lt: any) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
            </Field>

            {/* Date range */}
            <div className="grid-2col" style={{ gap: 20 }}>
              <Field label="Start Date" required>
                <input type="date" value={form.startDate} onChange={set("startDate")} style={fi} />
              </Field>
              <Field label="End Date" required>
                <input type="date" value={form.endDate} onChange={set("endDate")} style={fi} />
              </Field>
            </div>

            {/* Has this occurred */}
            <Field label="Has this leave already occurred?">
              <div style={{ display: "flex", gap: 24 }}>
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
                  <label key={l} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="radio" checked={form.alreadyOccurred === v} onChange={() => setForm(f => ({ ...f, alreadyOccurred: v }))}
                      style={{ accentColor: "var(--primary)" }} />
                    {l}
                  </label>
                ))}
              </div>
            </Field>

            {/* Reliever / handover */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Reliever(s) / Handover <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
                <button type="button" onClick={addReliever}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <Plus size={12} /> Add Reliever
                </button>
              </div>
              {relievers.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--muted)", borderRadius: 8, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                  No reliever added. Click "Add Reliever" to assign someone to cover duties.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {relievers.map((rel, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted-foreground)" }}>Reliever</label>
                        <EmpSelect
                          employees={employees.filter(e => e.id !== form.employeeId)}
                          value={rel.employeeId}
                          onChange={v => updateReliever(i, "employeeId", v)}
                          placeholder="Select reliever…"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted-foreground)" }}>Task / Duty</label>
                        <input value={rel.taskName} onChange={e => updateReliever(i, "taskName", e.target.value)} placeholder="e.g. Handle daily standups"
                          style={fi} />
                      </div>
                      <button onClick={() => removeReliever(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 8px", color: "var(--muted-foreground)" }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reason */}
            <Field label="Reason" required>
              <textarea value={form.reason} onChange={set("reason")} rows={4} placeholder="Reason for leave…"
                style={{ ...fi, resize: "vertical" }} />
            </Field>

            {err && (
              <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>
            )}
          </div>

          <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/requests/leave")}
              style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
              {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
