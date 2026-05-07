"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const CONV_TYPES = [
  { value: "CHECK_IN", label: "Check-in" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "CAREER", label: "Career" },
  { value: "REALIGNMENT", label: "Re-alignment" },
  { value: "OTHER", label: "Other" },
]
const FREQUENCIES = [
  { value: "ONE_OFF", label: "One-off" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Biweekly" },
  { value: "MONTHLY", label: "Monthly" },
]

interface Initial {
  employeeId: string
  conversationWith: string
  scheduledDate: string
  startTime: string
  endTime: string
  frequency: string
  conversationType: string
}

interface Props {
  mode: "create" | "edit"
  initial?: Initial
  onSubmit: (data: any) => Promise<boolean>
}

export default function ConversationSetupForm({ mode, initial, onSubmit }: Props) {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState<Initial>({
    employeeId: initial?.employeeId ?? "",
    conversationWith: initial?.conversationWith ?? "",
    scheduledDate: initial?.scheduledDate ?? "",
    startTime: initial?.startTime ?? "",
    endTime: initial?.endTime ?? "",
    frequency: initial?.frequency ?? "ONE_OFF",
    conversationType: initial?.conversationType ?? "OTHER",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Initial, string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then(r => r.json())
      .then(d => setEmployees(d.employees ?? d.data ?? []))
      .catch(() => {})
  }, [])

  const set = (k: keyof Initial, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e: Partial<Record<keyof Initial, string>> = {}
    if (!form.employeeId) e.employeeId = "Required"
    if (!form.conversationWith.trim()) e.conversationWith = "Required"
    if (!form.scheduledDate) e.scheduledDate = "Required"
    if (!form.startTime) e.startTime = "Required"
    if (!form.endTime) e.endTime = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const ok = await onSubmit(form)
    if (!ok) setSaving(false)
  }

  const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }
  const req: React.CSSProperties = { color: "var(--danger)", marginRight: 2 }
  const inp = (err?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${err ? "var(--danger)" : "var(--border)"}`,
    borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  })
  const errMsg: React.CSSProperties = { fontSize: 12, color: "var(--danger)", marginTop: 4 }

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{mode === "create" ? "Schedule Conversation" : "Edit Conversation Setup"}</span>
        </div>
        <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Employee */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}><span style={req}>*</span>Employee</label>
            <select value={form.employeeId} onChange={e => set("employeeId", e.target.value)}
              style={inp(errors.employeeId)}>
              <option value="">Please select</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
            {errors.employeeId && <div style={errMsg}>{errors.employeeId}</div>}
          </div>

          {/* Conversation with */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}><span style={req}>*</span>Conversation with</label>
            <input value={form.conversationWith} onChange={e => set("conversationWith", e.target.value)}
              placeholder="Enter name" style={inp(errors.conversationWith)} />
            {errors.conversationWith && <div style={errMsg}>{errors.conversationWith}</div>}
          </div>

          {/* Scheduled Date */}
          <div>
            <label style={lbl}><span style={req}>*</span>Scheduled Date</label>
            <input type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)}
              style={inp(errors.scheduledDate)} />
            {errors.scheduledDate && <div style={errMsg}>{errors.scheduledDate}</div>}
          </div>

          {/* Frequency */}
          <div>
            <label style={lbl}><span style={req}>*</span>Frequency</label>
            <select value={form.frequency} onChange={e => set("frequency", e.target.value)} style={inp()}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label style={lbl}><span style={req}>*</span>Start Time</label>
            <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)}
              style={inp(errors.startTime)} />
            {errors.startTime && <div style={errMsg}>{errors.startTime}</div>}
          </div>

          {/* End Time */}
          <div>
            <label style={lbl}><span style={req}>*</span>End Time</label>
            <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)}
              style={inp(errors.endTime)} />
            {errors.endTime && <div style={errMsg}>{errors.endTime}</div>}
          </div>

          {/* Conversation Type */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}><span style={req}>*</span>Conversation Type</label>
            <select value={form.conversationType} onChange={e => set("conversationType", e.target.value)} style={inp()}>
              {CONV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={() => router.back()}
          style={{ padding: "10px 28px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
