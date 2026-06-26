"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Loader2, ChevronDown, Check, KeyRound, Eye, RefreshCw, UserPlus, FileUp, ShieldCheck, Trash2, UserCog } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import PageHeader from "@/components/ui/PageHeader"
import { useDropdownPosition } from "@/hooks/useDropdownPosition"

const STATUS_OPTS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Inactive" },
]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:          { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_LEAVE:        { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
  SUSPENDED:       { bg: "#FEE2E2", color: "#DC2626", label: "Suspended" },
  TERMINATED:      { bg: "#F3F4F6", color: "#6B7280", label: "Terminated" },
  RESIGNED:        { bg: "#F3F4F6", color: "#6B7280", label: "Resigned" },
  NEEDS_ATTENTION: { bg: "#EFF6FF", color: "#1D4ED8", label: "Needs Attention" },
}

const PAGE_SIZES = [10, 20, 50, 100]

function Av({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  if (photo) return <img src={photo} alt={name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>{initials}</div>
}

function RoleBadge({ emp, onChanged, isSuperAdmin }: { emp: any; onChanged: () => void; isSuperAdmin: boolean }) {
  const role: string = emp.user?.role ?? "STAFF"
  const isPL = role === "PROJECT_LEAD"
  const isIntern = (emp.jobTitle ?? "").toLowerCase().includes("intern") || emp.employmentType === "INTERN"
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!isSuperAdmin || !emp.userId || isIntern) return
    const newRole = isPL ? "STAFF" : "PROJECT_LEAD"
    setLoading(true)
    await fetch(`/api/employees/${emp.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    setLoading(false)
    onChanged()
  }

  if (isIntern) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "rgba(245,158,11,0.12)", color: "#d97706", whiteSpace: "nowrap" }}>
        Intern
      </span>
    )
  }

  return (
    <button
      onClick={isSuperAdmin && emp.userId ? toggle : undefined}
      disabled={loading || !emp.userId}
      title={isSuperAdmin && emp.userId ? `Click to change to ${isPL ? "Staff" : "Project Lead"}` : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
        padding: "3px 9px", borderRadius: 20, border: "none",
        background: isPL ? "rgba(99,102,241,0.12)" : "var(--muted)",
        color: isPL ? "#6366f1" : "var(--muted-foreground)",
        cursor: isSuperAdmin && emp.userId ? "pointer" : "default",
        whiteSpace: "nowrap",
        opacity: loading ? 0.6 : 1,
        transition: "all .15s",
      }}
    >
      {isPL && <ShieldCheck size={10} />}
      {isPL ? "Project Lead" : "Staff"}
    </button>
  )
}

function RowMenu({ onView, onReset, onDelete, onChangeRole }: {
  onView: () => void; onReset: () => void;
  onDelete?: () => void; onChangeRole?: () => void
}) {
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
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 160, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onView() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <Eye size={13} /> View
          </button>
          <button onClick={() => { setOpen(false); onReset() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <KeyRound size={13} /> Reset Password
          </button>
          {onChangeRole && (
            <button onClick={() => { setOpen(false); onChangeRole() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
              <UserCog size={13} /> Change Role
            </button>
          )}
          {onDelete && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
              <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
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
  const canDeleteEmployee = user?.role === "SUPER_ADMIN" || (user?.can("canDeleteEmployee") ?? false)
  const canChangeRole = user?.role === "SUPER_ADMIN" || (user?.can("canEditEmployee") ?? false)
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
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
  const { ref: filterBtnRef, pos: filterPos, recompute: recomputeFilterPos } = useDropdownPosition<HTMLButtonElement>()
  const { ref: deptBtnRef, pos: deptPos, recompute: recomputeDeptPos } = useDropdownPosition<HTMLButtonElement>()
  const [pageSizeOpen, setPageSizeOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [roleChangeTarget, setRoleChangeTarget] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState<"STAFF" | "PROJECT_LEAD">("STAFF")
  const [roleChanging, setRoleChanging] = useState(false)
  const [conversionEmpType, setConversionEmpType] = useState("FULL_TIME")
  const [conversionJobTitle, setConversionJobTitle] = useState("")
  const [conversionStartDate, setConversionStartDate] = useState("")
  const [conversionJobTitles, setConversionJobTitles] = useState<string[]>([])

  useEffect(() => {
    if (!manageOpen) return
    const h = (e: MouseEvent) => { if (!manageRef.current?.contains(e.target as Node)) setManageOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [manageOpen])

  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [filterOpen])

  useEffect(() => {
    if (!deptOpen) return
    const h = (e: MouseEvent) => { if (!deptRef.current?.contains(e.target as Node)) setDeptOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [deptOpen])

  useEffect(() => {
    if (!pageSizeOpen) return
    const h = (e: MouseEvent) => { if (!pageSizeRef.current?.contains(e.target as Node)) setPageSizeOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [pageSizeOpen])

  useEffect(() => {
    if (!roleChangeTarget) return
    const isIntern = (roleChangeTarget.jobTitle ?? "").toLowerCase().includes("intern") || roleChangeTarget.employmentType === "INTERN"
    if (!isIntern || conversionJobTitles.length > 0) return
    fetch("/api/job-titles").then(r => r.json()).then(d => setConversionJobTitles((d.jobTitles ?? []).map((jt: any) => jt.name))).catch(() => {})
  }, [roleChangeTarget, conversionJobTitles.length])

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

  const doDelete = async (id: string) => {
    setDeleting(true)
    const r = await fetch(`/api/employees/${id}`, { method: "DELETE" })
    setDeleting(false)
    if (r.ok) {
      setDeleteTarget(null)
      setResetMsg("Employee deleted successfully.")
      setTimeout(() => setResetMsg(""), 4000)
      load()
    } else {
      const d = await r.json()
      setResetMsg(d.error ?? "Failed to delete employee.")
      setTimeout(() => setResetMsg(""), 5000)
      setDeleteTarget(null)
    }
  }

  const doChangeRole = async () => {
    if (!roleChangeTarget) return
    const targetIsIntern = (roleChangeTarget.jobTitle ?? "").toLowerCase().includes("intern") || roleChangeTarget.employmentType === "INTERN"
    if (targetIsIntern && (!conversionEmpType || !conversionJobTitle || !conversionStartDate)) {
      setResetMsg("Please fill in all conversion fields.")
      setTimeout(() => setResetMsg(""), 4000)
      return
    }
    setRoleChanging(true)
    const body: any = { role: selectedRole }
    if (targetIsIntern) {
      body.employmentType = conversionEmpType
      body.jobTitle = conversionJobTitle
      body.convertedAt = conversionStartDate
    }
    const r = await fetch(`/api/employees/${roleChangeTarget.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setRoleChanging(false)
    if (r.ok) {
      setRoleChangeTarget(null)
      setConversionEmpType("FULL_TIME")
      setConversionJobTitle("")
      setConversionStartDate("")
      setResetMsg(targetIsIntern ? `Intern converted to ${selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"} successfully.` : `Role updated to ${selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}.`)
      setTimeout(() => setResetMsg(""), 4000)
      load()
    } else {
      const d = await r.json()
      setResetMsg(d.error ?? "Failed to change role.")
      setTimeout(() => setResetMsg(""), 5000)
    }
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
    ] : []),
    ...(canEditEmployee ? [
      { label: "Bulk update Employees", icon: <RefreshCw size={13} />, href: "/admin/people/employees/bulk-update" },
    ] : []),
  ]

  const headerActions = (
    <>
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
    </>
  )

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
        actions={headerActions}
      />

      {resetMsg && (
        <div style={{ padding: "11px 16px", borderRadius: 8, marginBottom: 16, background: "#DCFCE7", border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d" }}>
          {resetMsg}
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, rowGap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
              style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button ref={filterBtnRef} onClick={() => { recomputeFilterPos(); setFilterOpen(o => !o) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {filterLabel} <ChevronDown size={13} />
            </button>
            {filterOpen && typeof document !== "undefined" && createPortal(
              <div style={{ position: "fixed", top: filterPos.top, left: filterPos.left, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 130, padding: "4px 0" }}>
                {STATUS_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setStatusFilter(o.value); setFilterOpen(false) }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 16px", background: statusFilter === o.value ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                    {o.label} {statusFilter === o.value && <Check size={13} />}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          <div ref={deptRef} style={{ position: "relative" }}>
            <button ref={deptBtnRef} onClick={() => { recomputeDeptPos(); setDeptOpen(o => !o) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {deptFilter ? (departments.find((d: any) => d.id === deptFilter)?.name ?? "Department") : "All Departments"} <ChevronDown size={13} />
            </button>
            {deptOpen && typeof document !== "undefined" && createPortal(
              <div style={{ position: "fixed", top: deptPos.top, left: deptPos.left, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 180, maxWidth: 260, maxHeight: 240, overflowY: "auto", padding: "4px 0" }}>
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
              </div>,
              document.body
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
                  <th style={th}>ID Number</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Status</th>
                  <th style={th}>Gender</th>
                  <th style={th}>Department</th>
                  <th style={th}>Dept. Phone</th>
                  <th style={th}>Dept. Email</th>
                  <th style={th}>Role</th>
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
                      <td style={{ ...td, color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 12 }}>{emp.employeeId}</td>
                      <td style={td}>{emp.jobTitle ?? "-"}</td>
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
                        ) : "-"}
                      </td>
                      <td style={td}>{emp.department?.name ?? "-"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.department?.phone ?? "-"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{emp.department?.email ?? "-"}</td>
                      <td style={td} onClick={e => e.stopPropagation()}>
                        <RoleBadge emp={emp} onChanged={load} isSuperAdmin={user?.role === "SUPER_ADMIN"} />
                      </td>
                      <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <RowMenu
                          onView={() => router.push(`/admin/people/employees/${emp.id}`)}
                          onReset={() => setResetTarget(emp)}
                          onDelete={canDeleteEmployee ? () => setDeleteTarget(emp) : undefined}
                          onChangeRole={canChangeRole && emp.userId ? () => {
                            const empIsIntern = (emp.jobTitle ?? "").toLowerCase().includes("intern") || emp.employmentType === "INTERN"
                            if (empIsIntern) {
                              setSelectedRole("STAFF")
                              setConversionEmpType("FULL_TIME")
                              setConversionJobTitle("")
                              setConversionStartDate("")
                            } else {
                              setSelectedRole((emp.user?.role === "PROJECT_LEAD" ? "STAFF" : "PROJECT_LEAD") as "STAFF" | "PROJECT_LEAD")
                            }
                            setRoleChangeTarget(emp)
                          } : undefined} />
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

      {/* Delete Confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#DC2626" }}>Delete Employee</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 8 }}>
              Are you sure you want to permanently delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 24, fontWeight: 600 }}>
              This action cannot be undone. All employee data, records, and history will be removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => doDelete(deleteTarget.id)} disabled={deleting} style={{ padding: "9px 20px", background: "#DC2626", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {deleting ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Deleting…</> : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeTarget && (() => {
        const targetIsIntern = (roleChangeTarget.jobTitle ?? "").toLowerCase().includes("intern") || roleChangeTarget.employmentType === "INTERN"
        const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }
        return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: targetIsIntern ? 480 : 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {targetIsIntern ? (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Convert Intern to Staff</h2>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
                  Converting <strong>{roleChangeTarget.firstName} {roleChangeTarget.lastName}</strong> from Intern to a full team member. All their intern data (reports, leave history, audit log) is preserved.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Role *</label>
                    <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as "STAFF" | "PROJECT_LEAD")} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                      <option value="STAFF">Staff</option>
                      <option value="PROJECT_LEAD">Project Lead</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Employment Type *</label>
                    <select value={conversionEmpType} onChange={e => setConversionEmpType(e.target.value)} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Job Title *</label>
                    <select value={conversionJobTitle} onChange={e => setConversionJobTitle(e.target.value)} style={{ ...fi, appearance: "none", cursor: "pointer" }}>
                      <option value="">Select job title…</option>
                      {conversionJobTitles.map(jt => <option key={jt} value={jt}>{jt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date *</label>
                    <input type="date" value={conversionStartDate} onChange={e => setConversionStartDate(e.target.value)} style={fi} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>A welcome notification and email will be sent to the employee. HR will receive a check-in reminder 5 months from this date.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Change Role</h2>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
                  Change the role of <strong>{roleChangeTarget.firstName} {roleChangeTarget.lastName}</strong> from{" "}
                  <strong>{(roleChangeTarget.user?.role ?? "STAFF") === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</strong> to{" "}
                  <strong>{selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</strong>?
                </p>
                <div style={{ padding: "14px 16px", borderRadius: 10, border: "2px solid var(--primary)", background: "rgba(37,99,235,0.05)", marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selectedRole === "PROJECT_LEAD" ? "Project Lead" : "Staff"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{selectedRole === "PROJECT_LEAD" ? "Can approve leave requests for their assigned departments. Access to the Project Lead portal." : "Standard employee access. Leave requests routed to their Project Lead."}</div>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>The employee must sign out and back in for this change to take effect.</p>
              </>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setRoleChangeTarget(null)} disabled={roleChanging} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doChangeRole} disabled={roleChanging} style={{ padding: "9px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: roleChanging ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                {roleChanging ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : targetIsIntern ? "Convert to Staff" : "Confirm Change"}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        )
      })()}
    </div>
  )
}
