"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import { Building2, CalendarDays, Plus, Users, ShieldCheck, KeyRound, UserX, UserCheck, Pencil, Trash2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { roleLabel, ALL_ROLES, type SystemRole } from "@/lib/rbac"

// ─── Input style helper ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRecord {
  id: string
  name: string | null
  email: string | null
  role: SystemRole
  isActive: boolean
  createdAt: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    jobTitle: string | null
    employeeStatus: string
    department: { id: string; name: string } | null
  } | null
}

const BLANK_USER_FORM = {
  firstName: "", lastName: "", email: "", password: "", role: "STAFF" as SystemRole,
  jobTitle: "", departmentId: "", employmentType: "FULL_TIME", employeeId: "",
}

export default function SettingsPage() {
  const { user: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN"

  type Tab = "departments" | "leave-types" | "holidays" | "users"
  const [tab, setTab] = useState<Tab>("departments")

  // ─── Settings data ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [settingsError, setSettingsError] = useState("")

  const BLANK_DEPT = { name: "", description: "", divisionId: "" }
  const BLANK_LEAVE = { name: "", description: "", defaultDays: "21", waitingDays: "0", genderSpecific: "", requiresDoc: false, minDocDays: "2", isActive: true }
  const BLANK_HOLIDAY = { name: "", date: "" }

  const [deptForm, setDeptForm] = useState({ ...BLANK_DEPT })
  const [leaveForm, setLeaveForm] = useState({ ...BLANK_LEAVE })
  const [holidayForm, setHolidayForm] = useState({ ...BLANK_HOLIDAY })

  const [editingDept, setEditingDept] = useState<any | null>(null)
  const [editingLeave, setEditingLeave] = useState<any | null>(null)
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null)

  const [deptOpen, setDeptOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [holidayOpen, setHolidayOpen] = useState(false)

  // ─── User management data ──────────────────────────────────────────────────
  const [sysUsers, setSysUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRecord | null>(null)
  const [userForm, setUserForm] = useState({ ...BLANK_USER_FORM })
  const [editRole, setEditRole] = useState<SystemRole>("STAFF")
  const [newPassword, setNewPassword] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [userError, setUserError] = useState("")

  // ─── Load settings ─────────────────────────────────────────────────────────
  const loadSettings = async () => {
    const r = await fetch("/api/settings")
    const d = await r.json()
    setDepartments(d.departments ?? [])
    setDivisions(d.divisions ?? [])
    setLeaveTypes(d.leaveTypes ?? [])
    setHolidays(d.holidays ?? [])
  }

  const loadUsers = async () => {
    if (!isSuperAdmin) return
    setUsersLoading(true)
    const r = await fetch("/api/settings/users")
    const d = await r.json()
    setSysUsers(d.users ?? [])
    setUsersLoading(false)
  }

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { if (tab === "users") loadUsers() }, [tab, isSuperAdmin])

  // ─── Settings actions ──────────────────────────────────────────────────────
  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingDept ? "PATCH" : "POST"
    const body = editingDept ? { id: editingDept.id, ...deptForm } : deptForm
    const r = await fetch("/api/settings/departments", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setDeptOpen(false); setEditingDept(null); setDeptForm({ ...BLANK_DEPT }); loadSettings()
  }
  const deleteDept = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/departments?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  const saveLeave = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingLeave ? "PATCH" : "POST"
    const body = editingLeave ? { id: editingLeave.id, ...leaveForm } : leaveForm
    const r = await fetch("/api/settings/leave-types", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setLeaveOpen(false); setEditingLeave(null); setLeaveForm({ ...BLANK_LEAVE }); loadSettings()
  }
  const deleteLeave = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/leave-types?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  const saveHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsError("")
    const method = editingHoliday ? "PATCH" : "POST"
    const body = editingHoliday ? { id: editingHoliday.id, ...holidayForm } : holidayForm
    const r = await fetch("/api/settings/holidays", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed"); return }
    setHolidayOpen(false); setEditingHoliday(null); setHolidayForm({ ...BLANK_HOLIDAY }); loadSettings()
  }
  const deleteHoliday = async (id: string) => {
    setSettingsError("")
    const r = await fetch(`/api/settings/holidays?id=${id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json(); setSettingsError(d.error ?? "Failed to delete"); return }
    loadSettings()
  }

  // ─── User management actions ───────────────────────────────────────────────
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setUserError("")
    const r = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setUserError(d.error ?? "Failed to create user"); return }
    setAddUserOpen(false)
    setUserForm({ ...BLANK_USER_FORM })
    loadUsers()
  }

  const updateRole = async () => {
    if (!editUser) return
    setSaving(true)
    await fetch(`/api/settings/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole }),
    })
    setSaving(false); setEditUser(null); loadUsers()
  }

  const toggleActive = async (u: UserRecord) => {
    await fetch(`/api/settings/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    loadUsers()
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPwUser || !newPassword) return
    setSaving(true)
    await fetch(`/api/settings/users/${resetPwUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    })
    setSaving(false); setResetPwUser(null); setNewPassword("")
  }

  const filteredUsers = sysUsers.filter(u => {
    const q = userSearch.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.employee?.employeeId.toLowerCase().includes(q) || u.employee?.department?.name.toLowerCase().includes(q)
  })

  // ─── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: "departments" as Tab, label: "Departments", icon: Building2 },
    { key: "leave-types" as Tab, label: "Leave Types", icon: CalendarDays },
    { key: "holidays" as Tab, label: "Public Holidays", icon: CalendarDays },
    ...(isSuperAdmin ? [{ key: "users" as Tab, label: "User Management", icon: ShieldCheck }] : []),
  ]

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Settings</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Configure your HRMS</p>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar nav */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <Card style={{ padding: 8 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === key ? "var(--primary-50, #EBF3FF)" : "transparent", color: tab === key ? "var(--primary)" : "var(--muted-foreground)", fontWeight: tab === key ? 700 : 400, fontSize: 13, textAlign: "left" }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </Card>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>

          {/* ── Departments ── */}
          {tab === "departments" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Departments ({departments.length})</h3>
                <Button size="sm" onClick={() => { setEditingDept(null); setDeptForm({ ...BLANK_DEPT }); setSettingsError(""); setDeptOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "departments" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {departments.map(d => (
                  <div key={d.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division?.name ?? "No Division"} · {d._count?.employees ?? 0} employees</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description ?? "", divisionId: d.divisionId ?? "" }); setSettingsError(""); setDeptOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteDept(d.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No departments yet.</div>}
              </div>
            </Card>
          )}

          {/* ── Leave Types ── */}
          {tab === "leave-types" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Leave Types ({leaveTypes.length})</h3>
                <Button size="sm" onClick={() => { setEditingLeave(null); setLeaveForm({ ...BLANK_LEAVE }); setSettingsError(""); setLeaveOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "leave-types" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {leaveTypes.map(l => (
                  <div key={l.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{l.defaultDays} days · {l.genderSpecific ? `${l.genderSpecific} only` : "All genders"} · {l.waitingDays > 0 ? `${l.waitingDays} day notice` : "No notice"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, background: l.isActive ? "var(--success-bg)" : "var(--muted)", color: l.isActive ? "var(--success)" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{l.isActive ? "Active" : "Inactive"}</span>
                      <button onClick={() => { setEditingLeave(l); setLeaveForm({ name: l.name, description: l.description ?? "", defaultDays: String(l.defaultDays), waitingDays: String(l.waitingDays), genderSpecific: l.genderSpecific ?? "", requiresDoc: l.requiresDoc, minDocDays: String(l.minDocDays), isActive: l.isActive }); setSettingsError(""); setLeaveOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteLeave(l.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {leaveTypes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leave types configured.</div>}
              </div>
            </Card>
          )}

          {/* ── Holidays ── */}
          {tab === "holidays" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Public Holidays {new Date().getFullYear()}</h3>
                <Button size="sm" onClick={() => { setEditingHoliday(null); setHolidayForm({ ...BLANK_HOLIDAY }); setSettingsError(""); setHolidayOpen(true) }}><Plus size={14} /> Add</Button>
              </div>
              {settingsError && tab === "holidays" && <div style={{ margin: "12px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
              <div>
                {holidays.map(h => (
                  <div key={h.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{new Date(h.date).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <button onClick={() => { setEditingHoliday(h); setHolidayForm({ name: h.name, date: new Date(h.date).toISOString().slice(0, 10) }); setSettingsError(""); setHolidayOpen(true) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => { setSettingsError(""); deleteHoliday(h.id) }} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
                {holidays.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No holidays configured for this year.</div>}
              </div>
            </Card>
          )}

          {/* ── User Management (Super Admin only) ── */}
          {tab === "users" && isSuperAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Users", value: sysUsers.length, color: "var(--primary)" },
                  { label: "Active", value: sysUsers.filter(u => u.isActive).length, color: "var(--success)" },
                  { label: "Inactive", value: sysUsers.filter(u => !u.isActive).length, color: "var(--danger)" },
                ].map(s => (
                  <Card key={s.label} style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>System Users</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      placeholder="Search by name, email, ID, dept..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      style={{ ...inp, width: 240 }}
                    />
                    <Button size="sm" onClick={() => { setUserForm({ ...BLANK_USER_FORM }); setUserError(""); setAddUserOpen(true) }}>
                      <Plus size={14} /> Add User
                    </Button>
                  </div>
                </div>

                {usersLoading ? (
                  <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["User", "Employee ID", "Department", "Role", "Status", "Actions"].map(h => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar name={u.name ?? u.email ?? "?"} size={34} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name ?? "—"}</div>
                                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "14px 20px", fontSize: 13 }}>
                              <div>{u.employee?.employeeId ?? "—"}</div>
                              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.employee?.jobTitle ?? ""}</div>
                            </td>
                            <td style={{ padding: "14px 20px", fontSize: 13 }}>{u.employee?.department?.name ?? "—"}</td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{ fontSize: 12, background: "var(--primary-50, #EBF3FF)", color: "var(--primary)", borderRadius: 999, padding: "3px 10px", fontWeight: 700 }}>
                                {roleLabel(u.role)}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{ fontSize: 12, background: u.isActive ? "var(--success-bg)" : "var(--danger-bg)", color: u.isActive ? "var(--success)" : "var(--danger)", borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {/* Edit role */}
                                <button
                                  title="Change role"
                                  onClick={() => { setEditUser(u); setEditRole(u.role) }}
                                  style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}
                                >
                                  <Pencil size={12} /> Role
                                </button>
                                {/* Reset password */}
                                <button
                                  title="Reset password"
                                  onClick={() => { setResetPwUser(u); setNewPassword("") }}
                                  style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}
                                >
                                  <KeyRound size={12} /> Password
                                </button>
                                {/* Toggle active */}
                                {u.id !== currentUser?.id && (
                                  <button
                                    title={u.isActive ? "Deactivate" : "Reactivate"}
                                    onClick={() => toggleActive(u)}
                                    style={{ background: u.isActive ? "var(--danger-bg)" : "var(--success-bg)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: u.isActive ? "var(--danger)" : "var(--success)", fontWeight: 600 }}
                                  >
                                    {u.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                            {userSearch ? "No users match your search." : "No users found."}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── Department Modal (Add / Edit) ── */}
      <Modal open={deptOpen} onClose={() => { setDeptOpen(false); setEditingDept(null) }} title={editingDept ? "Edit Department" : "Add Department"} width={440}>
        <form onSubmit={saveDept}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={deptForm.name} onChange={e => setDeptForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={labelStyle}>Description</label><input value={deptForm.description} onChange={e => setDeptForm(f => ({...f, description: e.target.value}))} style={inp} /></div>
            {divisions.length > 0 && (
              <div>
                <label style={labelStyle}>Division</label>
                <select value={deptForm.divisionId} onChange={e => setDeptForm(f => ({...f, divisionId: e.target.value}))} style={inp}>
                  <option value="">No division</option>
                  {divisions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setDeptOpen(false); setEditingDept(null) }}>Cancel</Button>
            <Button type="submit">{editingDept ? "Save Changes" : "Add Department"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Leave Type Modal (Add / Edit) ── */}
      <Modal open={leaveOpen} onClose={() => { setLeaveOpen(false); setEditingLeave(null) }} title={editingLeave ? "Edit Leave Type" : "Add Leave Type"} width={480}>
        <form onSubmit={saveLeave}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={leaveForm.name} onChange={e => setLeaveForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Default Days</label><input type="number" value={leaveForm.defaultDays} onChange={e => setLeaveForm(f => ({...f, defaultDays: e.target.value}))} style={inp} /></div>
              <div><label style={labelStyle}>Notice Period (days)</label><input type="number" value={leaveForm.waitingDays} onChange={e => setLeaveForm(f => ({...f, waitingDays: e.target.value}))} style={inp} /></div>
            </div>
            <div><label style={labelStyle}>Gender Restriction</label><select value={leaveForm.genderSpecific} onChange={e => setLeaveForm(f => ({...f, genderSpecific: e.target.value}))} style={inp}><option value="">All genders</option><option value="MALE">Male only</option><option value="FEMALE">Female only</option></select></div>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={leaveForm.requiresDoc} onChange={e => setLeaveForm(f => ({...f, requiresDoc: e.target.checked}))} /> Requires supporting document</label>
              {editingLeave && <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={leaveForm.isActive} onChange={e => setLeaveForm(f => ({...f, isActive: e.target.checked}))} /> Active</label>}
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setLeaveOpen(false); setEditingLeave(null) }}>Cancel</Button>
            <Button type="submit">{editingLeave ? "Save Changes" : "Add Leave Type"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Holiday Modal (Add / Edit) ── */}
      <Modal open={holidayOpen} onClose={() => { setHolidayOpen(false); setEditingHoliday(null) }} title={editingHoliday ? "Edit Holiday" : "Add Public Holiday"} width={400}>
        <form onSubmit={saveHoliday}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {settingsError && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{settingsError}</div>}
            <div><label style={labelStyle}>Holiday Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={holidayForm.name} onChange={e => setHolidayForm(f => ({...f, name: e.target.value}))} style={inp} /></div>
            <div><label style={labelStyle}>Date <span style={{ color: "var(--accent)" }}>*</span></label><input type="date" required value={holidayForm.date} onChange={e => setHolidayForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => { setHolidayOpen(false); setEditingHoliday(null) }}>Cancel</Button>
            <Button type="submit">{editingHoliday ? "Save Changes" : "Add Holiday"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add User Modal ── */}
      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add System User" width={560}>
        <form onSubmit={createUser}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {userError && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{userError}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>First Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={userForm.firstName} onChange={e => setUserForm(f => ({...f, firstName: e.target.value}))} style={inp} /></div>
              <div><label style={labelStyle}>Last Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={userForm.lastName} onChange={e => setUserForm(f => ({...f, lastName: e.target.value}))} style={inp} /></div>
            </div>

            <div><label style={labelStyle}>Work Email <span style={{ color: "var(--accent)" }}>*</span></label><input type="email" required value={userForm.email} onChange={e => setUserForm(f => ({...f, email: e.target.value}))} style={inp} /></div>

            <div><label style={labelStyle}>Temporary Password <span style={{ color: "var(--accent)" }}>*</span></label><input type="password" required minLength={8} value={userForm.password} onChange={e => setUserForm(f => ({...f, password: e.target.value}))} style={inp} placeholder="Min 8 characters" /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>System Role <span style={{ color: "var(--accent)" }}>*</span></label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({...f, role: e.target.value as SystemRole}))} style={inp}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Employment Type</label>
                <select value={userForm.employmentType} onChange={e => setUserForm(f => ({...f, employmentType: e.target.value}))} style={inp}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                  <option value="NYSC">NYSC</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Job Title</label>
                <input value={userForm.jobTitle} onChange={e => setUserForm(f => ({...f, jobTitle: e.target.value}))} style={inp} placeholder="e.g. Software Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Employee ID</label>
                <input value={userForm.employeeId} onChange={e => setUserForm(f => ({...f, employeeId: e.target.value}))} style={inp} placeholder="Auto-generated if blank" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Department</label>
              <select value={userForm.departmentId} onChange={e => setUserForm(f => ({...f, departmentId: e.target.value}))} style={inp}>
                <option value="">No department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change User Role" width={400}>
        {editUser && (
          <div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--muted)", borderRadius: 10 }}>
                <Avatar name={editUser.name ?? editUser.email ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{editUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{editUser.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{editUser.employee?.employeeId}</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>New Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as SystemRole)} style={inp}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
              {editUser.id === currentUser?.id && (
                <div style={{ background: "var(--warning-bg, #FFF8E1)", color: "var(--warning, #F59E0B)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  You are changing your own role. You will be signed out after saving.
                </div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={updateRole} disabled={saving}>{saving ? "Saving..." : "Save Role"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal open={!!resetPwUser} onClose={() => setResetPwUser(null)} title="Reset Password" width={400}>
        {resetPwUser && (
          <form onSubmit={resetPassword}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--muted)", borderRadius: 10 }}>
                <Avatar name={resetPwUser.name ?? resetPwUser.email ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{resetPwUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{resetPwUser.email}</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>New Password <span style={{ color: "var(--accent)" }}>*</span></label>
                <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp} placeholder="Min 8 characters" />
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setResetPwUser(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={saving}>{saving ? "Resetting..." : "Reset Password"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
