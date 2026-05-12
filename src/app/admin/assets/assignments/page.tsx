"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Search, Plus, MoreHorizontal, ChevronDown, User } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const opts = [
    { v: "", label: "All" },
    { v: "assigned", label: "Assigned" },
    { v: "released", label: "Released" },
  ]
  const selected = opts.find(o => o.v === value) ?? opts[0]

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", fontSize: 13, color: "var(--foreground)", minWidth: 130 }}>
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

function RowMenu({ onView }: { onView: () => void }) {
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
          <button onClick={() => { setOpen(false); onView() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>View</button>
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function AssignmentsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const canManage = user?.can("canManageAssetAssignments") ?? false
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("assigned")
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (status) p.set("status", status)
    fetch(`/api/assignments?${p}`)
      .then(r => r.json())
      .then(d => { setAssignments(d.assignments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, status])

  const totalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE))
  const paged = assignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, assignments.length)

  const th: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "16px 20px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--card)", color: "var(--foreground)", outline: "none", width: "100%" }} />
        </div>
        <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1) }} />
        <div style={{ flex: 1 }} />
        {canManage && (
          <button onClick={() => router.push("/admin/assets/assignments/new")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Assign Asset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Employee</th>
              <th style={th}>Asset Name</th>
              <th style={th}>Assigned On</th>
              <th style={th}>Description</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 52 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                {search ? "No results match your search." : "No assignments yet."}
              </td></tr>
            ) : paged.map(a => {
              const assignedDate = a.assignedOn ? new Date(a.assignedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
              const isAssigned = a.status === "ASSIGNED"

              return (
                <tr key={a.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {a.employee?.profilePhoto
                          ? <img src={a.employee.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <User size={15} style={{ color: "var(--muted-foreground)" }} />}
                      </div>
                      <span>{a.employee?.firstName} {a.employee?.lastName}</span>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{a.asset?.name}</div>
                    {a.asset?.identifier && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{a.asset.identifier}</div>}
                  </td>
                  <td style={td}>{assignedDate}</td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.description ?? "—"}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600, display: "inline-block",
                      background: isAssigned ? "rgba(234,179,8,0.15)" : "var(--success-bg)",
                      color: isAssigned ? "#92400e" : "var(--success)",
                      border: `1px solid ${isAssigned ? "rgba(234,179,8,0.4)" : "transparent"}`,
                    }}>
                      {isAssigned ? "Assigned" : "Released"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowMenu onView={() => router.push(`/admin/assets/assignments/${a.employee?.id}`)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {assignments.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{start}-{end} of {assignments.length} items</span>
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
    </div>
  )
}
