"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Search } from "lucide-react"

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

function EmpSelect({ employees, value, onChange }: { employees: any[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const sel = employees.find(e => e.id === value)
  const fi: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen(o => !o); setQ("") }}
        style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: sel ? "var(--foreground)" : "var(--muted-foreground)" }}>
          {sel ? `${sel.firstName} ${sel.lastName}` : "Please Select"}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
        </div>
      )}
    </div>
  )
}

export default function RecordSalaryAdvancePage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [form, setForm] = useState({
    employeeId: "",
    policyName: "Company Sponsored",
    repaymentTenor: "",
    interval: "Month(s)",
    amount: "",
    reason: "",
    noteForUser: "",
  })

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.employeeId) { setErr("Please select an employee"); return }
    if (!form.amount) { setErr("Amount is required"); return }
    if (!form.repaymentTenor) { setErr("Repayment tenor is required"); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/requests/salary-advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), repaymentTenor: parseInt(form.repaymentTenor) }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    router.push("/admin/requests/salary-advances")
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/requests/salary-advances")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/requests/salary-advances")}>Salary Advances</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Record Salary Advance for an Employee</span>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Record Salary Advance</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              When you record a salary advance for an employee, we'll email them to confirm the request and whether it has been approved or declined.
            </p>
          </div>

          <div style={{ padding: "28px 32px" }}>
            <div className="grid-2col" style={{ gap: 24 }}>
              <Field label="Employee" required>
                <EmpSelect employees={employees} value={form.employeeId} onChange={v => setForm(f => ({ ...f, employeeId: v }))} />
              </Field>
              <Field label="Policy">
                <input value={form.policyName} onChange={set("policyName")} style={fi} placeholder="e.g. Company Sponsored" />
              </Field>
              <Field label="Repayment tenor" required>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={form.repaymentTenor} onChange={set("repaymentTenor")} style={{ ...fi, flex: 1 }} placeholder="e.g. 3" />
                  <select value={form.interval} onChange={set("interval")} style={{ ...fi, width: "auto", flex: "0 0 120px", appearance: "none" }}>
                    <option>Month(s)</option><option>Week(s)</option><option>Year(s)</option>
                  </select>
                </div>
              </Field>
              <Field label="Amount" required>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--muted-foreground)" }}>₦</span>
                  <input type="number" value={form.amount} onChange={set("amount")} style={{ ...fi, paddingLeft: 28 }} placeholder="e.g. 50,000" />
                </div>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Reason">
                  <textarea value={form.reason} onChange={set("reason")} rows={3} placeholder="Optional" style={{ ...fi, resize: "vertical" }} />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Add note for employee">
                  <textarea value={form.noteForUser} onChange={set("noteForUser")} rows={3} placeholder="Optional" style={{ ...fi, resize: "vertical" }} />
                </Field>
              </div>
            </div>
            {err && <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
          </div>

          <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/requests/salary-advances")} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
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
