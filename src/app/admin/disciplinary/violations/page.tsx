"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, Plus, MoreHorizontal, Inbox, X, Loader2, Filter } from "lucide-react"
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

// ─── Status filter popover (radio style, anchored to column header) ───────────
function StatusFilterPopover({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
      setDraft(value)
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "inline-flex", color: open ? "var(--primary)" : "var(--muted-foreground)" }}>
        <Filter size={13} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={popRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", zIndex: 9999, minWidth: 170, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px 6px" }}>
            {STATUS_OPTIONS.map(o => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer", fontSize: 13, color: draft === o.value ? "var(--primary)" : "var(--foreground)", background: draft === o.value ? "var(--primary-50, #f0fdf4)" : "none", borderRadius: 6, paddingLeft: 8, paddingRight: 8, marginLeft: -8, marginRight: -8 }}>
                <input type="radio" name="status-filter" value={o.value} checked={draft === o.value} onChange={() => setDraft(o.value)} style={{ accentColor: "var(--primary)" }} />
                {o.label}
              </label>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => { setDraft("ALL"); onChange("ALL"); setOpen(false) }}
              style={{ fontSize: 13, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
              Reset
            </button>
            <button onClick={() => { onChange(draft); setOpen(false) }}
              style={{ padding: "5px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Row action menu ───────────────────────────────────────────────────────────
function RowMenu({ onView, onDelete, canDelete }: { onView: () => void; onDelete: () => void; canDelete: boolean }) {
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
        <div ref={menuRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 130, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            View
          </button>
          {canDelete && (
            <button onClick={() => { setOpen(false); onDelete() }}
              style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" }}>
              Delete
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Detail / review modal ─────────────────────────────────────────────────────
function ViolationDetailModal({ v, onClose, onSaved }: { v: any; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState(v.reviewNote ?? "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/disciplinary/violations/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: note }),
    })
    setSaving(false)
    onSaved()
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>
            {v.status === "DECLINED" ? "Declined" : v.status === "APPROVED" ? "Approved" : "To Review"} Violation entry for {v.employee.firstName} {v.employee.lastName}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Violation Type</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{v.violationType.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Recorded By</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{v.recordedBy.firstName} {v.recordedBy.lastName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Incident Date</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{fmtDate(v.incidentDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{v.details || "—"}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Reviews</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Note
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)", cursor: "help" }} title="Add a review note, especially when declining">?</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Provide reason if declining"
              rows={3}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={saving}
            style={{ padding: "10px 32px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            Done
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ v, onClose, onDeleted }: { v: any; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const go = async () => {
    setDeleting(true)
    await fetch(`/api/disciplinary/violations/${v.id}`, { method: "DELETE" })
    setDeleting(false)
    onDeleted()
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Delete Violation</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Are you sure you want to delete this violation record? This cannot be undone.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={go} disabled={deleting}
            style={{ padding: "9px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

const th: React.CSSProperties = {
  padding: "12px 20px", textAlign: "left", fontSize: 13, fontWeight: 600,
  color: "var(--foreground)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
}
const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

export default function ViolationsPage() {
  const { user } = useCurrentUser()
  const canManageViolations = user?.can("canManageViolations") ?? false
  const router = useRouter()
  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [delTarget, setDelTarget] = useState<any>(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams({ status })
    if (search) p.set("search", search)
    fetch(`/api/disciplinary/violations?${p}`)
      .then(r => r.json())
      .then(d => { setViolations(d.violations ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, status])

  const totalPages = Math.max(1, Math.ceil(violations.length / PAGE_SIZE))
  const paged = violations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = violations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, violations.length)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: 220 }} />
        </div>
        {canManageViolations && (
          <button onClick={() => router.push("/admin/disciplinary/violations/new")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Record violation
          </button>
        )}
      </div>

      {/* Table card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              <th style={th}>Employee</th>
              <th style={th}>Violation Type</th>
              <th style={th}>Recorded by</th>
              <th style={th}>Incident Date</th>
              <th style={th}>Description</th>
              <th style={{ ...th }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Status
                  <StatusFilterPopover value={status} onChange={v => { setStatus(v); setPage(1) }} />
                </div>
              </th>
              <th style={{ ...th, width: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
                    <Inbox size={40} style={{ margin: "0 auto 12px", strokeWidth: 1.5, opacity: 0.4 }} />
                    <div style={{ fontSize: 13 }}>No data</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(v => (
              <tr key={v.id}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={`${v.employee.firstName} ${v.employee.lastName}`} photo={v.employee.profilePhoto} size={30} />
                    <span style={{ fontWeight: 500 }}>{v.employee.firstName} {v.employee.lastName}</span>
                  </div>
                </td>
                <td style={td}>{v.violationType.name}</td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={`${v.recordedBy.firstName} ${v.recordedBy.lastName}`} photo={v.recordedBy.profilePhoto} size={30} />
                    <span>{v.recordedBy.firstName} {v.recordedBy.lastName}</span>
                  </div>
                </td>
                <td style={{ ...td, color: "var(--muted-foreground)" }}>
                  {new Date(v.incidentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td style={{ ...td, maxWidth: 220 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>
                    {v.details || "—"}
                  </div>
                </td>
                <td style={td}><Badge status={v.status} /></td>
                <td style={{ ...td, textAlign: "right" }}>
                  <RowMenu
                    onView={() => setViewTarget(v)}
                    onDelete={() => setDelTarget(v)}
                    canDelete={canManageViolations}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {violations.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{start}-{end} of {violations.length} items</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: p === page ? "var(--primary)" : "var(--card)", cursor: "pointer", fontSize: 12, color: p === page ? "white" : "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: p === page ? 700 : 400 }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", fontSize: 14, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {viewTarget && (
        <ViolationDetailModal
          v={viewTarget}
          onClose={() => setViewTarget(null)}
          onSaved={() => { setViewTarget(null); load() }}
        />
      )}
      {delTarget && (
        <DeleteModal
          v={delTarget}
          onClose={() => setDelTarget(null)}
          onDeleted={() => { setDelTarget(null); load() }}
        />
      )}
    </div>
  )
}
