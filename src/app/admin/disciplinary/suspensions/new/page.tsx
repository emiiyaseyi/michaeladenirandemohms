"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, UploadCloud, X, Loader2 } from "lucide-react"

interface Employee { id: string; firstName: string; lastName: string }

function EmployeeSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? []).sort((a: Employee, b: Employee) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )))
  }, [])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    if (!open) setSearch("")
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  const filtered = employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()))
  const selected = employees.find(e => e.id === value)

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${error ? "var(--danger)" : open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: selected ? "var(--foreground)" : "var(--muted-foreground)", textAlign: "left", outline: "none" }}>
        <span>{selected ? `${selected.firstName} ${selected.lastName}` : "Please Select"}</span>
        <ChevronDown size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 260), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
              style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No employees found</div>
              : filtered.map(e => (
                <button key={e.id} type="button" onClick={() => { onChange(e.id); setOpen(false) }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", background: e.id === value ? "var(--primary-50, #f0fdf4)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: e.id === value ? "var(--primary)" : "var(--foreground)", textAlign: "left", fontWeight: e.id === value ? 600 : 400 }}
                  onMouseEnter={ev => { if (e.id !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                  onMouseLeave={ev => { if (e.id !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
                  {e.firstName} {e.lastName}
                </button>
              ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function RecordSuspensionPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [alreadyOccurred, setAlreadyOccurred] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!employeeId) e.employeeId = "Please enter this field!"
    if (!startDate) e.startDate = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true); setApiErr("")
    const fd = new FormData()
    fd.append("employeeId", employeeId)
    fd.append("alreadyOccurred", String(alreadyOccurred))
    fd.append("startDate", startDate)
    if (endDate) fd.append("endDate", endDate)
    if (reason) fd.append("reason", reason)
    if (note) fd.append("noteForUser", note)
    if (file) fd.append("supportingDoc", file)

    const r = await fetch("/api/disciplinary/suspensions", { method: "POST", body: fd })
    if (!r.ok) {
      const d = await r.json()
      setApiErr(d.error ?? "Failed to save"); setSaving(false); return
    }
    router.push("/admin/disciplinary/suspensions")
  }

  const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, marginBottom: 6 }
  const req: React.CSSProperties = { color: "var(--danger)" }
  const inp = (err?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${err ? "var(--danger)" : "var(--border)"}`,
    borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  })
  const errMsg: React.CSSProperties = { fontSize: 12, color: "var(--danger)", marginTop: 4 }
  const hint: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, borderRadius: "50%", border: "1px solid var(--border)", fontSize: 9, color: "var(--muted-foreground)", cursor: "help", flexShrink: 0 }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Record Suspension</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            When you record suspension for an employee and it's been approved or declined, we'll email the employee to let them know you've suspendsed them.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "28px" }}>
          {/* Row 1: Employee + Start Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <label style={lbl}><span style={req}>*</span> Employee <span style={hint} title="The employee being suspended">!</span></label>
              <EmployeeSelect value={employeeId} onChange={v => { setEmployeeId(v); setErrors(p => ({ ...p, employeeId: "" })) }} error={errors.employeeId} />
              {errors.employeeId && <div style={errMsg}>{errors.employeeId}</div>}
            </div>
            <div>
              <label style={lbl}><span style={req}>*</span> Start Date</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: "" })) }}
                style={inp(errors.startDate)} />
              {errors.startDate && <div style={errMsg}>{errors.startDate}</div>}
            </div>
          </div>

          {/* Row 2: Has suspension occurred + End Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <label style={lbl}><span style={req}>*</span> Has this suspension occured yet?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="occurred" checked={alreadyOccurred === true} onChange={() => setAlreadyOccurred(true)}
                    style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
                  Yes, I only want to record it in the system.
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="occurred" checked={alreadyOccurred === false} onChange={() => setAlreadyOccurred(false)}
                    style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
                  No, employee has not been suspended yet.
                </label>
              </div>
            </div>
            <div>
              <label style={lbl}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ ...inp(), background: "var(--muted)" }} />
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Reason <span style={hint} title="Reason for the suspension">!</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional" rows={4}
              style={{ ...inp(), resize: "vertical" }} />
          </div>

          {/* Note for user */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Add note for user <span style={hint} title="Note visible to the employee">!</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" rows={4}
              style={{ ...inp(), resize: "vertical" }} />
          </div>

          {/* Supporting document */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Do you have supporting document? <span style={hint} title="Upload a supporting document">!</span></label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
              style={{ border: `1.5px dashed ${dragging ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "32px 24px", textAlign: "center", background: dragging ? "var(--primary-50, #f0fdf4)" : "var(--muted)", transition: "background .15s" }}>
              <UploadCloud size={32} style={{ color: "var(--primary)", margin: "0 auto 10px" }} />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Drop your files here or</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>Only pdf, doc, docx, png, jpg, jpeg, with max size of 1MB</p>
                </>
              )}
              {!file && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Choose file
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {apiErr && <div style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>{apiErr}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" onClick={() => router.back()}
            style={{ padding: "10px 28px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
