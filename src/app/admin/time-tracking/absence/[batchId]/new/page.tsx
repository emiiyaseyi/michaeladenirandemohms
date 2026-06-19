"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, Loader2 } from "lucide-react"

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
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 280), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
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

export default function RecordAbsencePage() {
  const router = useRouter()
  const { batchId } = useParams<{ batchId: string }>()
  const [employeeId, setEmployeeId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState("")

  const validate = () => {
    const e: Record<string, string> = {}
    if (!employeeId) e.employeeId = "Required"
    if (!startDate || !endDate) e.dateRange = "Required"
    if (!reason.trim()) e.reason = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true); setApiErr("")
    const r = await fetch(`/api/time-tracking/absence/batches/${batchId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, absentStart: startDate, absentEnd: endDate, reason: reason.trim(), note: note || null }),
    })
    if (!r.ok) {
      const d = await r.json()
      setApiErr(d.error ?? "Failed to save"); setSaving(false); return
    }
    router.push(`/admin/time-tracking/absence/${batchId}`)
  }

  const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6 }
  const req: React.CSSProperties = { color: "var(--danger)" }
  const inp = (err?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${err ? "var(--danger)" : "var(--border)"}`,
    borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  })
  const errMsg: React.CSSProperties = { fontSize: 12, color: "var(--danger)", marginTop: 4 }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Record employee absence</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            When you record absent days for an employee and it's been approved, we'll automatically deduct the corresponding amount from their pay for that period if payment proration is enabled.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "28px" }}>
          {/* Employee */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}><span style={req}>*</span> Employee</label>
            <EmployeeSelect value={employeeId} onChange={v => { setEmployeeId(v); setErrors(p => ({ ...p, employeeId: "" })) }} error={errors.employeeId} />
            {errors.employeeId && <div style={errMsg}>{errors.employeeId}</div>}
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}><span style={req}>*</span> Date Range</label>
            <div style={{ display: "flex", alignItems: "center", border: `1px solid ${errors.dateRange ? "var(--danger)" : "var(--border)"}`, borderRadius: 8, overflow: "hidden", background: "var(--card)" }}>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, dateRange: "" })) }} placeholder="Start date"
                style={{ flex: 1, padding: "10px 14px", border: "none", fontSize: 13, background: "transparent", color: "var(--foreground)", outline: "none" }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: 13, padding: "0 8px" }}>→</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setErrors(p => ({ ...p, dateRange: "" })) }} placeholder="End date"
                style={{ flex: 1, padding: "10px 14px", border: "none", fontSize: 13, background: "transparent", color: "var(--foreground)", outline: "none" }} />
            </div>
            {errors.dateRange && <div style={errMsg}>{errors.dateRange}</div>}
          </div>

          {/* Note */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}><span style={req}>*</span> Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="note" rows={4}
              style={{ ...inp(), resize: "vertical" }} />
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}><span style={req}>*</span> Reason</label>
            <textarea value={reason} onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: "" })) }} placeholder="reason" rows={4}
              style={{ ...inp(errors.reason), resize: "vertical" }} />
            {errors.reason && <div style={errMsg}>{errors.reason}</div>}
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
