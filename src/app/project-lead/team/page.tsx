"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, ChevronDown, Check, Users, UserCheck, CalendarOff, Download } from "lucide-react"

const STATUS_OPTS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Inactive" },
  { value: "RESIGNED", label: "Resigned" },
]

const EMP_TYPE_OPTS = [
  { value: "", label: "All Types" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
  { value: "NYSC", label: "NYSC" },
]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:     { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_LEAVE:   { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
  TERMINATED: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
  RESIGNED:   { bg: "#F3F4F6", color: "#6B7280", label: "Resigned" },
  SUSPENDED:  { bg: "#FEF3C7", color: "#D97706", label: "Suspended" },
}

const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  CONTRACT: "Contract", INTERN: "Intern", NYSC: "NYSC",
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
  const [deptFilter, setDeptFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusOpen, setStatusOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [pageSizeOpen, setPageSizeOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const deptRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)
  const pageSizeRef = useRef<HTMLDivElement>(null)

  const closeAll = (except?: string) => {
    if (except !== "status") setStatusOpen(false)
    if (except !== "dept") setDeptOpen(false)
    if (except !== "type") setTypeOpen(false)
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setDeptOpen(false)
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false)
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node)) setPageSizeOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

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

  // Derive unique departments from loaded employees
  const departments: { id: string; name: string }[] = Array.from(
    new Map(
      employees
        .filter(e => e.department?.id)
        .map(e => [e.department.id as string, e.department as { id: string; name: string }])
    ).values()
  )

  // Client-side filter for dept + type
  const filtered = employees.filter(e => {
    if (deptFilter && e.department?.id !== deptFilter) return false
    if (typeFilter && e.employmentType !== typeFilter) return false
    return true
  })

  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const stats = [
    { label: "Total", value: employees.length, color: "var(--primary)", icon: Users },
    { label: "Active", value: employees.filter(e => e.employeeStatus === "ACTIVE").length, color: "#16a34a", icon: UserCheck },
    { label: "On Leave", value: employees.filter(e => e.employeeStatus === "ON_LEAVE").length, color: "#D97706", icon: CalendarOff },
  ]

  const downloadCSV = () => {
    const headers = ["Employee ID", "First Name", "Last Name", "Email", "Job Title", "Department", "Employment Type", "Status", "Phone"]
    const rows = filtered.map(e => [
      e.employeeId, e.firstName, e.lastName, e.user?.email ?? "", e.jobTitle ?? "",
      e.department?.name ?? "", EMP_TYPE_LABEL[e.employmentType] ?? e.employmentType,
      e.employeeStatus, e.phone ?? "",
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "team.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  const statusLabel = STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? "All Statuses"
  const deptLabel = deptFilter ? (departments.find(d => d?.id === deptFilter)?.name ?? "Department") : "All Departments"
  const typeLabel = EMP_TYPE_OPTS.find(o => o.value === typeFilter)?.label ?? "All Types"

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Team</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
            {(deptFilter || typeFilter || statusFilter) ? " (filtered)" : ""}
          </p>
        </div>
        <button onClick={downloadCSV} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <s.icon size={14} style={{ color: s.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, title…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
          </div>
          {/* Status filter */}
          <div ref={statusRef} style={{ position: "relative" }}>
            <button onClick={() => { closeAll("status"); setStatusOpen(o => !o) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: statusFilter ? "rgba(37,99,235,0.08)" : "var(--muted)", border: `1px solid ${statusFilter ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: statusFilter ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap" }}>
              {statusLabel} <ChevronDown size={13} />
            </button>
            {statusOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 160, padding: "4px 0" }}>
                {STATUS_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setStatusFilter(o.value); setStatusOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    {o.label} {statusFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Department filter (only shown if PL has multiple depts) */}
          {departments.length > 1 && (
            <div ref={deptRef} style={{ position: "relative" }}>
              <button onClick={() => { closeAll("dept"); setDeptOpen(o => !o) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: deptFilter ? "rgba(37,99,235,0.08)" : "var(--muted)", border: `1px solid ${deptFilter ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: deptFilter ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap" }}>
                {deptLabel} <ChevronDown size={13} />
              </button>
              {deptOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 200, maxHeight: 240, overflowY: "auto", padding: "4px 0" }}>
                  <button onClick={() => { setDeptFilter(""); setDeptOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: !deptFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    All Departments {!deptFilter && <Check size={13} />}
                  </button>
                  {departments.map((d: any) => (
                    <button key={d.id} onClick={() => { setDeptFilter(d.id); setDeptOpen(false) }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: deptFilter === d.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      {deptFilter === d.id && <Check size={13} style={{ flexShrink: 0, marginLeft: 8 }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Employment type filter */}
          <div ref={typeRef} style={{ position: "relative" }}>
            <button onClick={() => { closeAll("type"); setTypeOpen(o => !o) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: typeFilter ? "rgba(37,99,235,0.08)" : "var(--muted)", border: `1px solid ${typeFilter ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: typeFilter ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap" }}>
              {typeLabel} <ChevronDown size={13} />
            </button>
            {typeOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 150, padding: "4px 0" }}>
                {EMP_TYPE_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setTypeFilter(o.value); setTypeOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: typeFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    {o.label} {typeFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Clear filters */}
          {(deptFilter || typeFilter || (statusFilter && statusFilter !== "ACTIVE")) && (
            <button onClick={() => { setDeptFilter(""); setTypeFilter(""); setStatusFilter("ACTIVE") }}
              style={{ padding: "7px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            {search || deptFilter || typeFilter ? "No team members match your filters." : "No team members found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>ID</th>
                  <th style={th}>Department</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Type</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Status</th>
                  <th style={th}>Gender</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp: any) => {
                  const badge = STATUS_BADGE[emp.employeeStatus] ?? { bg: "#F3F4F6", color: "#6B7280", label: emp.employeeStatus }
                  return (
                    <tr key={emp.id}
                      style={{ transition: "background .1s" }}
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
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{EMP_TYPE_LABEL[emp.employmentType] ?? emp.employmentType ?? "—"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.phone ?? "—"}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={td}>
                        {emp.gender ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", background: emp.gender === "MALE" ? "#EFF6FF" : "#FDF2F8", color: emp.gender === "MALE" ? "#1D4ED8" : "#9D174D" }}>
                            {emp.gender === "MALE" ? "Male" : "Female"}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
            <span>{start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} members</span>
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
