"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }
const req = <span style={{ color: "var(--danger)" }}>*</span>

function TypeDropdown({ types, value, onChange }: { types: { id: string; name: string }[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const selected = types.find(t => t.id === value)
  const filtered = types.filter(t => t.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: selected ? "var(--foreground)" : "var(--muted-foreground)" }}>{selected?.name ?? "Select asset type"}</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              style={{ width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map(t => (
              <div key={t.id} onClick={() => { onChange(t.id); setOpen(false); setQ("") }}
                style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", background: value === t.id ? "var(--muted)" : "transparent", color: "var(--foreground)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === t.id ? "var(--muted)" : "transparent"}>
                {t.name}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditAssetPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [types, setTypes] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ name: "", assetTypeId: "", description: "", identifier: "", commissionDate: "", isMultiAssignable: false, maxAssignees: "", isActive: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/assets/types").then(r => r.json()).then(d => setTypes(d.types ?? []))
    fetch(`/api/assets/${id}`).then(r => r.json()).then(d => {
      const a = d.asset
      if (!a) return
      setForm({
        name: a.name ?? "",
        assetTypeId: a.assetTypeId ?? "",
        description: a.description ?? "",
        identifier: a.identifier ?? "",
        commissionDate: a.commissionDate ? a.commissionDate.split("T")[0] : "",
        isMultiAssignable: a.isMultiAssignable ?? false,
        maxAssignees: a.maxAssignees ? String(a.maxAssignees) : "",
        isActive: a.isActive ?? true,
      })
      setLoading(false)
    })
  }, [id])

  const save = async () => {
    if (!form.name.trim()) { setError("Asset name is required"); return }
    if (!form.commissionDate) { setError("Commission date is required"); return }
    setError(""); setSaving(true)
    const r = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push(`/admin/assets/overview/${id}`)
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>

  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push(`/admin/assets/overview/${id}`)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--foreground)", fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={14} /> Assets
        </button>
        <span style={{ color: "var(--muted-foreground)" }}>›</span>
        <span style={{ color: "var(--muted-foreground)" }}>Edit asset</span>
      </div>

      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={cardStyle}>
        <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Edit Asset</div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Asset type</label>
              <TypeDropdown types={types} value={form.assetTypeId} onChange={id => setForm(f => ({ ...f, assetTypeId: id }))} />
            </div>
            <div>
              <label style={lbl}>{req} Asset name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Asset name" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Description" />
            </div>
            <div>
              <label style={lbl}>Identifier</label>
              <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} style={inp} placeholder="e.g. DSNLAP001" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={lbl}>{req} Commission Date</label>
              <input type="date" value={form.commissionDate} onChange={e => setForm(f => ({ ...f, commissionDate: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Status</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {["Active", "Inactive"].map(opt => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="status" checked={form.isActive === (opt === "Active")} onChange={() => setForm(f => ({ ...f, isActive: opt === "Active" }))}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={lbl}>Can this asset be assigned to multiple employees?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {["Yes", "No"].map(opt => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="multi" checked={form.isMultiAssignable === (opt === "Yes")} onChange={() => setForm(f => ({ ...f, isMultiAssignable: opt === "Yes", maxAssignees: "" }))}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                    {opt}
                  </label>
                ))}
              </div>
              {form.isMultiAssignable && (
                <div style={{ marginTop: 12 }}>
                  <label style={lbl}>Maximum employees</label>
                  <input type="number" min={1} value={form.maxAssignees} onChange={e => setForm(f => ({ ...f, maxAssignees: e.target.value }))} style={inp} placeholder="e.g. 5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={() => router.push(`/admin/assets/overview/${id}`)}
          style={{ padding: "10px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  )
}
