"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, Users, MoreHorizontal, Loader2 } from "lucide-react"

function RowMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
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
  return (
    <>
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 130, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>View</button>
          <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Edit</button>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>Delete</button>
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function CustomGroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    fetch("/api/people/custom-groups").then(r => r.json()).then(d => { setGroups(d.groups ?? []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = groups.filter(g => {
    const q = search.toLowerCase()
    return !q || g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const r = await fetch(`/api/people/custom-groups/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    if (r.ok) setGroups(prev => prev.filter(g => g.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {/* Card header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Custom Groups</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Custom Groups are used to group employees based on specific criteria. You can create custom groups based on your company's needs.
          </p>
        </div>

        {/* Search + Create */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 220, outline: "none" }} />
          </div>
          <button onClick={() => router.push("/admin/people/custom-groups/new")}
            style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Create new Group
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search ? "No results match your search." : "No custom groups yet. Create one to get started."}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Description</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(g => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{g.name}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{g.description ?? "—"}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: g.status === "ACTIVE" ? "#DCFCE7" : "#F3F4F6", color: g.status === "ACTIVE" ? "#15803d" : "#6B7280" }}>
                      {g.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowMenu
                      onView={() => router.push(`/admin/people/custom-groups/${g.id}`)}
                      onEdit={() => router.push(`/admin/people/custom-groups/${g.id}/edit`)}
                      onDelete={() => setDeleteTarget(g)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Delete modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Delete {deleteTarget.name}</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>
              If you delete this group, it will be removed from your list. Click Delete to continue.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                style={{ padding: "9px 22px", background: "#DC2626", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
