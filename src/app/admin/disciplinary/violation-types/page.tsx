"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, Plus, MoreHorizontal, X, Loader2 } from "lucide-react"

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--primary)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 120, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Edit</button>
          <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" }}>Delete</button>
        </div>,
        document.body
      )}
    </>
  )
}

const DESCRIPTION = "Violation types are used to setup policies that trigger penalties for disciplinary actions."

function ViolationModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit"
  initial?: { id: string; name: string }
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [err, setErr] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { setErr("Name is required"); return }
    setSaving(true); setErr("")
    const r = mode === "edit"
      ? await fetch(`/api/disciplinary/violation-types/${initial!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      : await fetch("/api/disciplinary/violation-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(d.error ?? "Failed to save"); return }
    onSaved()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{mode === "create" ? "Create Violation Type" : "Edit Violation Type"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.6 }}>{DESCRIPTION}</p>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <span style={{ color: "var(--danger)", marginRight: 3 }}>*</span>Name
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErr("") }}
            onKeyDown={e => e.key === "Enter" && save()}
            autoFocus
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${err ? "var(--danger)" : "var(--border)"}`, borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
          />
          {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{err}</div>}
        </div>
        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={saving}
            style={{ padding: "10px 28px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : mode === "create" ? "Submit" : "Update"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function DeleteModal({ target, onClose, onDeleted }: { target: any; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const doDelete = async () => {
    setDeleting(true)
    await fetch(`/api/disciplinary/violation-types/${target.id}`, { method: "DELETE" })
    setDeleting(false)
    onDeleted()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Remove Violation Type</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 13, color: "var(--foreground)" }}>Are you sure you want to delete this item?</p>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
          <button onClick={doDelete} disabled={deleting}
            style={{ padding: "9px 20px", background: "#fce7e7", border: "1px solid #fca5a5", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
            {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const PAGE_SIZE = 8

export default function ViolationTypesPage() {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [delTarget, setDelTarget] = useState<any>(null)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    fetch(`/api/disciplinary/violation-types?${p}`)
      .then(r => r.json())
      .then(d => { setTypes(d.types ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const totalPages = Math.max(1, Math.ceil(types.length / PAGE_SIZE))
  const paged = types.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, types.length)

  const th: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: 220 }} />
        </div>
        <button onClick={() => { setEditTarget(null); setModal("create") }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          <Plus size={14} /> Create
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={{ ...th, width: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={2} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                {search ? "No results match your search." : "No violation types yet."}
              </td></tr>
            ) : paged.map(t => (
              <tr key={t.id}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                <td style={td}>{t.name}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <RowMenu
                    onEdit={() => { setEditTarget(t); setModal("edit") }}
                    onDelete={() => setDelTarget(t)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {types.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{start}-{end} of {types.length} items</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: p === page ? "var(--primary)" : "var(--card)", cursor: "pointer", fontSize: 12, color: p === page ? "white" : "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: p === page ? 700 : 400 }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ViolationModal
          mode={modal}
          initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { setModal(null); setEditTarget(null); load() }}
        />
      )}
      {delTarget && (
        <DeleteModal
          target={delTarget}
          onClose={() => setDelTarget(null)}
          onDeleted={() => { setDelTarget(null); load() }}
        />
      )}
    </div>
  )
}
