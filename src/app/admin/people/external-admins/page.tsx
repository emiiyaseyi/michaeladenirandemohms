"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Loader2, Shield, X } from "lucide-react"

function Av({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "white", flexShrink: 0 }}>
      {initials}
    </div>
  )
}

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

function RowMenu({ onHire, onEdit, onDelete }: { onHire: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 140, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onHire() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            Hire
          </button>
          <button onClick={() => { setOpen(false); onEdit() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            Edit
          </button>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setOpen(false); onDelete() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

const PAGE_SIZE = 10

export default function ExternalAdminsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/people/external-admins")
      .then(r => r.json())
      .then(d => { setAdmins(d.admins ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = admins.filter(a => {
    const q = search.toLowerCase()
    return !q || (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openEdit = (a: any) => {
    const parts = (a.name ?? "").split(" ")
    setEditForm({ firstName: parts[0] ?? "", lastName: parts.slice(1).join(" "), email: a.email ?? "", phone: a.employee?.phone ?? "" })
    setEditTarget(a); setErr("")
  }

  const doEdit = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setErr("First name, last name and email are required."); return
    }
    if (!editForm.phone.trim()) {
      setErr("Phone number is required."); return
    }
    setSaving(true); setErr("")
    const r = await fetch(`/api/people/external-admins/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    const { admin } = await r.json()
    setAdmins(prev => prev.map(a => a.id === admin.id ? admin : a))
    setEditTarget(null)
  }

  const [deleteErr, setDeleteErr] = useState("")
  const doDelete = async () => {
    setDeleting(true); setDeleteErr("")
    const r = await fetch(`/api/people/external-admins/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!r.ok) { const d = await r.json(); setDeleteErr(d.error ?? "Failed"); return }
    setAdmins(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search admins…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 240, outline: "none" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", maxWidth: 440, textAlign: "right" }}>
          Create new external admins via <strong style={{ color: "var(--foreground)" }}>Settings → Admins → Add New Admin</strong>. People listed here have admin panel access but no employee record yet - use Hire to add them as a staff member or project lead.
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Shield size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search ? "No results match your search." : "No external admins found."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Admin</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Av name={a.name ?? a.email ?? "A"} photo={a.employee?.profilePhoto} />
                      <span style={{ fontWeight: 700 }}>{a.name ?? a.email}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.email}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.employee?.phone ?? "-"}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowMenu
                      onHire={() => router.push(`/admin/people/employees/add?fromUser=${a.id}`)}
                      onEdit={() => openEdit(a)}
                      onDelete={() => setDeleteTarget(a)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: page === p ? "var(--primary)" : "var(--background)", color: page === p ? "white" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Edit External Admin</h2>
              <button onClick={() => setEditTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phone <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 08012345678" style={fi} />
              </div>
              {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doEdit} disabled={saving} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Delete External Admin</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 16 }}>
              Deleting an external admin can't be undone and we won't keep this admin information once it has been deleted. Click Confirm to continue.
            </p>
            {deleteErr && (
              <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(239,68,68,0.08)", color: "#EF4444", borderRadius: 8, fontSize: 12 }}>
                {deleteErr}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                style={{ padding: "9px 22px", background: "var(--muted)", border: "1.5px solid #DC2626", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {deleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
