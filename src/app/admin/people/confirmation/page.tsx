"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, CheckCircle, MoreHorizontal } from "lucide-react"

function Av({ name, photo, size = 34 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "white", flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function daysLate(hireDate: string | null, probationEndDate: string | null) {
  const base = probationEndDate ? new Date(probationEndDate) : hireDate ? new Date(new Date(hireDate).getTime() + 90 * 86400000) : null
  if (!base) return null
  const diff = Math.floor((Date.now() - base.getTime()) / 86400000)
  return diff > 0 ? diff : null
}

function RowMenu({ onConfirm }: { onConfirm: () => void }) {
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
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 120, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onConfirm() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Confirm</button>
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function ConfirmationPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [deptOpen, setDeptOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<any>(null)
  const [confirming, setConfirming] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/people/confirmation")
      .then(r => r.json())
      .then(d => { setEmployees(d.employees ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const departments = Array.from(new Set(employees.map(e => e.department?.name).filter(Boolean))).sort()

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || (e.user?.email ?? "").toLowerCase().includes(q)
    const matchDept = !deptFilter || e.department?.name === deptFilter
    return matchQ && matchDept
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(paged.every(e => selected.has(e.id)) ? new Set() : new Set(paged.map(e => e.id)))

  const doConfirm = async () => {
    if (!confirmTarget) return
    setConfirming(true)
    const r = await fetch(`/api/people/confirmation/${confirmTarget.id}`, { method: "POST" })
    setConfirming(false)
    if (r.ok) setEmployees(prev => prev.filter(e => e.id !== confirmTarget.id))
    setConfirmTarget(null)
  }

  const th: React.CSSProperties = { padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 16px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      {/* Top filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 200, outline: "none" }} />
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setDeptOpen(o => !o)}
            style={{ padding: "8px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            {deptFilter || "Filter by department"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {deptOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 200, padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
              <button onClick={() => { setDeptFilter(""); setDeptOpen(false); setPage(1) }}
                style={{ display: "block", width: "100%", padding: "9px 16px", background: !deptFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>
                All departments
              </button>
              {departments.map(d => (
                <button key={d} onClick={() => { setDeptFilter(d); setDeptOpen(false); setPage(1) }}
                  style={{ display: "block", width: "100%", padding: "9px 16px", background: deptFilter === d ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>Confirmation</h2>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <CheckCircle size={32} style={{ color: "var(--primary)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>All confirmed</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No employees are pending confirmation.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 40 }}>
                    <input type="checkbox" checked={paged.length > 0 && paged.every(e => selected.has(e.id))} onChange={toggleAll} style={{ cursor: "pointer" }} />
                  </th>
                  <th style={th}>Name</th>
                  <th style={th}>Email Address</th>
                  <th style={th}>Department</th>
                  <th style={th}>Confirmation</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(e => {
                  const late = daysLate(e.hireDate, e.probationEndDate)
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ ...td, width: 40 }}>
                        <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} style={{ cursor: "pointer" }} />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Av name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} />
                          <div style={{ fontWeight: 700 }}>{e.lastName?.toUpperCase()} {e.firstName}</div>
                        </div>
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)", fontSize: 12 }}>{e.user?.email ?? "—"}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{e.department?.name ?? "—"}</div>
                        {e.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle}</div>}
                      </td>
                      <td style={td}>
                        {late != null ? (
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{late} days late</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)", fontSize: 12 }}>{e.phone ?? "—"}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#DCFCE7", color: "#15803d" }}>Active</span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <RowMenu onConfirm={() => setConfirmTarget(e)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…")
                acc.push(p); return acc
              }, []).map((p, i) => (
                typeof p === "string" ? <span key={i} style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "0 4px" }}>…</span> :
                <button key={p} onClick={() => setPage(p as number)}
                  style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: page === p ? "var(--primary)" : "var(--background)", color: page === p ? "white" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>›</button>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", marginLeft: 8 }}>{PAGE_SIZE} / page</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 480, padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Confirm {confirmTarget.firstName} {confirmTarget.lastName}?</h2>
              <button onClick={() => setConfirmTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>
              Once you confirm this employee. Their profile will be updated in the system, ensuring seamless access to company resources and privileges.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setConfirmTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doConfirm} disabled={confirming}
                style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: confirming ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
                {confirming ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
