"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const PROMPT_TYPES = [
  { value: "CHECK_IN", label: "Check-in" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "CAREER", label: "Career" },
  { value: "REALIGNMENT", label: "Re-alignment" },
]

interface Initial { title: string; description: string; type: string }
interface Props {
  mode: "create" | "edit"
  initial?: Initial
  onSubmit: (data: Initial) => Promise<boolean>
}

export default function PromptForm({ mode, initial, onSubmit }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Initial>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Initial, string>>>({})
  const [saving, setSaving] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)

  const set = (k: keyof Initial, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e: Partial<Record<keyof Initial, string>> = {}
    if (!form.title.trim()) e.title = "Required"
    if (!form.description.trim()) e.description = "Required"
    if (!form.type) e.type = "Required"
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
  const selectedType = PROMPT_TYPES.find(t => t.value === form.type)

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{mode === "create" ? "Add Prompt" : "Edit Prompt"}</span>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <label style={lbl}><span style={req}>*</span>Title</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              style={inp(errors.title)} />
            {errors.title && <div style={errMsg}>{errors.title}</div>}
          </div>

          {/* Description */}
          <div>
            <label style={lbl}><span style={req}>*</span>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={4} style={{ ...inp(errors.description), resize: "vertical" }} />
            {errors.description && <div style={errMsg}>{errors.description}</div>}
          </div>

          {/* Type — custom select */}
          <div style={{ position: "relative" }}>
            <label style={lbl}><span style={req}>*</span>Type</label>
            <button type="button" onClick={() => setTypeOpen(v => !v)}
              style={{ ...inp(errors.type), display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
              <span style={{ color: selectedType ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {selectedType?.label ?? "Please select"}
              </span>
              <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>▼</span>
            </button>
            {errors.type && <div style={errMsg}>{errors.type}</div>}
            {typeOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden", marginTop: 4 }}>
                {PROMPT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => { set("type", t.value); setTypeOpen(false) }}
                    style={{ display: "block", width: "100%", padding: "11px 16px", background: form.type === t.value ? "var(--primary-50)" : "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--foreground)" }}
                    onMouseEnter={e => { if (form.type !== t.value) e.currentTarget.style.background = "var(--muted)" }}
                    onMouseLeave={e => { if (form.type !== t.value) e.currentTarget.style.background = "none" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
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
