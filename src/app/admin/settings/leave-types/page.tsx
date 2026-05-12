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

const BLANK = { name: "", description: "", defaultDays: "21", waitingDays: "0", genderSpecific: "", requiresDoc: false, minDocDays: "2", isActive: true }


export default function LeaveTypesSettingsPage() {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [form, setForm] = useState({ ...BLANK })
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    const r = await fetch("/api/settings")
    const d = await r.json()
    setLeaveTypes(d.leaveTypes ?? [])
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    const method = editing ? "PATCH" : "POST"
    const body = editing ? { id: editing.id, ...form } : form
    const r = await fetch("/api/settings/leave-types", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    setOpen(false); setEditing(null); setForm({ ...BLANK }); load()
  }

  const del = async (id: string) => {
    setError("")
    const r = await fetch(`/api/settings/leave-types?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to delete"); return }
    load()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ ...BLANK }); setError(""); setOpen(true) }}><Plus size={14} /> Add Leave Type</Button>
        </div>
        {error && <div style={{ margin: "12px 24px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
        <div>
          {leaveTypes.map(l => (
            <div key={l.id} style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {l.defaultDays} days · {l.genderSpecific ? `${l.genderSpecific} only` : "All genders"} · {l.waitingDays > 0 ? `${l.waitingDays} day notice` : "No notice"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, background: l.isActive ? "var(--success-bg)" : "var(--muted)", color: l.isActive ? "var(--success)" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{l.isActive ? "Active" : "Inactive"}</span>
                <button onClick={() => { setEditing(l); setForm({ name: l.name, description: l.description ?? "", defaultDays: String(l.defaultDays), waitingDays: String(l.waitingDays), genderSpecific: l.genderSpecific ?? "", requiresDoc: l.requiresDoc, minDocDays: String(l.minDocDays), isActive: l.isActive }); setError(""); setOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}><Pencil size={12} /> Edit</button>
                <button onClick={() => del(l.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--danger)" }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
          {leaveTypes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leave types configured.</div>}
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? "Edit Leave Type" : "Add Leave Type"} width={480}>
        <form onSubmit={save}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
            <div><label style={lbl}>Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Default Days</label><input type="number" value={form.defaultDays} onChange={e => setForm(f => ({...f, defaultDays: e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Notice Period (days)</label><input type="number" value={form.waitingDays} onChange={e => setForm(f => ({...f, waitingDays: e.target.value}))} style={inp} /></div>
            </div>
            <div><label style={lbl}>Gender Restriction</label>
              <select value={form.genderSpecific} onChange={e => setForm(f => ({...f, genderSpecific: e.target.value}))} style={inp}>
                <option value="">All genders</option>
                <option value="MALE">Male only</option>
                <option value="FEMALE">Female only</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.requiresDoc} onChange={e => setForm(f => ({...f, requiresDoc: e.target.checked}))} /> Requires supporting document
              </label>
              {editing && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({...f, isActive: e.target.checked}))} /> Active
                </label>
              )}
            </div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Leave Type"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
