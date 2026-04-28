"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import {
  Building2, Users, Plus, Search, X, Loader2,
  UserPlus, UserMinus, ChevronRight, Edit2, Trash2,
  AlertCircle, CheckCircle,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box",
}

const DEPT_COLORS = ["#6366F1","#10B981","#F59E0B","#EC4899","#0EA5E9","#8B5CF6","#F97316","#14B8A6","#EF4444","#84CC16"]

// ── Department Members Modal ──────────────────────────────────────────────────
function DeptMembersModal({ dept, isAdmin, onClose }: { dept: any; isAdmin: boolean; onClose: () => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addQuery, setAddQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/settings/departments/members?deptId=${dept.id}`)
    if (r.ok) { const d = await r.json(); setMembers(d.members ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [dept.id])

  useEffect(() => {
    if (!isAdmin) return
    fetch("/api/employees")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setAllEmployees(d.employees ?? []))
      .catch(() => {})
  }, [isAdmin])

  const addEmployee = async (employeeId: string) => {
    setSaving(employeeId); setError("")
    const r = await fetch("/api/settings/departments/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deptId: dept.id, employeeId }),
    })
    setSaving(null)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    setAddOpen(false); setAddQuery(""); load()
  }

  const removeEmployee = async (employeeId: string) => {
    if (!confirm("Remove this employee from the department?")) return
    setSaving(employeeId); setError("")
    await fetch(`/api/settings/departments/members?employeeId=${employeeId}`, { method: "DELETE" })
    setSaving(null); load()
  }

  const memberIds = new Set(members.map((m: any) => m.id))
  const eligible = allEmployees.filter(e =>
    !memberIds.has(e.id) &&
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(addQuery.toLowerCase())
  )

  return (
    <Modal open onClose={onClose} title={`${dept.name} — Members`} width={600}>
      <div style={{ padding: "16px 24px", maxHeight: "65vh", overflowY: "auto" }}>
        {error && (
          <div style={{ display: "flex", gap: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {/* Add employee section (admin only) */}
        {isAdmin && (
          <div style={{ marginBottom: 16 }}>
            {!addOpen ? (
              <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px dashed var(--primary)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", width: "100%" }}>
                <UserPlus size={14} /> Add Employee to Department
              </button>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--muted)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Search & add employee</div>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input
                    autoFocus
                    value={addQuery}
                    onChange={e => setAddQuery(e.target.value)}
                    placeholder="Type employee name…"
                    style={{ ...fi, paddingLeft: 32 }}
                  />
                </div>
                {addQuery.length > 0 && (
                  <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)" }}>
                    {eligible.length === 0 ? (
                      <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>No eligible employees found</div>
                    ) : eligible.slice(0, 8).map((e: any) => (
                      <button key={e.id} onClick={() => addEmployee(e.id)} disabled={saving === e.id}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                        onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={30} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                          {e.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle}</div>}
                        </div>
                        {saving === e.id ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <UserPlus size={14} style={{ color: "var(--primary)" }} />}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setAddOpen(false); setAddQuery("") }} style={{ marginTop: 8, fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Member list */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          {members.length} Member{members.length !== 1 ? "s" : ""}
        </div>
        {loading ? (
          <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
            <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No members in this department yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {members.map((m: any) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}>
                <Avatar name={`${m.firstName} ${m.lastName}`} photo={m.profilePhoto} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.firstName} {m.lastName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{m.jobTitle ?? "—"}</div>
                </div>
                <Badge status={m.employeeStatus ?? "ACTIVE"} />
                {isAdmin && (
                  <button onClick={() => removeEmployee(m.id)} disabled={saving === m.id} title="Remove from department"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center" }}>
                    {saving === m.id ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : <UserMinus size={13} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}

// ── Department Form Modal ─────────────────────────────────────────────────────
function DeptFormModal({ dept, onClose, onSuccess }: { dept?: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: dept?.name ?? "", description: dept?.description ?? "", leadId: dept?.lead?.id ?? "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [employees, setEmployees] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE")
      .then(r => r.json())
      .then(d => setEmployees(d.employees ?? []))
  }, [])

  const filteredEmps = employees.filter(e => {
    if (!empSearch) return true
    const q = empSearch.toLowerCase()
    return `${e.firstName} ${e.lastName} ${e.employeeId}`.toLowerCase().includes(q)
  })

  const selectedLead = employees.find(e => e.id === form.leadId)

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return }
    setLoading(true); setError("")
    const method = dept ? "PATCH" : "POST"
    const body = dept ? { ...form, id: dept.id } : form
    const r = await fetch("/api/settings/departments", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    onSuccess(); onClose()
  }

  return (
    <Modal open onClose={onClose} title={dept ? "Edit Department" : "New Department"} width={480}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Name <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fi} placeholder="e.g. Engineering" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...fi, resize: "vertical" }} placeholder="Optional description" />
        </div>

        {/* Department Lead selector */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Department Lead</label>
          {selectedLead ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--primary-50, rgba(11,92,46,0.07))", borderRadius: 8, border: "1.5px solid var(--primary)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>
                {selectedLead.firstName[0]}{selectedLead.lastName[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{selectedLead.firstName} {selectedLead.lastName}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{selectedLead.jobTitle ?? ""}</div>
              </div>
              <button onClick={() => { setForm(f => ({ ...f, leadId: "" })); setEmpSearch("") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Search employee to assign as lead…"
                style={{ ...fi, paddingLeft: 30 }}
              />
              {empSearch && filteredEmps.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                  {filteredEmps.slice(0, 8).map(e => (
                    <button key={e.id} onClick={() => { setForm(f => ({ ...f, leadId: e.id })); setEmpSearch("") }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white", flexShrink: 0 }}>
                        {e.firstName[0]}{e.lastName[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.employeeId} · {e.jobTitle ?? ""}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {empSearch && filteredEmps.length === 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--muted-foreground)", zIndex: 50 }}>
                  No employees found
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>Optional. The lead will appear on the department card.</div>
        </div>

        {error && <div style={{ color: "#EF4444", fontSize: 13, display: "flex", gap: 6 }}><AlertCircle size={14} />{error}</div>}
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={loading}>{loading ? "Saving…" : dept ? "Save Changes" : "Create Department"}</Button>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const { user } = useCurrentUser()
  const isAdmin = ["ADMIN","ADMIN","ADMIN"].includes(user?.role ?? "")

  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [viewDept, setViewDept] = useState<any>(null)
  const [editDept, setEditDept] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/settings/departments")
    if (r.ok) { const d = await r.json(); setDepartments(d.departments ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteDept = async (id: string, name: string) => {
    if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return
    setDeleting(id); setDeleteError("")
    const r = await fetch(`/api/settings/departments?id=${id}`, { method: "DELETE" })
    setDeleting(null)
    if (!r.ok) { const d = await r.json(); setDeleteError(d.error ?? "Failed to delete"); return }
    load()
  }

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.description ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>Departments</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 4, fontSize: 13 }}>{departments.length} department{departments.length !== 1 ? "s" : ""} across the organisation</p>
        </div>
        {isAdmin && <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Department</Button>}
      </div>

      {deleteError && (
        <div style={{ display: "flex", gap: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", padding: "12px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          <AlertCircle size={14} />{deleteError}
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search departments…"
          style={{ ...fi, paddingLeft: 32, paddingRight: 12 }} />
      </div>

      {loading ? (
        <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
          <Loader2 size={28} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Building2 size={40} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{departments.length === 0 ? "No departments yet" : "No departments match your search"}</div>
            {isAdmin && departments.length === 0 && <Button onClick={() => setShowCreate(true)} style={{ marginTop: 8 }}><Plus size={14} /> Create first department</Button>}
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((dept: any, i: number) => {
            const color = DEPT_COLORS[i % DEPT_COLORS.length]
            const count = dept._count?.employees ?? 0
            return (
              <div key={dept.id} style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Color bar */}
                <div style={{ height: 4, background: color }} />
                <div style={{ padding: "16px 18px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={20} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dept.name}</div>
                      {dept.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>{dept.description}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Users size={13} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>employee{count !== 1 ? "s" : ""}</span>
                    </div>
                    {dept.lead && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color, flexShrink: 0 }}>
                          {dept.lead.firstName?.[0]}{dept.lead.lastName?.[0]}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          Lead: <strong style={{ color: "var(--foreground)" }}>{dept.lead.firstName} {dept.lead.lastName}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
                  <button onClick={() => setViewDept(dept)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    fontSize: 12, fontWeight: 700, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    background: "var(--primary)", color: "white", border: "none",
                  }}><Users size={12} /> View Members</button>
                  {isAdmin && <>
                    <button onClick={() => setEditDept(dept)} style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteDept(dept.id, dept.name)} disabled={deleting === dept.id} style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", display: "flex", alignItems: "center" }}>
                      {deleting === dept.id ? <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> : <Trash2 size={13} />}
                    </button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewDept && <DeptMembersModal dept={viewDept} isAdmin={isAdmin} onClose={() => setViewDept(null)} />}
      {editDept && <DeptFormModal dept={editDept} onClose={() => setEditDept(null)} onSuccess={load} />}
      {showCreate && <DeptFormModal onClose={() => setShowCreate(false)} onSuccess={load} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
