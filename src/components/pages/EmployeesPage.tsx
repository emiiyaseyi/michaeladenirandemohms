"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { Users, Plus, Search, Download, Edit, Eye, Upload } from "lucide-react"
import { formatDate } from "@/lib/utils"
import AddEmployeeForm from "@/components/employees/AddEmployeeForm"
import EditEmployeeModal from "@/components/employees/EditEmployeeModal"
import EmployeePreviewModal from "@/components/employees/EmployeePreviewModal"
import { useCurrentUser } from "@/hooks/useCurrentUser"

export default function EmployeesPage() {
  const { user } = useCurrentUser()
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<any>(null)

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
  }, [search, statusFilter, deptFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Employees</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Manage your workforce</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => window.open("/api/employees/csv-upload", "_blank")}>
            <Download size={14} /> Template
          </Button>
          {user?.caps.canCreateEmployee && (
            <>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
                <Upload size={14} /> {csvUploading ? "Uploading…" : "CSV Upload"}
                <input type="file" accept=".csv" style={{ display: "none" }} onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return
                  setCsvUploading(true); setCsvResult(null)
                  const fd = new FormData(); fd.append("file", f)
                  const r = await fetch("/api/employees/csv-upload", { method: "POST", body: fd })
                  const d = await r.json()
                  setCsvResult(d); setCsvUploading(false); e.target.value = ""
                  if (d.created > 0) load()
                }} />
              </label>
              <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Employee</Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card style={{ padding: "14px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
          <option value="RESIGNED">Resigned</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
          <option value="">All Departments</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{employees.length} result{employees.length !== 1 ? "s" : ""}</div>
      </Card>

      {/* CSV Result Banner */}
      {csvResult && (
        <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: csvResult.created > 0 ? "var(--success-bg)" : "var(--warning-bg)", border: `1px solid ${csvResult.created > 0 ? "var(--success)" : "var(--warning)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span><strong>{csvResult.created}</strong> employee{csvResult.created !== 1 ? "s" : ""} created, <strong>{csvResult.skipped}</strong> skipped.</span>
          <button onClick={() => setCsvResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        ) : employees.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" description="Add your first employee to get started." action={user?.caps.canCreateEmployee ? <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add Employee</Button> : undefined} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role / Type</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hire Date</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={36} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{emp.employeeId} · {emp.workEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13 }}>{emp.department?.name ?? "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: 13 }}>{emp.jobTitle ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{emp.employmentType?.replace(/_/g," ")}</div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: emp.category === "TECHNICAL" ? "#EEF2FF" : "#FFFBEB", color: emp.category === "TECHNICAL" ? "#6366F1" : "#F59E0B" }}>
                        {emp.category === "TECHNICAL" ? "Technical" : "Non-Technical"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{formatDate(emp.hireDate)}</td>
                    <td style={{ padding: "14px 20px" }}><Badge status={emp.employeeStatus} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setSelected(emp)} style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 8px", color: "var(--muted-foreground)" }} title="View"><Eye size={13} /></button>
                        {user?.caps.canEditAnyEmployee && emp.id !== user?.employeeId && (
                          <button onClick={() => setEditTarget(emp)} style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 8px", color: "var(--muted-foreground)" }} title="Edit"><Edit size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Employee" width={720}>
        <AddEmployeeForm departments={departments} onSuccess={() => { setAddOpen(false); load() }} currentUserRole={user?.role} />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.firstName ?? ""} ${editTarget?.lastName ?? ""}`} width={720}>
        {editTarget && (
          <EditEmployeeModal
            employee={editTarget}
            departments={departments}
            employees={employees}
            onClose={() => setEditTarget(null)}
            onSuccess={load}
            currentUserRole={user?.role}
          />
        )}
      </Modal>

      {/* View Employee Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Employee Profile" width={660}>
        {selected && <EmployeePreviewModal employee={selected} />}
      </Modal>
    </div>
  )
}
