"use client"
import { useState, useEffect, useMemo } from "react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import {
  Building2, Users, Plus, Search, X, Loader2,
  UserPlus, UserMinus, Edit2, Trash2,
  AlertCircle, FolderKanban, Calendar, ChevronRight,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import PageHeader from "@/components/ui/PageHeader"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box",
}

const DEPT_COLORS = ["#6366F1","#10B981","#F59E0B","#EC4899","#0EA5E9","#8B5CF6","#F97316","#14B8A6","#EF4444","#84CC16"]

// ── Browsable picker (open by default, search filters) ────────────────────────
function BrowsablePicker({
  options, value, onChange, placeholder = "Select…", searchPlaceholder = "Filter…",
  renderOption, getKey = (o: any) => o.id, getSearchString = (o: any) => `${o.firstName} ${o.lastName}`,
  defaultLimit = 30,
}: {
  options: any[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  searchPlaceholder?: string
  renderOption: (o: any, selected: boolean) => React.ReactNode
  getKey?: (o: any) => string
  getSearchString?: (o: any) => string
  defaultLimit?: number
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const selected = options.find(o => getKey(o) === value)
  const filtered = useMemo(() => {
    if (!q.trim()) return options.slice(0, defaultLimit)
    const needle = q.toLowerCase()
    return options.filter(o => getSearchString(o).toLowerCase().includes(needle)).slice(0, defaultLimit)
  }, [q, options, defaultLimit, getSearchString])

  if (selected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--primary-50, rgba(11,92,46,0.07))", borderRadius: 8, border: "1.5px solid var(--primary)" }}>
        <div style={{ flex: 1 }}>{renderOption(selected, true)}</div>
        <button onClick={() => { onChange(""); setOpen(false); setQ("") }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ ...fi, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "var(--muted-foreground)" }}>
        <span>{placeholder}</span>
        <Search size={13} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 280, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
                style={{ width: "100%", paddingLeft: 30, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>
            ) : filtered.map(o => (
              <button key={getKey(o)} onClick={() => { onChange(getKey(o)); setOpen(false); setQ("") }}
                style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = "transparent"}>
                {renderOption(o, false)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Confirm Modal (reusable) ──────────────────────────────────────────────────
function ConfirmModal({
  open, onClose, onConfirm, title, body, confirmText = "Confirm", variant = "primary", loading = false, disabled = false, disabledHint,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; body: React.ReactNode
  confirmText?: string; variant?: "primary" | "danger"
  loading?: boolean; disabled?: boolean; disabledHint?: string
}) {
  if (!open) return null
  const confirmBg = variant === "danger" ? "#DC2626" : "var(--primary)"
  return (
    <Modal open onClose={loading ? () => {} : onClose} title={title} width={460}>
      <div style={{ padding: "20px 24px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
        {body}
        {disabled && disabledHint && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--warning-bg, #FEF3C7)", color: "var(--warning, #92400E)", borderRadius: 8, fontSize: 12 }}>
            {disabledHint}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <button onClick={onConfirm} disabled={loading || disabled}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: confirmBg, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading || disabled ? "not-allowed" : "pointer", opacity: loading || disabled ? 0.6 : 1 }}>
          {loading && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
          {loading ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  )
}

// ── Department Members Modal ──────────────────────────────────────────────────
function DeptMembersModal({ dept, isAdmin, onClose }: { dept: any; isAdmin: boolean; onClose: () => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [removeTarget, setRemoveTarget] = useState<any | null>(null)
  const [removing, setRemoving] = useState(false)

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

  const memberIds = useMemo(() => new Set(members.map((m: any) => m.id)), [members])

  // Eligible to add: not already a member. SUPER_ADMIN + seeded managers are already filtered out by the API (R6.4).
  const eligible = useMemo(
    () => allEmployees.filter(e => !memberIds.has(e.id)),
    [allEmployees, memberIds]
  )

  const addEmployee = async (employeeId: string) => {
    setAdding(true); setError("")
    const r = await fetch("/api/settings/departments/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deptId: dept.id, employeeIds: [employeeId] }),
    })
    setAdding(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed"); return }
    setAddOpen(false); load()
  }

  const askRemove = (m: any) => { setRemoveTarget(m); setError("") }
  const doRemove = async () => {
    if (!removeTarget) return
    setRemoving(true); setError("")
    const r = await fetch(`/api/settings/departments/members?deptId=${dept.id}&employeeId=${removeTarget.id}`, { method: "DELETE" })
    setRemoving(false)
    if (!r.ok) {
      const d = await r.json()
      setError(d.error ?? "Failed to remove")
      // Keep modal open so the user can read the error
      return
    }
    setRemoveTarget(null); load()
  }

  return (
    <Modal open onClose={onClose} title={`${dept.name} — Members`} width={600}>
      <div style={{ padding: "16px 24px", maxHeight: "65vh", overflowY: "auto" }}>
        {error && (
          <div style={{ display: "flex", gap: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {isAdmin && (
          <div style={{ marginBottom: 16 }}>
            {!addOpen ? (
              <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px dashed var(--primary)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", width: "100%" }}>
                <UserPlus size={14} /> Add Employee to Department
              </button>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--muted)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Pick an employee to add</div>
                <BrowsablePicker
                  options={eligible}
                  value=""
                  onChange={id => id && addEmployee(id)}
                  placeholder={adding ? "Adding…" : `Choose from ${eligible.length} eligible employee(s)…`}
                  searchPlaceholder="Filter by name…"
                  renderOption={(e) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  )}
                />
                <button onClick={() => setAddOpen(false)} style={{ marginTop: 8, fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

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
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{m.jobTitle ?? "—"}{m.isPrimary && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--primary)" }}>· Primary</span>}</div>
                </div>
                <Badge status={m.employeeStatus ?? "ACTIVE"} />
                {isAdmin && (
                  <button onClick={() => askRemove(m)} title="Remove from department"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center" }}>
                    <UserMinus size={13} />
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
      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={doRemove}
        title="Remove from department?"
        body={removeTarget && (
          <span>
            <strong style={{ color: "var(--foreground)" }}>{removeTarget.firstName} {removeTarget.lastName}</strong> will no longer be a member of <strong style={{ color: "var(--foreground)" }}>{dept.name}</strong>. They stay in any other departments they belong to.
          </span>
        )}
        confirmText="Remove"
        variant="danger"
        loading={removing}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}

// ── Department Form Modal ─────────────────────────────────────────────────────
function DeptFormModal({ dept, onClose, onSuccess }: { dept?: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: dept?.name ?? "",
    description: dept?.description ?? "",
    phone: dept?.phone ?? "",
    email: dept?.email ?? "",
    leadEmployeeId: dept?.lead?.id ?? dept?.leadEmployeeId ?? "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/employees?status=ACTIVE")
      .then(r => r.json())
      .then(d => setEmployees(d.employees ?? []))
  }, [])

  // Lead-eligible: PROJECT_LEAD role only (secondary admins are also eligible per spec, but
  // they're typically PLs too; the API enforces the rule server-side as the source of truth).
  const eligibleLeads = useMemo(
    () => employees.filter(e => (e.user?.role ?? "STAFF") === "PROJECT_LEAD"),
    [employees]
  )

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
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Department Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={fi} placeholder="e.g. +234 800 000 0000" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Department Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={fi} placeholder="e.g. hr@datasciencenigeria.ai" />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Department Lead <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
          <BrowsablePicker
            options={eligibleLeads}
            value={form.leadEmployeeId}
            onChange={id => setForm(f => ({ ...f, leadEmployeeId: id }))}
            placeholder={`Choose from ${eligibleLeads.length} Project Lead(s)…`}
            searchPlaceholder="Filter project leads…"
            renderOption={(e, sel) => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: sel ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: sel ? "white" : "var(--muted-foreground)", flexShrink: 0 }}>
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sel ? "var(--primary)" : "var(--foreground)" }}>{e.firstName} {e.lastName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.employeeId} · {e.jobTitle ?? "—"}</div>
                </div>
              </div>
            )}
          />
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>Optional. Only Project Leads can be selected.</div>
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

// ── Department Projects Modal (admin read-only) ───────────────────────────────
const PROJECT_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_HOLD:   { bg: "#FEF3C7", color: "#D97706", label: "On Hold" },
  COMPLETED: { bg: "#DBEAFE", color: "#2563eb", label: "Completed" },
  CANCELLED: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
}

function DeptProjectsModal({ dept, onClose }: { dept: any; onClose: () => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/departments/${dept.id}/projects`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dept.id])

  return (
    <Modal open onClose={onClose} title={`${dept.name} — Projects`} width={620}>
      <div style={{ padding: "16px 24px", maxHeight: "65vh", overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
            <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            <FolderKanban size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            No projects in this department yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map((p: any) => {
              const s = PROJECT_STATUS[p.status] ?? PROJECT_STATUS.ACTIVE
              const isOpen = expanded === p.id
              return (
                <div key={p.id} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                    <FolderKanban size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
                        Lead: {p.lead.firstName} {p.lead.lastName} · {p._count.members} member{p._count.members !== 1 ? "s" : ""}
                        {(p.startDate || p.endDate) && (
                          <span style={{ marginLeft: 8 }}>
                            · {p.startDate ? new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"} → {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Ongoing"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px", background: "var(--muted)" }}>
                      {p.description && (
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 10px", lineHeight: 1.5 }}>{p.description}</p>
                      )}
                      {p.members.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No members assigned yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {p.members.map((m: any) => (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar name={`${m.employee.firstName} ${m.employee.lastName}`} photo={m.employee.profilePhoto} size={28} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{m.employee.firstName} {m.employee.lastName}</div>
                                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                  {m.employee.jobTitle ?? "—"}{m.projectRole && <span style={{ marginLeft: 6, color: "var(--primary)", fontWeight: 600 }}>· {m.projectRole}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const { user } = useCurrentUser()
  const isAdmin = user?.isAdmin ?? false

  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [viewDept, setViewDept] = useState<any>(null)
  const [viewProjectsDept, setViewProjectsDept] = useState<any>(null)
  const [editDept, setEditDept] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/settings/departments")
    if (r.ok) { const d = await r.json(); setDepartments(d.departments ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError("")
    const r = await fetch(`/api/settings/departments?id=${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!r.ok) { const d = await r.json(); setDeleteError(d.error ?? "Failed to delete"); return }
    setDeleteTarget(null); load()
  }

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.description ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} department${departments.length !== 1 ? "s" : ""} across the organisation`}
        icon={<Building2 size={22} />}
        actions={isAdmin ? <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Department</Button> : undefined}
      />

      {deleteError && !deleteTarget && (
        <div style={{ display: "flex", gap: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", padding: "12px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          <AlertCircle size={14} />{deleteError}
        </div>
      )}

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
                  }}><Users size={12} /> Members</button>
                  <button onClick={() => setViewProjectsDept(dept)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    fontSize: 12, fontWeight: 700, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)",
                  }}><FolderKanban size={12} /> Projects</button>
                  {isAdmin && <>
                    <button onClick={() => setEditDept(dept)} style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { setDeleteTarget(dept); setDeleteError("") }} style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewDept && <DeptMembersModal dept={viewDept} isAdmin={isAdmin} onClose={() => setViewDept(null)} />}
      {viewProjectsDept && <DeptProjectsModal dept={viewProjectsDept} onClose={() => setViewProjectsDept(null)} />}
      {editDept && <DeptFormModal dept={editDept} onClose={() => setEditDept(null)} onSuccess={load} />}
      {showCreate && <DeptFormModal onClose={() => setShowCreate(false)} onSuccess={load} />}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete department?"
        body={deleteTarget && (
          <div>
            <p>
              Delete <strong style={{ color: "var(--foreground)" }}>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(239,68,68,0.08)", color: "#EF4444", borderRadius: 8, fontSize: 12 }}>
                {deleteError}
              </div>
            )}
          </div>
        )}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
