"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { createPortal } from "react-dom"
import { ChevronDown, Search } from "lucide-react"

const PAGE_SIZE = 8

interface AbsenceRecord {
  id: string
  employeeId: string
  absentStart: string
  absentEnd: string
  totalDays: number
  reason: string
  note: string | null
  status: string
  employee: { id: string; firstName: string; lastName: string; profilePhoto: string | null }
}

interface Batch {
  id: string
  description: string
}

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const opts = ["ALL", "APPROVED", "DECLINED", "NEW"]

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
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  const label = value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--foreground)", outline: "none", minWidth: 90 }}>
        {label}
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 130), background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {opts.map(opt => {
            const lbl = opt === "ALL" ? "All" : opt.charAt(0) + opt.slice(1).toLowerCase()
            return (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
                style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: opt === value ? "var(--muted)" : "none", color: opt === value ? "var(--primary)" : "var(--foreground)", fontWeight: opt === value ? 600 : 400 }}
                onMouseEnter={ev => { if (opt !== value) (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                onMouseLeave={ev => { if (opt !== value) (ev.currentTarget as HTMLElement).style.background = "none" }}>
                {lbl}
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
  return { color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a" }
}

function fmtRange(a: string, b: string) {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }
  return `${new Date(a).toLocaleDateString("en-US", opts)} - ${new Date(b).toLocaleDateString("en-US", opts)}`
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
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 18, color: "var(--primary)", fontWeight: 700, lineHeight: 1 }}>
        ···
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 120, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          <button type="button" onClick={() => setOpen(false)}
            style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: "none", color: "var(--foreground)" }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = "var(--muted)" }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = "none" }}>
            View
          </button>
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

export default function AbsenceBatchPage() {
  const router = useRouter()
  const { batchId } = useParams<{ batchId: string }>()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/time-tracking/absence/batches/${batchId}`)
      .then(r => r.json())
      .then(d => setBatch(d.batch ?? null))
  }, [batchId])

  const load = useCallback(() => {
    fetch(`/api/time-tracking/absence/batches/${batchId}/records?status=${status}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setRecords(d.records ?? []); setPage(1) })
  }, [batchId, status, search])

  useEffect(() => { load() }, [load])

  const total = records.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const doDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/time-tracking/absence/batches/${batchId}/records/${deleteId}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "14px 16px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

  return (
    <div>
      {/* Batch title + action buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{batch?.description ?? "Loading…"}</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => router.push(`/admin/time-tracking/absence/${batchId}/bulk-upload`)}
            style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
            Bulk Upload Absent Days
          </button>
          <button type="button" onClick={() => router.push(`/admin/time-tracking/absence/${batchId}/new`)}
            style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Record Absence
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {/* Toolbar */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", maxWidth: 260 }}>
            <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
              style={{ width: "100%", padding: "8px 12px 8px 34px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <StatusDropdown value={status} onChange={setStatus} />
          <button type="button" style={{ marginLeft: "auto", padding: "8px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Batch Review
          </button>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 44 }}><input type="checkbox" /></th>
              <th style={th}>Name</th>
              <th style={th}>Absent Days</th>
              <th style={th}>Total Days</th>
              <th style={th}>Reason</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
                  No records found
                </td>
              </tr>
            ) : paginated.map(r => (
              <tr key={r.id}>
                <td style={td}><input type="checkbox" /></td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <EmpAvatar emp={r.employee} />
                    <span style={{ fontWeight: 500 }}>{r.employee.firstName} {r.employee.lastName}</span>
                  </div>
                </td>
                <td style={td}>{fmtRange(r.absentStart, r.absentEnd)}</td>
                <td style={td}>{r.totalDays}</td>
                <td style={{ ...td, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason || "NA"}</td>
                <td style={td}>
                  <div>
                    <span style={{ ...statusColor(r.status), padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-block" }}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                    {r.note && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>{r.note}</div>}
                  </div>
                </td>
                <td style={td}><RowMenu onDelete={() => setDeleteId(r.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

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
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Record</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>Are you sure you want to delete this absence record? This cannot be undone.</p>
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
