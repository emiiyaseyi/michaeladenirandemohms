"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Plus, Search, MoreHorizontal, Loader2, Pencil, Trash2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const th: React.CSSProperties = {
  padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em",
  background: "var(--muted)", borderBottom: "1px solid var(--border)",
}
const td: React.CSSProperties = {
  padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)",
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: active ? "#DCFCE7" : "#F3F4F6", color: active ? "#16a34a" : "#6B7280" }}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function RowMenu({ title, onEdit, onToggle, onDelete, canManage }: { title: any; onEdit: () => void; onToggle: () => void; onDelete: () => void; canManage: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  if (!canManage) return null
  return (
    <>
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}><MoreHorizontal size={16} /></button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 140, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => { setOpen(false); onToggle() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: title.isActive ? "#D97706" : "#16a34a", textAlign: "left" }}>
            {title.isActive ? "Deactivate" : "Activate"}
          </button>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

function TitleModal({ title, onClose, onSaved }: { title: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(title?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const save = async () => {
    if (!name.trim()) { setErr("Name is required"); return }
    setSaving(true); setErr("")
    const r = title
      ? await fetch(`/api/job-titles/${title.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      : await fetch("/api/job-titles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(d.error ?? "Failed to save"); return }
    onSaved()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>{title ? "Edit Job Title" : "Create Job Title"}</h2>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Name <span style={{ color: "#ef4444" }}>*</span></label>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
          placeholder="e.g. Software Engineer"
          style={{ width: "100%", padding: "9px 13px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
        {err && <div style={{ marginTop: 10, fontSize: 12, color: "#ef4444" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function JobTitlesPage() {
  const { user } = useCurrentUser()
  const [titles, setTitles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [delTarget, setDelTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const canManage = !!(user?.caps?.canManageSettings)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/job-titles")
    const d = await r.json()
    setTitles(d.titles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = titles.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))

  const toggleActive = async (t: any) => {
    await fetch(`/api/job-titles/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !t.isActive }) })
    load()
  }

  const deleteTitle = async () => {
    if (!delTarget) return
    setDeleting(true)
    await fetch(`/api/job-titles/${delTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setDelTarget(null)
    load()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Job Titles</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>{titles.length} title{titles.length !== 1 ? "s" : ""}</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditTarget(null); setModalOpen(true) }}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Create Job Title
          </button>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job titles…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            {search ? "No job titles match your search." : "No job titles yet. Create one to get started."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Status</th>
                <th style={{ ...th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{t.name}</span></td>
                  <td style={td}><StatusBadge active={t.isActive} /></td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowMenu title={t} canManage={canManage}
                      onEdit={() => { setEditTarget(t); setModalOpen(true) }}
                      onToggle={() => toggleActive(t)}
                      onDelete={() => setDelTarget(t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: "12px 20px", borderTop: filtered.length > 0 ? "1px solid var(--border)" : "none", fontSize: 12, color: "var(--muted-foreground)" }}>
          {filtered.length} of {titles.length} titles
        </div>
      </div>

      {modalOpen && (
        <TitleModal
          title={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
          onSaved={() => { setModalOpen(false); setEditTarget(null); load() }}
        />
      )}

      {delTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Delete Job Title</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Are you sure you want to delete <strong>{delTarget.name}</strong>? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDelTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={deleteTitle} disabled={deleting} style={{ padding: "9px 20px", background: "#ef4444", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {deleting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
