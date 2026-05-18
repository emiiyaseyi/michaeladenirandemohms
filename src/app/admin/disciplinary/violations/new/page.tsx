"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, UploadCloud, X, Loader2 } from "lucide-react"

interface Employee { id: string; firstName: string; lastName: string }
interface ViolationType { id: string; name: string }

function EmployeeSelect({ value, onChange, error, includeAll }: { value: string; onChange: (v: string) => void; error?: string; includeAll: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const url = includeAll ? "/api/employees?limit=500" : "/api/employees?limit=500&status=ACTIVE"
    fetch(url)
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? []).sort((a: Employee, b: Employee) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )))
  }, [includeAll])

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
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const filtered = employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()))
  const selected = employees.find(e => e.id === value)

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${error ? "var(--danger)" : open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: selected ? "var(--foreground)" : "var(--muted-foreground)", textAlign: "left", outline: "none" }}>
        <span>{selected ? `${selected.firstName} ${selected.lastName}` : "Please select employee"}</span>
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

function ViolationTypeSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [types, setTypes] = useState<ViolationType[]>([])
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/disciplinary/violation-types")
      .then(r => r.json())
      .then(d => setTypes(d.types ?? []))
  }, [])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const selected = types.find(t => t.id === value)

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${error ? "var(--danger)" : open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: selected ? "var(--foreground)" : "var(--muted-foreground)", textAlign: "left", outline: "none" }}>
        <span>{selected?.name ?? "Please select"}</span>
        <ChevronDown size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 220), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
          {types.length === 0
            ? <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No violation types found</div>
            : types.map(t => (
              <button key={t.id} type="button" onClick={() => { onChange(t.id); setOpen(false) }}
                style={{ display: "block", width: "100%", padding: "10px 16px", background: t.id === value ? "var(--primary-50, #f0fdf4)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: t.id === value ? "var(--primary)" : "var(--foreground)", textAlign: "left", fontWeight: t.id === value ? 600 : 400 }}
                onMouseEnter={ev => { if (t.id !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                onMouseLeave={ev => { if (t.id !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
                {t.name}
              </button>
            ))}
        </div>,
        document.body
      )}
    </>
  )
}

export default function RecordViolationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedEmployeeId = searchParams.get("employeeId") ?? ""
  const [includeAll, setIncludeAll] = useState(false)
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId)
  const [violationTypeId, setViolationTypeId] = useState("")
  const [expectingResponse, setExpectingResponse] = useState(false)
  const [incidentDate, setIncidentDate] = useState("")
  const [details, setDetails] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!employeeId) e.employeeId = "Required"
    if (!violationTypeId) e.violationTypeId = "Required"
    if (!incidentDate) e.incidentDate = "Required"
    if (!details.trim()) e.details = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true); setApiErr("")

    const meRes = await fetch("/api/self-service/profile").catch(() => null)
    const me = meRes?.ok ? await meRes.json() : null
    const recordedById = me?.profile?.id ?? employeeId

    const fd = new FormData()
    fd.append("employeeId", employeeId)
    fd.append("recordedById", recordedById)
    fd.append("violationTypeId", violationTypeId)
    fd.append("incidentDate", incidentDate)
    fd.append("details", details)
    fd.append("expectingResponse", String(expectingResponse))
    if (file) fd.append("supportingDoc", file)

    const r = await fetch("/api/disciplinary/violations", { method: "POST", body: fd })
    if (!r.ok) {
      const d = await r.json()
      setApiErr(d.error ?? "Failed to save"); setSaving(false); return
    }
    router.push("/admin/disciplinary/violations")
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
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Record employee violation</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            When you record violation for an employee and it has been approved, we'll email the employee to let them know you've submitted violation for them.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "28px" }}>
          {/* Row 1: Show all employees + Employee */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <label style={lbl}>
                Show all employees
                <span style={hint} title="Include employees outside your reporting line">?</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--foreground)", cursor: "pointer" }}>
                <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--primary)" }} />
                Do you want to include employees who don't report to you?
              </label>
            </div>
            <div>
              <label style={lbl}>
                <span style={req}>*</span> Employee
                <span style={hint} title="The employee this violation is being recorded for">?</span>
              </label>
              <EmployeeSelect value={employeeId} onChange={setEmployeeId} error={errors.employeeId} includeAll={includeAll} />
              {errors.employeeId && <div style={errMsg}>{errors.employeeId}</div>}
            </div>
          </div>

          {/* Row 2: Violation type + Are you expecting a response */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <label style={lbl}>
                <span style={req}>*</span> Violation type
                <span style={hint} title="Select the type of violation">?</span>
              </label>
              <ViolationTypeSelect value={violationTypeId} onChange={setViolationTypeId} error={errors.violationTypeId} />
              {errors.violationTypeId && <div style={errMsg}>{errors.violationTypeId}</div>}
            </div>
            <div>
              <label style={lbl}>
                <span style={req}>*</span> Are you expecting a response
                <span style={hint} title="Should the employee respond to this violation?">?</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                {[true, false].map(v => (
                  <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="expectingResponse" checked={expectingResponse === v} onChange={() => setExpectingResponse(v)}
                      style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
                    {v ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Date */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>
              <span style={req}>*</span> Incident Date
              <span style={hint} title="The date the incident occurred">?</span>
            </label>
            <div style={{ position: "relative", maxWidth: 340 }}>
              <input type="date" value={incidentDate} max={new Date().toISOString().split("T")[0]} onChange={e => { setIncidentDate(e.target.value); setErrors(p => ({ ...p, incidentDate: "" })) }}
                style={{ ...inp(errors.incidentDate), paddingRight: 40 }} />
            </div>
            {errors.incidentDate && <div style={errMsg}>{errors.incidentDate}</div>}
          </div>

          {/* Details */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>
              <span style={req}>*</span> Details
              <span style={hint} title="Describe the violation in detail">?</span>
            </label>
            <textarea
              value={details}
              onChange={e => { setDetails(e.target.value); setErrors(p => ({ ...p, details: "" })) }}
              placeholder="note"
              rows={5}
              style={{ ...inp(errors.details), resize: "vertical" }}
            />
            {errors.details && <div style={errMsg}>{errors.details}</div>}
          </div>

          {/* Supporting document */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Do you have any supporting document?</label>
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
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Drop your files here</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>Add supporting document</p>
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
