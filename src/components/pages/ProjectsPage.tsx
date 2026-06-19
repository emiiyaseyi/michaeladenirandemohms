"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDropdownPosition } from "@/hooks/useDropdownPosition"
import PageHeader from "@/components/ui/PageHeader"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import {
  Briefcase, Plus, Search, Users, Calendar, Pencil, Trash2,
  Archive, CheckCircle, Loader2, AlertCircle, X, PlayCircle,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--success)", COMPLETED: "#6366F1", ON_HOLD: "var(--warning)", CANCELLED: "var(--accent)",
}
const STATUS_BG: Record<string, string> = {
  ACTIVE: "var(--success-bg)", COMPLETED: "#EEF2FF", ON_HOLD: "var(--warning-bg)", CANCELLED: "var(--danger-bg)",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: STATUS_BG[status] ?? "var(--muted)", color: STATUS_COLOR[status] ?? "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {status.replace("_", " ")}
    </span>
  )
}

function MemberSearch({ employees, selected, onChange, exclude }: { employees: any[]; selected: string[]; onChange: (ids: string[]) => void; exclude?: string }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  const { ref: anchorRef, pos: dropPos, recompute: recomputeDropPos } = useDropdownPosition<HTMLDivElement>()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [])
  const openDropdown = () => { recomputeDropPos(); setOpen(true) }
  const filtered = employees.filter(e => e.id !== exclude && !selected.includes(e.id) && `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()))
  const selectedEmps = employees.filter(e => selected.includes(e.id))
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div ref={anchorRef} style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 8, minHeight: 38, cursor: "text", background: "var(--background)" }} onClick={openDropdown}>
        {selectedEmps.map(e => (
          <span key={e.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--primary)", color: "white", borderRadius: 20, padding: "2px 8px 2px 6px", fontSize: 12, fontWeight: 600 }}>
            {e.firstName} {e.lastName}
            <button onClick={(ev) => { ev.stopPropagation(); onChange(selected.filter(x => x !== e.id)) }} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: 0, lineHeight: 1, marginLeft: 2 }}><X size={10} /></button>
          </span>
        ))}
        <input value={q} onChange={e => { setQ(e.target.value); openDropdown() }} placeholder={selectedEmps.length ? "" : "Search members…"} style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--foreground)", flex: 1, minWidth: 120 }} />
      </div>
      {open && filtered.length > 0 && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 9999, maxHeight: 200, overflowY: "auto" }}>
          {filtered.map(e => (
            <div key={e.id} onClick={() => { onChange([...selected, e.id]); setQ(""); setOpen(false) }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer" }}
              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = ""}>
              <Avatar name={`${e.firstName} ${e.lastName}`} photo={e.profilePhoto} size={26} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle ?? "—"}</div>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function ProjectForm({ employees, initial, onSubmit, onClose, loading }: { employees: any[]; initial?: any; onSubmit: (data: any) => void; onClose: () => void; loading: boolean }) {
  const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "ACTIVE",
    startDate: initial?.startDate ? initial.startDate.split("T")[0] : "",
    endDate: initial?.endDate ? initial.endDate.split("T")[0] : "",
    noEndDate: !initial?.endDate,
    leadId: initial?.leadId ?? initial?.ownerId ?? "",
    memberIds: initial?.memberIds ?? (initial?.assignments?.filter((a: any) => a.role !== "Project Lead").map((a: any) => a.employeeId) ?? []),
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Project Name <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.name} onChange={e => set("name", e.target.value)} style={fi} placeholder="e.g. Website Redesign Q3" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Description</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} style={{ ...fi, resize: "vertical" }} placeholder="Brief project description…" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date</label>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={fi} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>End Date</label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)", cursor: "pointer", fontWeight: 500 }}>
                <input type="checkbox" checked={form.noEndDate} onChange={e => { set("noEndDate", e.target.checked); if (e.target.checked) set("endDate", "") }} style={{ accentColor: "var(--primary)" }} />
                No end date yet
              </label>
            </div>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} disabled={form.noEndDate} style={{ ...fi, opacity: form.noEndDate ? 0.45 : 1 }} />
          </div>
        </div>
        {initial && (
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={fi}>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Project Lead</label>
          <select value={form.leadId} onChange={e => set("leadId", e.target.value)} style={fi}>
            <option value="">None</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` · ${e.jobTitle}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Members</label>
          <MemberSearch employees={employees} selected={form.memberIds} onChange={ids => set("memberIds", ids)} exclude={form.leadId} />
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{form.memberIds.length} member{form.memberIds.length !== 1 ? "s" : ""} selected (excluding lead)</div>
        </div>
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit({ ...form, endDate: form.noEndDate ? null : form.endDate })} disabled={!form.name.trim() || loading}>
          {loading ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : initial ? "Save Changes" : "Create Project"}
        </Button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { user } = useCurrentUser()
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const canManage = user?.caps?.canViewAllEmployees || user?.caps?.canManageOnboarding

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    const r = await fetch(`/api/projects?${params}`)
    const d = await r.json()
    setProjects(d.projects ?? [])
    setEmployees(d.employees ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const create = async (form: any) => {
    setSaving(true)
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false); setCreateOpen(false); load()
  }

  const update = async (form: any) => {
    if (!editTarget) return
    setSaving(true)
    await fetch(`/api/projects/${editTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false); setEditTarget(null); load()
  }

  const [statusChange, setStatusChange] = useState<{ id: string; status: string; label: string } | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusErr, setStatusErr] = useState("")
  const retire = (id: string, status: string) => {
    const label = status === "ON_HOLD" ? "on hold" : status === "ACTIVE" ? "active" : "complete"
    setStatusErr("")
    setStatusChange({ id, status, label })
  }
  const doStatusChange = async () => {
    if (!statusChange) return
    setStatusBusy(true); setStatusErr("")
    const res = await fetch(`/api/projects/${statusChange.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: statusChange.status }) })
    setStatusBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setStatusErr(d.error ?? `Failed to update project status`)
      return
    }
    setStatusChange(null); load()
  }

  const del = async () => {
    if (!deleteTarget) return
    await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" })
    setDeleteTarget(null); load()
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage projects and assign team members"
        icon={<Briefcase size={22} />}
        actions={canManage ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Project</Button> : undefined}
      />

      <Card style={{ padding: "14px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", width: "100%", color: "var(--foreground)" }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "var(--card)", color: "var(--foreground)" }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</div>
      </Card>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={Briefcase} title="No projects yet" description={canManage ? "Create a project and assign team members." : "No projects assigned to you."} action={canManage ? <Button onClick={() => setCreateOpen(true)}><Plus size={14} /> New Project</Button> : undefined} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {projects.map(p => {
            const lead = p.assignments.find((a: any) => a.role === "Project Lead")
            const members = p.assignments.filter((a: any) => a.role !== "Project Lead")
            return (
              <Card key={p.id}>
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <StatusPill status={p.status} />
                    </div>
                    {canManage && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                        <button onClick={() => setEditTarget({ ...p, leadId: lead?.employeeId, memberIds: members.map((m: any) => m.employeeId) })} style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "var(--muted-foreground)" }} title="Edit"><Pencil size={12} /></button>
                        {p.status === "ACTIVE" && (
                          <button onClick={() => retire(p.id, "ON_HOLD")} style={{ background: "var(--warning-bg)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "var(--warning)" }} title="Put on hold"><Archive size={12} /></button>
                        )}
                        {p.status === "ON_HOLD" && (
                          <button onClick={() => retire(p.id, "ACTIVE")} style={{ background: "var(--success-bg)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "var(--success)" }} title="Reactivate project"><PlayCircle size={12} /></button>
                        )}
                        {p.status !== "COMPLETED" && (
                          <button onClick={() => retire(p.id, "COMPLETED")} style={{ background: "var(--success-bg)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "var(--success)" }} title="Mark complete"><CheckCircle size={12} /></button>
                        )}
                        <button onClick={() => setDeleteTarget(p)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "var(--accent)" }} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>

                  {p.description && (
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12, lineHeight: 1.5 }}>{p.description}</p>
                  )}

                  {p.startDate && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 11, color: "var(--muted-foreground)", alignItems: "center" }}>
                      <Calendar size={11} style={{ flexShrink: 0 }} />
                      <span>{formatDate(p.startDate, "MMM d, yyyy")}</span>
                      <span>→</span>
                      <span style={{ fontStyle: p.endDate ? "normal" : "italic" }}>
                        {p.endDate ? formatDate(p.endDate, "MMM d, yyyy") : "No end date"}
                      </span>
                    </div>
                  )}

                  {lead && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 10px", background: "var(--primary-50, #EFF6FF)", borderRadius: 8 }}>
                      <Avatar name={`${lead.employee.firstName} ${lead.employee.lastName}`} photo={lead.employee.profilePhoto} size={24} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)", marginBottom: 1 }}>Project Lead</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{lead.employee.firstName} {lead.employee.lastName}</div>
                      </div>
                    </div>
                  )}

                  {members.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={11} /> {members.length} Member{members.length !== 1 ? "s" : ""}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: members.length > 4 ? "auto" : "visible" }}>
                        {members.map((m: any) => (
                          <div key={m.employeeId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={`${m.employee.firstName} ${m.employee.lastName}`} photo={m.employee.profilePhoto} size={24} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.employee.firstName} {m.employee.lastName}
                            </span>
                            {m.employee.jobTitle && (
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>· {m.employee.jobTitle}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Project" width={600}>
        <ProjectForm employees={employees} onSubmit={create} onClose={() => setCreateOpen(false)} loading={saving} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Project" width={600}>
        {editTarget && (
          <ProjectForm employees={employees} initial={editTarget} onSubmit={update} onClose={() => setEditTarget(null)} loading={saving} />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Project" width={420}>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertCircle size={22} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Delete "{deleteTarget?.name}"?</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>This will remove the project and all member assignments. This cannot be undone.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={del}>Delete Project</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!statusChange}
        onClose={() => { setStatusChange(null); setStatusErr("") }}
        onConfirm={doStatusChange}
        title="Change project status?"
        body={<div>Mark this project as <strong style={{ color: "var(--foreground)" }}>{statusChange?.label}</strong>?{statusErr && <div style={{ marginTop: 10, padding: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", borderRadius: 6, fontSize: 12 }}>{statusErr}</div>}</div>}
        confirmText="Confirm"
        loading={statusBusy}
      />
    </div>
  )
}
