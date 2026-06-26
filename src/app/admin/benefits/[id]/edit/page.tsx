"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [categories, setCategories] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/benefits/categories")
      .then(r => r.json())
      .then(d => {
        const names: string[] = (d.categories ?? []).map((c: any) => c.name)
        setCategories(names)
      })
  }, [])

  const add = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const r = await fetch("/api/benefits/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const d = await r.json()
    setSaving(false)
    if (r.ok) {
      const name = d.category.name
      setCategories(prev => [...prev, name].sort())
      onChange(name)
      setNewName("")
      setAdding(false)
    }
  }

  return (
    <div>
      <select value={value} onChange={e => onChange(e.target.value)} style={fi}>
        <option value="">- Select category -</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          + Add category
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setAdding(false); setNewName("") } }}
            placeholder="Category name"
            style={{ ...fi, flex: 1, padding: "7px 10px" }}
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !newName.trim()}
            style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName("") }}
            style={{ padding: "7px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--foreground)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default function EditBenefitPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState({ name: "", category: "", effectiveDate: "", status: "ACTIVE" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/benefits/${id}`)
      .then(r => r.json())
      .then(d => {
        const b = d.benefit
        if (b) setForm({
          name: b.name,
          category: b.category,
          effectiveDate: b.effectiveDate?.slice(0, 10) ?? "",
          status: b.status,
        })
        setLoading(false)
      })
  }, [id])

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return }
    setSaving(true); setError("")
    const r = await fetch(`/api/benefits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push(`/admin/benefits/${id}`)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 560 }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Edit Benefit Details</h1>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              <span style={{ color: "var(--accent)" }}>*</span> Benefit name
            </label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Category</label>
            <CategorySelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              <span style={{ color: "var(--accent)" }}>*</span> Effective date
            </label>
            <input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={fi}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        {error && (
          <div style={{ margin: "0 24px 16px", background: "var(--danger-bg)", border: "1px solid var(--accent)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--accent)" }}>
            {error}
          </div>
        )}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => router.back()} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />Saving…</> : "Save"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
