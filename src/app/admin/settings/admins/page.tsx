"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import Modal from "@/components/ui/Modal"
import { Plus, Pencil, KeyRound, UserX, UserCheck, Loader2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { roleLabel, ALL_ROLES, type SystemRole } from "@/lib/rbac"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

interface UserRecord {
  id: string
  name: string | null
  email: string | null
  role: SystemRole
  additionalRoles: SystemRole[]
  isActive: boolean
  createdAt: string
  employee: {
    id: string; firstName: string; lastName: string; employeeId: string
    jobTitle: string | null; employeeStatus: string
    department: { id: string; name: string } | null
  } | null
}

const BLANK_FORM = {
  firstName: "", lastName: "", email: "", password: "", role: "STAFF" as SystemRole,
  jobTitle: "", departmentId: "", employmentType: "FULL_TIME", employeeId: "",
}


export default function AdminsSettingsPage() {
  const { user: currentUser } = useCurrentUser()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRecord | null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [editRole, setEditRole] = useState<SystemRole>("STAFF")
  const [editAdditional, setEditAdditional] = useState<SystemRole[]>([])
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/settings/users")
    const d = await r.json()
    setUsers(d.users ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.employee?.employeeId.toLowerCase().includes(q) || u.employee?.department?.name.toLowerCase().includes(q)
  })

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("")
    const r = await fetch("/api/settings/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json(); setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to create user"); return }
    setAddOpen(false); setForm({ ...BLANK_FORM }); load()
  }

  const updateRole = async () => {
    if (!editUser) return; setSaving(true)
    const additional = editAdditional.filter(r => r !== editRole)
    await fetch(`/api/settings/users/${editUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: editRole, additionalRoles: additional }) })
    setSaving(false); setEditUser(null); load()
  }

  const toggleActive = async (u: UserRecord) => {
    await fetch(`/api/settings/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) })
    load()
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (!resetPwUser || !newPassword) return; setSaving(true)
    await fetch(`/api/settings/users/${resetPwUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) })
    setSaving(false); setResetPwUser(null); setNewPassword("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
        {/* Stats */}
        <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,160px),1fr))", gap: 12, borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "Total Users", value: users.length, color: "var(--foreground)" },
            { label: "Active", value: users.filter(u => u.isActive).length, color: "var(--success)" },
            { label: "Inactive", value: users.filter(u => !u.isActive).length, color: "var(--danger)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
          <input placeholder="Search by name, email, ID, dept…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
          <Button size="sm" onClick={() => { setForm({ ...BLANK_FORM }); setError(""); setAddOpen(true) }}><Plus size={14} /> Add User</Button>
        </div>

        {loading ? (
          <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /><span style={{ fontSize: 13 }}>Loading…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
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
                {filtered.map(u => (
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontSize: 12, background: "var(--muted)", color: "var(--foreground)", borderRadius: 999, padding: "3px 10px", fontWeight: 700 }}>{roleLabel(u.role)}</span>
                        {(u.additionalRoles ?? []).map((r: SystemRole) => (
                          <span key={r} style={{ fontSize: 11, background: "var(--muted)", color: "var(--muted-foreground)", borderRadius: 999, padding: "3px 8px", fontWeight: 600 }}>{roleLabel(r)}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 12, background: u.isActive ? "var(--success-bg)" : "var(--danger-bg)", color: u.isActive ? "var(--success)" : "var(--danger)", borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setEditUser(u); setEditRole(u.role); setEditAdditional(u.additionalRoles ?? []) }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}><Pencil size={12} /> Role</button>
                        <button onClick={() => { setResetPwUser(u); setNewPassword("") }} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}><KeyRound size={12} /> Password</button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => toggleActive(u)} style={{ background: u.isActive ? "var(--danger-bg)" : "var(--success-bg)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: u.isActive ? "var(--danger)" : "var(--success)" }}>
                            {u.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>{search ? "No users match your search." : "No users found."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add User" width={520}>
        <form onSubmit={createUser}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>First Name *</label><input required value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Last Name *</label><input required value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} style={inp} /></div>
            </div>
            <div><label style={lbl}>Work Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Password *</label><input required type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as SystemRole}))} style={inp}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Job Title</label><input value={form.jobTitle} onChange={e => setForm(f => ({...f, jobTitle: e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Employee ID</label><input value={form.employeeId} onChange={e => setForm(f => ({...f, employeeId: e.target.value}))} style={inp} /></div>
            </div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change Role" width={420}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Primary Role</label>
            <select value={editRole} onChange={e => setEditRole(e.target.value as SystemRole)} style={inp}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
          <Button disabled={saving} onClick={updateRole}>{saving ? "Saving…" : "Save Role"}</Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetPwUser} onClose={() => setResetPwUser(null)} title="Reset Password" width={380}>
        <form onSubmit={resetPassword}>
          <div style={{ padding: 24 }}>
            <label style={lbl}>New Password *</label>
            <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp} />
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setResetPwUser(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Reset Password"}</Button>
          </div>
        </form>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
