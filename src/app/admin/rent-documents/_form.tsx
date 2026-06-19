"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, UploadCloud, X, Loader2 } from "lucide-react"

interface Employee { id: string; firstName: string; lastName: string }

interface FormData {
  employeeId: string
  amount: string
  rentStart: string
  rentEnd: string
  propertyAddress: string
  landlordName: string
  landlordPhone: string
  landlordEmail: string
}

interface Props {
  mode: "create" | "edit"
  initial?: FormData & { rentReceiptUrl?: string; tenancyAgreementUrl?: string; id?: string }
  onSubmit: (fd: globalThis.FormData) => Promise<boolean>
}

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

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
  )
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

function FileDropZone({ label, name, existing, onChange }: { label: string; name: string; existing?: string; onChange: (f: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (f: File | null) => { setFile(f); onChange(f) }

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{label}</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
        style={{ border: `1.5px dashed ${dragging ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, padding: "32px 24px", textAlign: "center", background: dragging ? "var(--primary-50, #f0fdf4)" : "var(--muted)", transition: "background .15s, border-color .15s" }}
      >
        <UploadCloud size={32} style={{ color: "var(--primary)", margin: "0 auto 10px" }} />
        {file ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{file.name}</span>
            <button type="button" onClick={() => pick(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={14} /></button>
          </div>
        ) : existing ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            <span>Current file saved. </span>
            <button type="button" onClick={() => inputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>Replace</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Drop your file here or</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>Only pdf, doc, docx, png, jpg, jpeg, with max size of 1MB</p>
          </>
        )}
        {!file && (
          <button type="button" onClick={() => inputRef.current?.click()}
            style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Choose file
          </button>
        )}
        <input ref={inputRef} type="file" name={name} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: "none" }}
          onChange={e => pick(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  )
}

export default function RentDocumentForm({ mode: _mode, initial, onSubmit }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    employeeId: initial?.employeeId ?? "",
    amount: initial?.amount ?? "",
    rentStart: initial?.rentStart ?? "",
    rentEnd: initial?.rentEnd ?? "",
    propertyAddress: initial?.propertyAddress ?? "",
    landlordName: initial?.landlordName ?? "",
    landlordPhone: initial?.landlordPhone ?? "",
    landlordEmail: initial?.landlordEmail ?? "",
  })
  const [files, setFiles] = useState<{ receipt: File | null; tenancy: File | null }>({ receipt: null, tenancy: null })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState("")

  const set = (k: keyof FormData, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.employeeId) e.employeeId = "Required"
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = "Required"
    if (!form.rentStart) e.rentStart = "Required"
    if (!form.rentEnd) e.rentEnd = "Required"
    if (!form.propertyAddress.trim()) e.propertyAddress = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true); setApiErr("")
    const fd = new globalThis.FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (files.receipt) fd.append("rentReceipt", files.receipt)
    if (files.tenancy) fd.append("tenancyAgreement", files.tenancy)
    const ok = await onSubmit(fd)
    if (!ok) { setSaving(false); setApiErr("Failed to save. Please try again.") }
  }

  const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }
  const req: React.CSSProperties = { color: "var(--danger)", marginRight: 3 }
  const inp = (err?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${err ? "var(--danger)" : "var(--border)"}`,
    borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  })
  const errMsg: React.CSSProperties = { fontSize: 12, color: "var(--danger)", marginTop: 4 }
  const col2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Submit Employee Rent</h2>
        </div>
        <div style={{ padding: "28px" }}>

          {/* Row 1: Employee + Amount */}
          <div style={{ ...col2, marginBottom: 20 }}>
            <div>
              <label style={lbl}><span style={req}>*</span>Employee</label>
              <EmployeeSelect value={form.employeeId} onChange={v => set("employeeId", v)} error={errors.employeeId} />
              {errors.employeeId && <div style={errMsg}>{errors.employeeId}</div>}
            </div>
            <div>
              <label style={lbl}><span style={req}>*</span>Amount</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} style={inp(errors.amount)} />
              {errors.amount && <div style={errMsg}>{errors.amount}</div>}
            </div>
          </div>

          {/* Row 2: Rent Period */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}><span style={req}>*</span>Rent Period</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${errors.rentStart || errors.rentEnd ? "var(--danger)" : "var(--border)"}`, borderRadius: 8, padding: "10px 14px", background: "var(--card)" }}>
              <input type="date" value={form.rentStart} onChange={e => set("rentStart", e.target.value)}
                placeholder="Start Date"
                style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", outline: "none", flex: 1 }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>→</span>
              <input type="date" value={form.rentEnd} onChange={e => set("rentEnd", e.target.value)}
                placeholder="End Date"
                style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", outline: "none", flex: 1 }} />
            </div>
            {(errors.rentStart || errors.rentEnd) && <div style={errMsg}>Both dates are required</div>}
          </div>

          {/* Row 3: Property Address + Landlord Name */}
          <div style={{ ...col2, marginBottom: 20 }}>
            <div>
              <label style={lbl}><span style={req}>*</span>Property Address</label>
              <input value={form.propertyAddress} onChange={e => set("propertyAddress", e.target.value)} style={inp(errors.propertyAddress)} />
              {errors.propertyAddress && <div style={errMsg}>{errors.propertyAddress}</div>}
            </div>
            <div>
              <label style={lbl}>Landlord Name</label>
              <input value={form.landlordName} onChange={e => set("landlordName", e.target.value)} style={inp()} />
            </div>
          </div>

          {/* Row 4: Landlord Phone + Landlord Email */}
          <div style={{ ...col2, marginBottom: 28 }}>
            <div>
              <label style={lbl}>Landlord Phone</label>
              <input value={form.landlordPhone} onChange={e => set("landlordPhone", e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={lbl}>Landlord Email</label>
              <input type="email" value={form.landlordEmail} onChange={e => set("landlordEmail", e.target.value)} style={inp()} />
            </div>
          </div>

          {/* File uploads */}
          <FileDropZone label="Rent Receipt" name="rentReceipt" existing={initial?.rentReceiptUrl ?? undefined}
            onChange={f => setFiles(p => ({ ...p, receipt: f }))} />
          <FileDropZone label="Tenancy Agreement" name="tenancyAgreement" existing={initial?.tenancyAgreementUrl ?? undefined}
            onChange={f => setFiles(p => ({ ...p, tenancy: f }))} />

          {apiErr && <div style={{ marginBottom: 16, fontSize: 13, color: "var(--danger)" }}>{apiErr}</div>}
        </div>

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
