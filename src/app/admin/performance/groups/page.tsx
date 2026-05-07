"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { MoreVertical, Inbox, X } from "lucide-react"

interface Group {
  id: string
  name: string
  isActive: boolean
  _count: { members: number }
}

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
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreVertical size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 9999, minWidth: 120, overflow: "hidden" }}>
          {[
            { label: "View", action: () => { setOpen(false); onView() } },
            { label: "Edit", action: () => { setOpen(false); onEdit() } },
            { label: "Delete", action: () => { setOpen(false); onDelete() }, danger: true },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: item.danger ? "var(--danger)" : "var(--foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function PerformanceGroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/performance/groups")
      .then(r => r.json())
      .then(d => { setGroups(d.groups ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/performance/groups/${deleteId}`, { method: "DELETE" })
    setGroups(gs => gs.filter(g => g.id !== deleteId))
    setDeleteId(null)
    setDeleting(false)
  }

  const total = groups.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700 }}>Performance Groups</h1>
        <button onClick={() => router.push("/admin/performance/groups/new")}
          style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Create Group
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 48, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 60, textAlign: "center" }}>
                  <Inbox size={36} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No groups yet</span>
                </td>
              </tr>
            ) : paged.map(g => (
              <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "16px 20px", fontSize: 14, color: "var(--foreground)" }}>{g.name}</td>
                <td style={{ padding: "16px 20px" }}>
                  <span style={{ padding: "4px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: g.isActive ? "var(--success-bg)" : "var(--muted)", color: g.isActive ? "var(--success)" : "var(--muted-foreground)" }}>
                    {g.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <RowMenu
                    onView={() => router.push(`/admin/performance/groups/${g.id}`)}
                    onEdit={() => router.push(`/admin/performance/groups/${g.id}/edit`)}
                    onDelete={() => setDeleteId(g.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
          <span>{start}–{end} of {total} items</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
          <span style={{ width: 28, height: 28, border: "1px solid var(--primary)", borderRadius: 6, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--primary)" }}>{page}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
        </div>
      )}

      {/* Delete modal */}
      {deleteId && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: "var(--card)", borderRadius: 12, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Delete Group</span>
              <button onClick={() => setDeleteId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
                If you delete this group, it would be removed from your list. Are you sure you want to continue?
              </p>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 24px", background: "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting} style={{ padding: "9px 24px", background: "var(--danger)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
