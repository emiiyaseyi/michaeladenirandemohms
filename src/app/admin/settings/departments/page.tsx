"use client"
import { useState, useEffect } from "react"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { Plus, Pencil, Trash2 } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

const BLANK = { name: "", description: "", divisionId: "", phone: "", email: "" }


export default function DepartmentsSettingsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [form, setForm] = useState({ ...BLANK })
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    const r = await fetch("/api/settings")
    const d = await r.json()
    setDepartments(d.departments ?? [])
    setDivisions(d.divisions ?? [])
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    const method = editing ? "PATCH" : "POST"
    const body = editing ? { id: editing.id, ...form } : form
    const r = await fetch("/api/settings/departments", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    setOpen(false); setEditing(null); setForm({ ...BLANK }); load()
  }

  const del = async (id: string) => {
    setError("")
    const r = await fetch(`/api/settings/departments?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to delete"); return }
    load()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ ...BLANK }); setError(""); setOpen(true) }}><Plus size={14} /> Add Department</Button>
        </div>
        {error && <div style={{ margin: "12px 24px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
        <div>
          {departments.map(d => (
            <div key={d.id} style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division?.name ?? "No Division"} · {d._count?.employees ?? 0} employees</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setEditing(d); setForm({ name: d.name, description: d.description ?? "", divisionId: d.divisionId ?? "", phone: d.phone ?? "", email: d.email ?? "" }); setError(""); setOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}><Pencil size={12} /> Edit</button>
                <button onClick={() => del(d.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--danger)" }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
          {departments.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No departments yet.</div>}
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? "Edit Department" : "Add Department"} width={440}>
        <form onSubmit={save}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
            <div><label style={lbl}>Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Department Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} style={inp} placeholder="e.g. +234 800 000 0000" /></div>
            <div><label style={lbl}>Department Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} style={inp} placeholder="e.g. hr@michaeldemohrms.example" /></div>
            {divisions.length > 0 && (
              <div><label style={lbl}>Division</label>
                <select value={form.divisionId} onChange={e => setForm(f => ({...f, divisionId: e.target.value}))} style={inp}>
                  <option value="">No division</option>
                  {divisions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Department"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
