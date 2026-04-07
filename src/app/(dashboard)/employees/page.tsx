"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { Users, Plus, Search, Filter, Download, Edit, Eye, Phone, Mail } from "lucide-react"
import { formatDate } from "@/lib/utils"
import AddEmployeeForm from "./AddEmployeeForm"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)

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
          <Button variant="secondary" size="sm"><Download size={14} /> Export</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Employee</Button>
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

      {/* Table */}
      <Card>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        ) : employees.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" description="Add your first employee to get started." action={<Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add Employee</Button>} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role / Type</th>
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
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{formatDate(emp.hireDate)}</td>
                    <td style={{ padding: "14px 20px" }}><Badge status={emp.employeeStatus} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setSelected(emp)} style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 8px", color: "var(--muted-foreground)" }} title="View"><Eye size={13} /></button>
                        <button style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "5px 8px", color: "var(--muted-foreground)" }} title="Edit"><Edit size={13} /></button>
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
        <AddEmployeeForm departments={departments} onSuccess={() => { setAddOpen(false); load() }} />
      </Modal>

      {/* View Employee Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Employee Profile" width={640}>
        {selected && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <Avatar name={`${selected.firstName} ${selected.lastName}`} photo={selected.profilePhoto} size={64} />
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.firstName} {selected.lastName}</h2>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{selected.jobTitle ?? "—"} · {selected.department?.name ?? "—"}</p>
                <div style={{ marginTop: 6 }}><Badge status={selected.employeeStatus} /></div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Employee ID", value: selected.employeeId },
                { label: "Email", value: selected.workEmail },
                { label: "Phone", value: selected.phone ?? "—" },
                { label: "Employment Type", value: selected.employmentType?.replace(/_/g," ") },
                { label: "Hire Date", value: formatDate(selected.hireDate) },
                { label: "Department", value: selected.department?.name ?? "—" },
                { label: "Manager", value: selected.manager ? `${selected.manager.firstName} ${selected.manager.lastName}` : "—" },
                { label: "Annual Leave Balance", value: `${selected.annualLeaveBalance} days` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--muted)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
