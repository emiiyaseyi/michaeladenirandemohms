"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Plus, Trash2, GripVertical } from "lucide-react"

type SurveyType = "GENERAL" | "CONFIRMATION" | "EXIT"
type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED"
type QuestionType = "TEXT" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO"

interface Question {
  id?: string
  text: string
  qType: QuestionType
  options: string[]
  required: boolean
  order: number
}

const QTYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "TEXT", label: "Text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "RATING", label: "Rating (1–5)" },
  { value: "YES_NO", label: "Yes / No" },
]

const TYPES: Array<{ value: SurveyType; label: string }> = [
  { value: "GENERAL", label: "General" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "EXIT", label: "Exit" },
]

const STATUSES: Array<{ value: SurveyStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "CLOSED", label: "Closed" },
]

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [name, setName] = useState("")
  const [type, setType] = useState<SurveyType>("GENERAL")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<SurveyStatus>("DRAFT")
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/surveys/templates/${id}`)
      .then(r => r.json())
      .then(data => {
        const t = data.template
        setName(t.name)
        setType(t.type)
        setDescription(t.description ?? "")
        setStatus(t.status)
        setQuestions(
          (t.questions ?? []).map((q: any) => ({
            id: q.id,
            text: q.text,
            qType: q.qType,
            options: Array.isArray(q.options) ? q.options : [],
            required: q.required,
            order: q.order,
          }))
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const addQuestion = () => {
    setQuestions(prev => [...prev, { text: "", qType: "TEXT", options: [], required: false, order: prev.length }])
  }

  const updateQ = (idx: number, patch: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  const removeQ = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })))
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/surveys/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, description, status }),
      })
      await fetch(`/api/surveys/templates/${id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questions.map((q, i) => ({ ...q, order: i })) }),
      })
      router.push("/admin/surveys")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB",
    borderRadius: 8, fontSize: 13, outline: "none",
    background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box",
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/admin/surveys")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Survey</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>›</span>
        <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Edit Template</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700 }}>Edit Template</h1>
        </div>

        {/* Basic fields */}
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Template name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Survey type</label>
              <select value={type} onChange={e => setType(e.target.value as SurveyType)} style={{ ...inputStyle, appearance: "auto" }}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as SurveyStatus)} style={{ ...inputStyle, appearance: "auto" }}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        {/* Questions */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Questions ({questions.length})</h2>
            <button onClick={addQuestion} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", background: "var(--primary-50)", color: "var(--primary)",
              border: "1px solid var(--primary-100)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={14} /> Add Question
            </button>
          </div>

          {questions.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", border: "2px dashed var(--border)", borderRadius: 10, color: "var(--muted-foreground)", fontSize: 13 }}>
              No questions yet. Click "Add Question" to get started.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, idx) => (
              <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "16px", background: "var(--background)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <GripVertical size={16} style={{ color: "var(--muted-foreground)", marginTop: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                      <input
                        value={q.text}
                        onChange={e => updateQ(idx, { text: e.target.value })}
                        placeholder={`Question ${idx + 1}`}
                        style={inputStyle}
                      />
                      <select value={q.qType} onChange={e => updateQ(idx, { qType: e.target.value as QuestionType, options: [] })}
                        style={{ ...inputStyle, width: 180, appearance: "auto" }}>
                        {QTYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                      </select>
                    </div>

                    {q.qType === "MULTIPLE_CHOICE" && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>Options (one per line)</label>
                        <textarea
                          value={q.options.join("\n")}
                          onChange={e => updateQ(idx, { options: e.target.value.split("\n") })}
                          rows={3}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      </div>
                    )}

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", color: "var(--muted-foreground)" }}>
                      <input type="checkbox" checked={q.required} onChange={e => updateQ(idx, { required: e.target.checked })}
                        style={{ accentColor: "var(--primary)" }} />
                      Required
                    </label>
                  </div>
                  <button onClick={() => removeQ(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#EF4444", flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={() => router.push("/admin/surveys")} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
