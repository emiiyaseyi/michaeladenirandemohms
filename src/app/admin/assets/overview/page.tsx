"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Search, Plus, MoreHorizontal, ChevronDown } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const opts = [{ v: "", label: "All" }, { v: "active", label: "Active" }, { v: "inactive", label: "Inactive" }]
  const selected = opts.find(o => o.v === value) ?? opts[0]

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: "var(--foreground)", minWidth: 120 }}>
        <span style={{ flex: 1, textAlign: "left" }}>{selected.label}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, minWidth: 140, padding: "4px 0" }}>
          {opts.map(o => (
            <div key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
              style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: value === o.v ? "var(--muted)" : "transparent", color: "var(--foreground)", fontWeight: value === o.v ? 600 : 400 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === o.v ? "var(--muted)" : "transparent"}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RowMenu({ onView, onEdit, onDelete, canEdit, canDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean }) {
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
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--primary)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 140, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>View</button>
          {canEdit && <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Edit</button>}
          {canDelete && <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--danger)", textAlign: "left" }}>Delete asset</button>}
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function AssetsOverviewPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const canCreateAsset = user?.can("canCreateAsset") ?? false
  const canEditAsset = user?.can("canEditAsset") ?? false
  const canDeleteAsset = user?.can("canDeleteAsset") ?? false
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (status) p.set("status", status)
    fetch(`/api/assets?${p}`)
      .then(r => r.json())
      .then(d => { setAssets(d.assets ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, status])

  const totalPages = Math.max(1, Math.ceil(assets.length / PAGE_SIZE))
  const paged = assets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, assets.length)

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/assets/${deleteId}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const th: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, rowGap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: "100%" }} />
        </div>
        <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1) }} />
        <div style={{ flex: 1 }} />
        {canCreateAsset && (
          <button onClick={() => router.push("/admin/assets/overview/new")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Create new asset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Asset type</th>
              <th style={th}>Asset Name</th>
              <th style={th}>Description</th>
              <th style={th}>Assignment</th>
              <th style={th}>Commissioned on</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                {search ? "No results match your search." : "No assets yet."}
              </td></tr>
            ) : paged.map(asset => {
              const assigned = asset._count?.assignments ?? 0
              const max = asset.maxAssignees
              const assignmentText = max ? `${assigned}/${max}` : `${assigned}`
              const commDate = asset.commissionDate ? new Date(asset.commissionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"

              return (
                <tr key={asset.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}>{asset.assetType?.name ?? "-"}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{asset.name}</div>
                    {asset.identifier && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{asset.identifier}</div>}
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{asset.description ?? "-"}</td>
                  <td style={td}>{assignmentText}</td>
                  <td style={td}>{commDate}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600, background: asset.isActive ? "var(--success-bg)" : "var(--muted)", color: asset.isActive ? "var(--success)" : "var(--muted-foreground)" }}>
                      {asset.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowMenu
                      onView={() => router.push(`/admin/assets/overview/${asset.id}`)}
                      onEdit={() => router.push(`/admin/assets/overview/${asset.id}/edit`)}
                      onDelete={() => setDeleteId(asset.id)}
                      canEdit={canEditAsset}
                      canDelete={canDeleteAsset}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {assets.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{start}-{end} of {assets.length} items</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: n === page ? "var(--primary)" : "var(--card)", cursor: "pointer", fontSize: 12, color: n === page ? "white" : "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: n === page ? 700 : 400 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: "32px 36px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Confirm action</div>
            <div style={{ fontSize: 14, color: "var(--foreground)", marginBottom: 4 }}>Are you sure you want to delete this asset?</div>
            <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 28 }}>Click Delete to continue.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteId(null)}
                style={{ padding: "9px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ padding: "9px 22px", background: "var(--danger)", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: deleting ? 0.7 : 1 }}>
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
