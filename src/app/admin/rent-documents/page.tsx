"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, Plus, MoreHorizontal, Inbox, ChevronDown, Loader2 } from "lucide-react"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "TO_REVIEW", label: "To Review" },
]

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
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

  const label = STATUS_OPTIONS.find(o => o.value === value)?.label ?? "All"

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: "var(--foreground)", outline: "none", minWidth: 110 }}>
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 140), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{ display: "block", width: "100%", padding: "10px 16px", background: o.value === value ? "var(--primary-50, #f0fdf4)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: o.value === value ? "var(--primary)" : "var(--foreground)", textAlign: "left", fontWeight: o.value === value ? 600 : 400 }}
              onMouseEnter={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
              onMouseLeave={ev => { if (o.value !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

function RowMenu({ doc, onEdit, onDelete, canManage }: { doc: any; onEdit: () => void; onDelete: () => void; canManage: boolean }) {
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
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 140, padding: "4px 0" }}>
          {canManage && <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Edit</button>}
          {canManage && <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" }}>Delete</button>}
        </div>,
        document.body
      )}
    </>
  )
}

const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }
const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13 }

export default function RentDocumentsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const canManageRentDocuments = user?.can("canManageRentDocuments") ?? false
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")
  const [selected, setSelected] = useState<string[]>([])
  const [delTarget, setDelTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (status !== "ALL") p.set("status", status)
    fetch(`/api/rent-documents?${p}`)
      .then(r => r.json())
      .then(d => { setDocs(d.docs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, status])

  const toggleAll = () => setSelected(s => s.length === docs.length ? [] : docs.map(d => d.id))
  const toggleOne = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const doDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    await fetch(`/api/rent-documents/${delTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setDelTarget(null)
    load()
  }

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) } catch { return "—" }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        {canManageRentDocuments && (
          <button onClick={() => router.push("/admin/rent-documents/new")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Add Employee Rent Document
          </button>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", width: 200 }} />
          </div>
          <StatusDropdown value={status} onChange={setStatus} />
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <Inbox size={40} style={{ margin: "0 auto 12px", strokeWidth: 1.5, opacity: 0.4 }} />
            <div style={{ fontSize: 13 }}>No data</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, width: 44 }}>
                  <input type="checkbox" checked={selected.length === docs.length && docs.length > 0} onChange={toggleAll}
                    style={{ cursor: "pointer" }} />
                </th>
                <th style={th}>Employee</th>
                <th style={th}>Amount</th>
                <th style={th}>Rent Period</th>
                <th style={th}>Property Address</th>
                <th style={th}>Status</th>
                <th style={{ ...th, width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                  onClick={() => router.push(`/admin/rent-documents/${doc.id}/edit`)}
                >
                  <td style={{ ...td, width: 44 }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggleOne(doc.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${doc.employee.firstName} ${doc.employee.lastName}`} photo={doc.employee.profilePhoto} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.employee.firstName} {doc.employee.lastName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{doc.employee.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>₦{Number(doc.amount).toLocaleString()}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{fmt(doc.rentStart)} – {fmt(doc.rentEnd)}</td>
                  <td style={{ ...td, maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.propertyAddress}</div>
                  </td>
                  <td style={td}><Badge status={doc.status} /></td>
                  <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <RowMenu doc={doc}
                      onEdit={() => router.push(`/admin/rent-documents/${doc.id}/edit`)}
                      onDelete={() => setDelTarget(doc)}
                      canManage={canManageRentDocuments} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete modal */}
      {delTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Delete Rent Document</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
              Are you sure you want to delete this rent document for <strong>{delTarget.employee?.firstName} {delTarget.employee?.lastName}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDelTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                style={{ padding: "9px 20px", background: "#ef4444", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
