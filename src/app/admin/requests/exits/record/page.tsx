"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload } from "lucide-react"

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
        {hint && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const EXIT_TYPES = ["RESIGNATION", "RETIREMENT", "CONTRACT_END", "REDUNDANCY", "TERMINATION"]
const EXIT_LABELS: Record<string, string> = {
  RESIGNATION: "Resignation", RETIREMENT: "Retirement", CONTRACT_END: "Contract End",
  REDUNDANCY: "Redundancy", TERMINATION: "Termination",
}

export default function RecordExitPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [empOpen, setEmpOpen] = useState(false)
  const empRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const [form, setForm] = useState({
    employeeId: "", exitType: "", hasOccured: "No, employee hasn't gone yet.",
    exitDate: "", payInLieu: "No", sendEmail: "Yes",
    reason: "", noteForUser: "",
  })

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!empRef.current?.contains(e.target as Node)) setEmpOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const selectedEmp = employees.find(e => e.id === form.employeeId)
  const filteredEmps = employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()))

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.employeeId) { setErr("Please select an employee"); return }
    if (!form.exitType) { setErr("Please select exit type"); return }
    if (!form.exitDate) { setErr("Please select exit date"); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/requests/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        exitType: form.exitType,
        intendedLastDay: form.exitDate,
        reason: form.reason || null,
        noteForUser: form.noteForUser || null,
      }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed to record exit"); return }
    router.push("/admin/requests/exits")
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <button onClick={() => router.push("/admin/requests/exits")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", cursor: "pointer" }} onClick={() => router.push("/admin/requests/exits")}>Requests</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>›</span>
        <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Record exit request for employee</span>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Record Employee Exit</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              When you record exit for an employee and it's been approved or declined, we'll email the employee to let them know you've submitted exit for them.
            </p>
          </div>

          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Employee searchable dropdown */}
              <Field label="Employee" required>
                <div ref={empRef} style={{ position: "relative" }}>
                  <button type="button" onClick={() => setEmpOpen(o => !o)}
                    style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ color: selectedEmp ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      {selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : "Please Select"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {empOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                        <input autoFocus value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employees…"
                          style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--muted)", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ overflowY: "auto", flex: 1 }}>
                        {filteredEmps.map(e => (
                          <button key={e.id} type="button" onClick={() => { setForm(f => ({ ...f, employeeId: e.id })); setEmpOpen(false); setEmpSearch("") }}
                            style={{ display: "block", width: "100%", padding: "10px 16px", background: form.employeeId === e.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                            {e.firstName} {e.lastName}
                          </button>
                        ))}
                        {filteredEmps.length === 0 && <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>No results</div>}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {/* Policy / Exit type */}
              <Field label="Policy" required>
                <select value={form.exitType} onChange={set("exitType")} style={{ ...fi, appearance: "none" }}>
                  <option value="">Please Select</option>
                  {EXIT_TYPES.map(t => <option key={t} value={t}>{EXIT_LABELS[t]}</option>)}
                </select>
              </Field>

              {/* Payment in lieu */}
              <Field label="Do you want to record payment in lieu of notice?" required>
                <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                  {["Yes", "No"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                      <input type="radio" value={opt} checked={form.payInLieu === opt} onChange={set("payInLieu")} style={{ accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Has this occurred */}
              <Field label="Has this exit occured yet?" required>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {["Yes, I only want to record it in the system.", "No, employee hasn't gone yet."].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" value={opt} checked={form.hasOccured === opt} onChange={set("hasOccured")} style={{ accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Exit date */}
              <Field label="Exit Date" required>
                <input type="date" value={form.exitDate} onChange={set("exitDate")} style={fi} />
              </Field>

              {/* Send email */}
              <Field label="Send email notification?">
                <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                  {["Yes", "No"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                      <input type="radio" value={opt} checked={form.sendEmail === opt} onChange={set("sendEmail")} style={{ accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Reason */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Reason">
                  <textarea value={form.reason} onChange={set("reason")} rows={3} placeholder="Optional"
                    style={{ ...fi, resize: "vertical" }} />
                </Field>
              </div>

              {/* Note for user */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Add note for user">
                  <textarea value={form.noteForUser} onChange={set("noteForUser")} rows={3} placeholder="Optional"
                    style={{ ...fi, resize: "vertical" }} />
                </Field>
              </div>

              {/* File upload */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Do you have supporting document?">
                  <div onClick={() => fileRef.current?.click()}
                    style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: "var(--muted)" }}>
                    <Upload size={32} style={{ color: "var(--primary)", margin: "0 auto 12px" }} />
                    {file ? (
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your files here or</p>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>Only pdf, doc, docx, png, jpg, jpeg, with max size of 1MB</p>
                        <button type="button" style={{ padding: "8px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>Choose file</button>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: "none" }}
                      onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                </Field>
              </div>
            </div>

            {err && <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
          </div>

          <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => router.push("/admin/requests/exits")}
              style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button onClick={submit} disabled={saving}
              style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
