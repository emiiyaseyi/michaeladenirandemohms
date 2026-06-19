"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown } from "lucide-react"
import { useDropdownPosition } from "@/hooks/useDropdownPosition"

type SurveyType = "GENERAL" | "CONFIRMATION" | "EXIT"

const TYPES: Array<{ value: SurveyType; label: string }> = [
  { value: "GENERAL", label: "General" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "EXIT", label: "Exit" },
]

export default function CreateTemplatePage() {
  const router = useRouter()
  const [type, setType] = useState<SurveyType | "">("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { ref: typeRef, pos: typePos, recompute: recomputeType } = useDropdownPosition<HTMLDivElement>()

  useEffect(() => {
    if (!showTypeDropdown) return
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setShowTypeDropdown(false)
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [showTypeDropdown])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!type) e.type = "Please select a type"
    if (!name.trim()) e.name = "Please enter template name"
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const res = await fetch("/api/surveys/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, description: description.trim() || null }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      router.push(`/admin/surveys/templates/${data.template.id}/edit`)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${hasError ? "#EF4444" : "var(--border)"}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "var(--background)",
    color: "var(--foreground)",
    boxSizing: "border-box",
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/admin/surveys")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Survey</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>›</span>
        <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Survey Template</span>
      </div>

      {/* Card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Survey template</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Customize template of your survey</p>
        </div>

        {/* Form */}
        <div style={{ padding: "28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Survey type */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                <span style={{ color: "#EF4444" }}>* </span>Survey type
              </label>
              <div ref={typeRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => { recomputeType(); setShowTypeDropdown(v => !v) }}
                  style={{
                    ...inputStyle(!!errors.type),
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", textAlign: "left",
                    border: showTypeDropdown ? "1px solid var(--primary)" : `1px solid ${errors.type ? "#EF4444" : "var(--border)"}`,
                  }}>
                  <span style={{ color: type ? "var(--foreground)" : "#9CA3AF" }}>
                    {type ? TYPES.find(t => t.value === type)?.label : ""}
                  </span>
                  <ChevronDown size={14} style={{ color: "#9CA3AF" }} />
                </button>
                {showTypeDropdown && typeof document !== "undefined" && createPortal(
                  <div style={{
                    position: "fixed", top: typePos.top, left: typePos.left, width: typePos.width,
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 9999,
                  }}>
                    {TYPES.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => { setType(t.value); setShowTypeDropdown(false); setErrors(p => ({ ...p, type: "" })) }}
                        style={{
                          display: "block", width: "100%", padding: "10px 14px",
                          background: type === t.value ? "var(--primary-50)" : "none",
                          border: "none", cursor: "pointer", textAlign: "left", fontSize: 14,
                          color: "var(--foreground)",
                        }}
                        onMouseEnter={e => { if (type !== t.value) e.currentTarget.style.background = "var(--muted)" }}
                        onMouseLeave={e => { if (type !== t.value) e.currentTarget.style.background = "none" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
              {errors.type && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.type}</p>}
            </div>

            {/* Template name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                <span style={{ color: "#EF4444" }}>* </span>Template name
              </label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })) }}
                placeholder="Enter template name"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.name}</p>}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              style={{ ...inputStyle(), resize: "vertical" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={() => router.push("/admin/surveys")} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
