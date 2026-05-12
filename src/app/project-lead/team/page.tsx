"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, ChevronDown, Check } from "lucide-react"

const STATUS_OPTS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "TERMINATED", label: "Inactive" },
]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:     { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_LEAVE:   { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
  TERMINATED: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
  RESIGNED:   { bg: "#F3F4F6", color: "#6B7280", label: "Resigned" },
}

const PAGE_SIZES = [10, 20, 50, 100]

function Av({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (photo) return <img src={photo} alt={name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>{initials}</div>
}

export default function PLTeamPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ACTIVE")
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [pageSizeOpen, setPageSizeOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const pageSizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [filterOpen])

  useEffect(() => {
    if (!pageSizeOpen) return
    const h = (e: MouseEvent) => { if (!pageSizeRef.current?.contains(e.target as Node)) setPageSizeOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [pageSizeOpen])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    const r = await fetch(`/api/project-lead/team?${params}`)
    const data = await r.json()
    setEmployees(data.employees ?? [])
    setLoading(false)
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const start = (page - 1) * pageSize
  const paginated = employees.slice(start, start + pageSize)
  const totalPages = Math.ceil(employees.length / pageSize)

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  const filterLabel = STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? "All"

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Team</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
          {employees.length} member{employees.length !== 1 ? "s" : ""} in your department{employees.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search team members…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }}
            />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button onClick={() => setFilterOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {filterLabel} <ChevronDown size={13} />
            </button>
            {filterOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 130, padding: "4px 0" }}>
                {STATUS_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setStatusFilter(o.value); setFilterOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    {o.label} {statusFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            {search ? "No team members match your search." : "No team members found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email Address</th>
                  <th style={th}>ID Number</th>
                  <th style={th}>Department</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp: any) => {
                  const badge = STATUS_BADGE[emp.employeeStatus] ?? { bg: "#F3F4F6", color: "#6B7280", label: emp.employeeStatus }
                  return (
                    <tr key={emp.id} style={{ transition: "background .1s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Av name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} />
                          <span style={{ whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 800 }}>{emp.lastName?.toUpperCase()}</span>
                            {" "}{emp.firstName}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.user?.email ?? "—"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 12 }}>{emp.employeeId}</td>
                      <td style={td}>{emp.department?.name ?? "—"}</td>
                      <td style={td}>{emp.jobTitle ?? "—"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.phone ?? "—"}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {employees.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
            <span>{start + 1}–{Math.min(start + pageSize, employees.length)} of {employees.length} members</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    style={{ padding: "4px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1, fontSize: 13 }}>‹</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        style={{ padding: "4px 10px", background: page === pg ? "var(--primary)" : "var(--muted)", border: `1px solid ${page === pg ? "var(--primary)" : "var(--border)"}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: page === pg ? 700 : 400, color: page === pg ? "white" : "var(--foreground)" }}>
                        {pg}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    style={{ padding: "4px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1, fontSize: 13 }}>›</button>
                </div>
              )}
              <div ref={pageSizeRef} style={{ position: "relative" }}>
                <button onClick={() => setPageSizeOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>
                  {pageSize} / page <ChevronDown size={12} />
                </button>
                {pageSizeOpen && (
                  <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 110, padding: "4px 0" }}>
                    {PAGE_SIZES.map(s => (
                      <button key={s} onClick={() => { setPageSize(s); setPage(1); setPageSizeOpen(false) }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: pageSize === s ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                        {s} / page {pageSize === s && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
