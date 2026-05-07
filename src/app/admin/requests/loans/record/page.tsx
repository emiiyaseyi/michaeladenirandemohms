"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, Building2, Users } from "lucide-react"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
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
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const sel = employees.find(e => e.id === value)
  const fi: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: sel ? "var(--foreground)" : "var(--muted-foreground)" }}>{sel ? `${sel.firstName} ${sel.lastName}` : "Please Select"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search employees…"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--muted)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase())).map(e => (
              <button key={e.id} type="button" onClick={() => { onChange(e.id); setOpen(false); setQ("") }}
                style={{ display: "block", width: "100%", padding: "10px 16px", background: value === e.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                {e.firstName} {e.lastName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecordLoanPage() {
  const router = useRouter()
  const [source, setSource] = useState<"marketplace" | "company" | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [form, setForm] = useState({
    employeeId: "", policyName: "Company Sponsored", repaymentTenor: "",
    interval: "Month(s)", amount: "", reason: "", noteForUser: "",
  })

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  const fi: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.employeeId) { setErr("Please select an employee"); return }
    if (!form.amount) { setErr("Amount is required"); return }
    if (!form.repaymentTenor) { setErr("Repayment tenor is required"); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/requests/loans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), repaymentTenor: parseInt(form.repaymentTenor) }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    router.push("/admin/requests/loans")
  }

  if (!source) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <button onClick={() => router.push("/admin/requests/loans")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/requests/loans")}>Requests</span>
          <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
          <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Record loan request for employee</span>
        </div>
        <div style={{ padding: "60px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Choose Your Loan Source</h1>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Select where you'd like to borrow from. Each option offers different terms and benefits.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {([
              { key: "marketplace" as const, Icon: Building2, iconColor: "#2563eb", bg: "#EFF6FF", title: "Loan Marketplace", desc: "Borrow from our third party partners" },
              { key: "company" as const, Icon: Users, iconColor: "#16a34a", bg: "#F0FDF4", title: "Company-Sponsored", desc: "Borrow from your employer" },
            ]).map(({ key, Icon, iconColor, bg, title, desc }) => (
              <button key={key} onClick={() => setSource(key)}
                style={{ padding: "32px 24px", background: "var(--card)", border: `2px solid ${source === key ? "var(--primary)" : "var(--border)"}`, borderRadius: 16, cursor: "pointer", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Icon size={32} style={{ color: iconColor }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => { if (!source) setSource("company") }}
            style={{ width: "100%", padding: "14px 0", background: "var(--primary)", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, color: "white" }}>
            Proceed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => setSource(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/requests/loans")}>Requests</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Record loan request for employee</span>
      </div>
      <div style={{ padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Record Employee Loan</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>When you record a loan for an employee, we'll email them to confirm that a loan request has been submitted and whether it has been approved or declined.</p>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Field label="Employee" required><EmpSelect employees={employees} value={form.employeeId} onChange={v => setForm(f => ({ ...f, employeeId: v }))} /></Field>
              <Field label="Policy" required>
                <input value={form.policyName} onChange={set("policyName")} style={fi} placeholder="e.g. Company Sponsored" />
              </Field>
              <Field label="Repayment tenor" required>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={form.repaymentTenor} onChange={set("repaymentTenor")} style={{ ...fi, flex: 1 }} placeholder="e.g. 12" />
                  <select value={form.interval} onChange={set("interval")} style={{ ...fi, width: "auto", flex: "0 0 120px", appearance: "none" }}>
                    <option>Month(s)</option><option>Week(s)</option><option>Year(s)</option>
                  </select>
                </div>
              </Field>
              <Field label="Amount" required>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--muted-foreground)" }}>₦</span>
                  <input type="number" value={form.amount} onChange={set("amount")} style={{ ...fi, paddingLeft: 28 }} placeholder="e.g. 200,000" />
                </div>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Reason"><textarea value={form.reason} onChange={set("reason")} rows={3} placeholder="Optional" style={{ ...fi, resize: "vertical" }} /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Add note for user"><textarea value={form.noteForUser} onChange={set("noteForUser")} rows={3} placeholder="Optional" style={{ ...fi, resize: "vertical" }} /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Do you have supporting document?">
                  <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "28px 24px", textAlign: "center", cursor: "pointer", background: "var(--muted)" }}>
                    <Upload size={28} style={{ color: "var(--primary)", margin: "0 auto 10px" }} />
                    {file ? <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span> : <>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your files here or</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10 }}>Only pdf, doc, docx, png, jpg, jpeg, with max size of 1MB</p>
                      <button type="button" style={{ padding: "8px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Choose file</button>
                    </>}
                    <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                </Field>
              </div>
            </div>
            {err && <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
          </div>
          <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/requests/loans")} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
