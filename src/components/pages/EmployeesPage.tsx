"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Loader2, ChevronDown, Check, KeyRound, Eye, Upload, RefreshCw, UserPlus, FileUp, FileDown } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

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

function RowMenu({ emp, onView, onReset }: { emp: any; onView: () => void; onReset: () => void }) {
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
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 150, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <Eye size={13} /> View
          </button>
          <button onClick={() => { setOpen(false); onReset() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <KeyRound size={13} /> Reset Password
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

export default function EmployeesPage() {
  const { user } = useCurrentUser()
  const canCreateEmployee = user?.can("canCreateEmployee") ?? false
  const canEditEmployee = user?.can("canEditEmployee") ?? false
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ACTIVE")
  const [deptFilter, setDeptFilter] = useState("")
  const [manageOpen, setManageOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [resetting, setResetting] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetMsg, setResetMsg] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const manageRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const deptRef = useRef<HTMLDivElement>(null)
  const pageSizeRef = useRef<HTMLDivElement>(null)
  const [pageSizeOpen, setPageSizeOpen] = useState(false)

  useEffect(() => {
    if (!manageOpen) return
    const h = (e: MouseEvent) => { if (!manageRef.current?.contains(e.target as Node)) setManageOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [manageOpen])

  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [filterOpen])

  useEffect(() => {
    if (!deptOpen) return
    const h = (e: MouseEvent) => { if (!deptRef.current?.contains(e.target as Node)) setDeptOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [deptOpen])

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
    if (deptFilter) params.set("dept", deptFilter)
    const r = await fetch(`/api/employees?${params}`)
    const data = await r.json()
    setEmployees(data.employees ?? [])
    setDepartments(data.departments ?? [])
    setLoading(false)
    setSelected(new Set())
    setPage(1)
  }, [search, statusFilter, deptFilter])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const start = (page - 1) * pageSize
  const paginated = employees.slice(start, start + pageSize)
  const totalPages = Math.ceil(employees.length / pageSize)

  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map(e => e.id)))
    }
  }

  const doReset = async (ids: string[]) => {
    setResetting(true)
    if (ids.length === 1) {
      await fetch(`/api/employees/${ids[0]}/reset-password`, { method: "POST" })
    } else {
      await fetch("/api/employees/bulk-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: ids }),
      })
    }
    setResetting(false)
    setResetTarget(null)
    setSelected(new Set())
    setResetMsg(`Password${ids.length > 1 ? "s" : ""} reset to default successfully.`)
    setTimeout(() => setResetMsg(""), 4000)
  }

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }
  const td: React.CSSProperties = { padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  const filterLabel = STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? "All"
  const allSelected = paginated.length > 0 && paginated.every(e => selected.has(e.id))
  const someSelected = selected.size > 0

  const manageItems = [
    ...(canCreateEmployee ? [
      { label: "Add new Employee", icon: <UserPlus size={13} />, href: "/admin/people/employees/add" },
      { label: "Bulk upload Employees", icon: <FileUp size={13} />, href: "/admin/people/employees/bulk-upload" },
      { label: "Bulk upload Accounts", icon: <Upload size={13} />, href: "/admin/people/employees/bulk-upload-accounts" },
      { label: "Bulk upload Annual Earning", icon: <FileDown size={13} />, href: "/admin/people/employees/bulk-upload-earnings" },
    ] : []),
    ...(canEditEmployee ? [
      { label: "Bulk update Employees", icon: <RefreshCw size={13} />, href: "/admin/people/employees/bulk-update" },
    ] : []),
  ]

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Employees</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {someSelected && (
            <button onClick={() => setResetTarget("bulk")} disabled={resetting}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "none", border: "1px solid var(--border)", borderRadius: 9, cursor: resetting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
              <KeyRound size={14} /> Reset {selected.size} Password{selected.size > 1 ? "s" : ""}
            </button>
          )}
          {(canCreateEmployee || canEditEmployee) && manageItems.length > 0 && (
            <div ref={manageRef} style={{ position: "relative" }}>
              <button onClick={() => setManageOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
                Manage <ChevronDown size={14} />
              </button>
              {manageOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 220, padding: "4px 0" }}>
                  {manageItems.map(item => (
                    <button key={item.href} onClick={() => { setManageOpen(false); router.push(item.href) }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {resetMsg && (
        <div style={{ padding: "11px 16px", borderRadius: 8, marginBottom: 16, background: "#DCFCE7", border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d" }}>
          {resetMsg}
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
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
          <div ref={deptRef} style={{ position: "relative" }}>
            <button onClick={() => setDeptOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {deptFilter ? (departments.find((d: any) => d.id === deptFilter)?.name ?? "Department") : "All Departments"} <ChevronDown size={13} />
            </button>
            {deptOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 180, maxWidth: 260, maxHeight: 240, overflowY: "auto", padding: "4px 0" }}>
                <button onClick={() => { setDeptFilter(""); setDeptOpen(false) }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: !deptFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>All Departments</span>
                  {!deptFilter && <Check size={13} style={{ flexShrink: 0, marginLeft: 8 }} />}
                </button>
                {departments.map((d: any) => (
                  <button key={d.id} onClick={() => { setDeptFilter(d.id); setDeptOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: deptFilter === d.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.name}>{d.name}</span>
                    {deptFilter === d.id && <Check size={13} style={{ flexShrink: 0, marginLeft: 8 }} />}
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
            {search ? "No employees match your search." : "No employees found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 44, padding: "11px 16px" }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                  </th>
                  <th style={th}>Name</th>
                  <th style={th}>Email Address</th>
                  <th style={th}>ID Number</th>
                  <th style={th}>Department</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp: any) => {
                  const isSelected = selected.has(emp.id)
                  const badge = STATUS_BADGE[emp.employeeStatus] ?? { bg: "#F3F4F6", color: "#6B7280", label: emp.employeeStatus }
                  return (
                    <tr key={emp.id}
                      onClick={() => router.push(`/admin/people/employees/${emp.id}`)}
                      style={{ transition: "background .1s", background: isSelected ? "var(--muted)" : "", cursor: "pointer" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "" }}>
                      <td style={{ ...td, width: 44, padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(emp.id)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                      </td>
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
                      <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <RowMenu emp={emp}
                          onView={() => router.push(`/admin/people/employees/${emp.id}`)}
                          onReset={() => setResetTarget(emp)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {employees.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
            <span>
              {start + 1}–{Math.min(start + pageSize, employees.length)} of {employees.length} items
              {someSelected ? ` · ${selected.size} selected` : ""}
            </span>
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

      {/* Single Reset Confirm */}
      {resetTarget && resetTarget !== "bulk" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Reset Password</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
              Reset the password for <strong>{resetTarget.firstName} {resetTarget.lastName}</strong> to the system default? They'll be required to change it on next login.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResetTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => doReset([resetTarget.id])} disabled={resetting} style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: resetting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {resetting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Resetting…</> : "Reset Password"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Bulk Reset Confirm */}
      {resetTarget === "bulk" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Reset Multiple Passwords</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
              Reset the passwords for <strong>{selected.size} employee{selected.size > 1 ? "s" : ""}</strong> to the system default? They'll each be required to change it on next login.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResetTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => doReset(Array.from(selected))} disabled={resetting} style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: resetting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {resetting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Resetting…</> : "Reset Passwords"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
