"use client"
import { useState, useEffect } from "react"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

const BLANK = { name: "", date: "" }

function Section({ title, description, children, defaultOpen = false }: { title: string; description: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{description}</div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  )
}

export default function PublicHolidaysSettingsPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [form, setForm] = useState({ ...BLANK })
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    const r = await fetch("/api/settings")
    const d = await r.json()
    setHolidays(d.holidays ?? [])
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    const method = editing ? "PATCH" : "POST"
    const body = editing ? { id: editing.id, ...form } : form
    const r = await fetch("/api/settings/holidays", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    setOpen(false); setEditing(null); setForm({ ...BLANK }); load()
  }

  const del = async (id: string) => {
    setError("")
    const r = await fetch(`/api/settings/holidays?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to delete"); return }
    load()
  }

  const year = new Date().getFullYear()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section title={`Public Holidays ${year}`} description="Configure official public holidays. These dates are automatically excluded from leave day calculations." defaultOpen>
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ ...BLANK }); setError(""); setOpen(true) }}><Plus size={14} /> Add Holiday</Button>
        </div>
        {error && <div style={{ margin: "12px 24px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
        <div>
          {holidays.map(h => (
            <div key={h.id} style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</span>
                {!h.isCustom && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>System</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {new Date(h.date).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                {h.isCustom && (
                  <>
                    <button onClick={() => { setEditing(h); setForm({ name: h.name, date: new Date(h.date).toISOString().slice(0, 10) }); setError(""); setOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}><Pencil size={12} /> Edit</button>
                    <button onClick={() => del(h.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--danger)" }}><Trash2 size={12} /> Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {holidays.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No holidays configured for this year.</div>}
        </div>
      </Section>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? "Edit Holiday" : "Add Holiday"} width={400}>
        <form onSubmit={save}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
            <div><label style={lbl}>Holiday Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Date *</label><input required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Holiday"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
