"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, Search, Inbox } from "lucide-react"

const PAGE_SIZE = 8

interface Suspension {
  id: string
  employeeId: string
  startDate: string
  endDate: string | null
  reason: string | null
  status: string
  alreadyOccurred: boolean
  employee: { id: string; firstName: string; lastName: string; profilePhoto: string | null }
}

function StatusDropdown({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
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

  const label = value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--foreground)", outline: "none", whiteSpace: "nowrap" }}>
        {label}
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 160, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {options.map(opt => {
            const optLabel = opt.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
            return (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
                style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: opt === value ? "var(--muted)" : "none", color: opt === value ? "var(--primary)" : "var(--foreground)", fontWeight: opt === value ? 600 : 400 }}
                onMouseEnter={ev => { if (opt !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                onMouseLeave={ev => { if (opt !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
                {optLabel}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}

function statusColor(status: string) {
  if (status === "APPROVED") return { color: "#16a34a", background: "#dcfce7", border: "1px solid #bbf7d0" }
  if (status === "DECLINED") return { color: "#dc2626", background: "#fee2e2", border: "1px solid #fecaca" }
  if (status === "SUSPENDED") return { color: "#dc2626", background: "#fee2e2", border: "1px solid #fecaca" }
  if (status === "PENDING") return { color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a" }
  return { color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a" }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function RowMenu({ onDelete }: { onDelete: () => void }) {
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
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 18, color: "var(--primary)", fontWeight: 700, lineHeight: 1 }}>
        ···
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 120, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          <button type="button" onClick={() => { onDelete(); setOpen(false) }}
            style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: "none", color: "var(--danger)" }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = "none" }}>
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

function EmpAvatar({ emp }: { emp: { firstName: string; lastName: string; profilePhoto: string | null } }) {
  if (emp.profilePhoto) return <img src={emp.profilePhoto} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase()
  return <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", flexShrink: 0 }}>{initials}</div>
}

export default function SuspensionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"suspensions" | "schedules">("suspensions")
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [search, setSearch] = useState("")
  const [susStatus, setSusStatus] = useState("TO_REVIEW")
  const [schedStatus, setSchedStatus] = useState("PENDING")
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    const status = tab === "suspensions" ? susStatus : schedStatus
    fetch(`/api/disciplinary/suspensions?tab=${tab}&status=${status}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setSuspensions(d.suspensions ?? []); setPage(1) })
  }, [tab, susStatus, schedStatus, search])

  useEffect(() => { load() }, [load])

  const total = suspensions.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = suspensions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const doDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/disciplinary/suspensions/${deleteId}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const susOpts = ["TO_REVIEW", "APPROVED", "DECLINED"]
  const schedOpts = ["PENDING", "SUSPENDED"]

  const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "14px 16px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

  return (
    <div>
      {/* Tab bar + action buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)" }}>
          {(["suspensions", "schedules"] as const).map(t => (
            <button key={t} type="button" onClick={() => { setTab(t); setSearch("") }}
              style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 700 : 400, color: tab === t ? "var(--primary)" : "var(--muted-foreground)", borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent", marginBottom: -2, textTransform: "capitalize" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => router.push("/admin/disciplinary/suspensions/bulk-upload")}
            style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
            Bulk upload Suspensions
          </button>
          <button type="button" onClick={() => router.push("/admin/disciplinary/suspensions/new")}
            style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Record Suspension
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {/* Toolbar */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
              style={{ width: "100%", padding: "8px 12px 8px 34px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <StatusDropdown value={tab === "suspensions" ? susStatus : schedStatus} onChange={tab === "suspensions" ? setSusStatus : setSchedStatus} options={tab === "suspensions" ? susOpts : schedOpts} />
          {tab === "suspensions" && (
            <button type="button" style={{ marginLeft: "auto", padding: "8px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Batch Review
            </button>
          )}
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {tab === "suspensions" && <th style={{ ...th, width: 44 }}><input type="checkbox" /></th>}
              <th style={th}>Employee</th>
              <th style={th}>Start Date</th>
              <th style={th}>End Date</th>
              {tab === "suspensions" && <th style={th}>Reason</th>}
              <th style={th}>Status</th>
              <th style={{ ...th, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={tab === "suspensions" ? 7 : 5} style={{ ...td, textAlign: "center", padding: "48px 0" }}>
                  <Inbox size={36} style={{ color: "var(--border)", margin: "0 auto 10px" }} />
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No data</div>
                </td>
              </tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                {tab === "suspensions" && <td style={td}><input type="checkbox" /></td>}
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <EmpAvatar emp={s.employee} />
                    <span style={{ fontWeight: 500 }}>{s.employee.firstName} {s.employee.lastName}</span>
                  </div>
                </td>
                <td style={td}>{fmt(s.startDate)}</td>
                <td style={td}>{s.endDate ? fmt(s.endDate) : "—"}</td>
                {tab === "suspensions" && <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.reason || "—"}</td>}
                <td style={td}>
                  <span style={{ ...statusColor(s.status), padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {s.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </td>
                <td style={td}><RowMenu onDelete={() => setDeleteId(s.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)", marginRight: 8 }}>{start}–{end} of {total} items</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {"<"}
            </button>
            <span style={{ width: 30, height: 30, border: "1px solid var(--primary)", borderRadius: 6, background: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {">"}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: "28px 32px", width: 360, boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Suspension</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Are you sure you want to delete this suspension record? This cannot be undone.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setDeleteId(null)}
                style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button type="button" onClick={doDelete} disabled={deleting}
                style={{ padding: "9px 20px", background: "var(--danger, #dc2626)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
