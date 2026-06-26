"use client"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, FolderKanban, Users, Calendar, Edit2, Trash2, UserPlus, UserMinus, Loader2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import Avatar from "@/components/ui/Avatar"
import Badge from "@/components/ui/Badge"

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_HOLD:   { bg: "#FEF3C7", color: "#D97706", label: "On Hold" },
  COMPLETED: { bg: "#DBEAFE", color: "#2563eb", label: "Completed" },
  CANCELLED: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

export default function PLProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", description: "", status: "ACTIVE", startDate: "", endDate: "" })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // Add member modal state
  const [showAdd, setShowAdd] = useState(false)
  const [addEmployeeId, setAddEmployeeId] = useState("")
  const [addRole, setAddRole] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  // Remove member state
  const [removeTarget, setRemoveTarget] = useState<any>(null)
  const [removing, setRemoving] = useState(false)

  // Delete project state
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/project-lead/projects/${id}`)
    if (r.ok) {
      const d = await r.json()
      setProject(d.project)
      setEditForm({
        name: d.project.name,
        description: d.project.description ?? "",
        status: d.project.status,
        startDate: d.project.startDate ? d.project.startDate.split("T")[0] : "",
        endDate: d.project.endDate ? d.project.endDate.split("T")[0] : "",
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Load PL's team for the add member picker (employees in their depts, not already on project)
  useEffect(() => {
    fetch("/api/project-lead/team")
      .then(r => r.json())
      .then(d => setTeamMembers(d.employees ?? []))
  }, [])

  const eligibleToAdd = teamMembers.filter(
    e => !project?.members?.some((m: any) => m.employeeId === e.id)
  )

  const saveEdit = async () => {
    setEditError("")
    if (!editForm.name.trim()) { setEditError("Name is required"); return }
    setSaving(true)
    const r = await fetch(`/api/project-lead/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setEditError(d.error ?? "Failed"); return }
    setShowEdit(false)
    load()
  }

  const addMember = async () => {
    setAddError("")
    if (!addEmployeeId) { setAddError("Select a team member"); return }
    setAdding(true)
    const r = await fetch(`/api/project-lead/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: addEmployeeId, projectRole: addRole }),
    })
    const d = await r.json()
    setAdding(false)
    if (!r.ok) { setAddError(d.error ?? "Failed"); return }
    setShowAdd(false); setAddEmployeeId(""); setAddRole("")
    load()
  }

  const removeMember = async () => {
    if (!removeTarget) return
    setRemoving(true)
    await fetch(`/api/project-lead/projects/${id}/members/${removeTarget.id}`, { method: "DELETE" })
    setRemoving(false)
    setRemoveTarget(null)
    load()
  }

  const deleteProject = async () => {
    setDeleting(true)
    await fetch(`/api/project-lead/projects/${id}`, { method: "DELETE" })
    setDeleting(false)
    router.push("/project-lead/projects")
  }

  if (loading) {
    return (
      <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
        <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
        Project not found.{" "}
        <button onClick={() => router.push("/project-lead/projects")} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>Back to Projects</button>
      </div>
    )
  }

  const s = STATUS_COLORS[project.status] ?? STATUS_COLORS.ACTIVE

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/project-lead/projects")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Projects
        </button>
        <span style={{ color: "var(--muted-foreground)" }}>›</span>
        <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>{project.name}</span>
      </div>

      {/* Project card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: 3, background: "var(--primary)" }} />
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FolderKanban size={22} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{project.name}</h1>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{project.department.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
              <button onClick={() => setShowEdit(true)} style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
                <Edit2 size={13} />
              </button>
              <button onClick={() => setShowDelete(true)} style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {project.description && (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 14px", lineHeight: 1.6 }}>{project.description}</p>
          )}

          {(project.startDate || project.endDate) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
              <Calendar size={13} />
              <span>
                {project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                {" → "}
                {project.endDate ? new Date(project.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Ongoing"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} style={{ color: "var(--primary)" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Members</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>({project.members.length})</span>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus size={13} /> Add Member
          </Button>
        </div>

        {project.members.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            No members yet. Add team members from your department.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Member", "Job Title", "Project Role", "Status", "Added", ""].map(h => (
                    <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.members.map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={`${m.employee.firstName} ${m.employee.lastName}`} photo={m.employee.profilePhoto} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.employee.firstName} {m.employee.lastName}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{m.employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>{m.employee.jobTitle ?? "-"}</td>
                    <td style={{ padding: "12px 20px", fontSize: 13 }}>{m.projectRole ?? <span style={{ color: "var(--muted-foreground)" }}>-</span>}</td>
                    <td style={{ padding: "12px 20px" }}><Badge status={m.employee.employeeStatus ?? "ACTIVE"} /></td>
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--muted-foreground)" }}>
                      {new Date(m.assignedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <button onClick={() => setRemoveTarget(m)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center" }}>
                        <UserMinus size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditError("") }} title="Edit Project" width={480}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Name *</label>
            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Status</label>
            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date</label>
              <input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>End Date</label>
              <input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
            </div>
          </div>
          {editError && <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{editError}</p>}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => { setShowEdit(false); setEditError("") }}>Cancel</Button>
          <Button loading={saving} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddError(""); setAddEmployeeId(""); setAddRole("") }} title="Add Member" width={440}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Team Member *</label>
            <select value={addEmployeeId} onChange={e => setAddEmployeeId(e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              <option value="">Select from your team…</option>
              {eligibleToAdd.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} - {e.jobTitle ?? e.department?.name ?? ""}</option>
              ))}
            </select>
            {eligibleToAdd.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>All team members are already on this project.</p>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Project Role <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
            <input value={addRole} onChange={e => setAddRole(e.target.value)} style={inp} placeholder="e.g. Frontend Lead, Analyst" />
          </div>
          {addError && <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{addError}</p>}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => { setShowAdd(false); setAddError(""); setAddEmployeeId(""); setAddRole("") }}>Cancel</Button>
          <Button loading={adding} disabled={!addEmployeeId} onClick={addMember}>Add to Project</Button>
        </div>
      </Modal>

      {/* Remove Member Confirm */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Member" width={420}>
        <div style={{ padding: "20px 24px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
          Remove <strong style={{ color: "var(--foreground)" }}>{removeTarget?.employee?.firstName} {removeTarget?.employee?.lastName}</strong> from <strong style={{ color: "var(--foreground)" }}>{project.name}</strong>? They will be notified.
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <button onClick={removeMember} disabled={removing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#DC2626", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: removing ? "not-allowed" : "pointer", opacity: removing ? 0.6 : 1 }}>
            {removing && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            Remove
          </button>
        </div>
      </Modal>

      {/* Delete Project Confirm */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" width={420}>
        <div style={{ padding: "20px 24px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
          Delete <strong style={{ color: "var(--foreground)" }}>{project.name}</strong>? This will remove all member assignments and cannot be undone.
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
          <button onClick={deleteProject} disabled={deleting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#DC2626", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
            {deleting && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
            Delete Project
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
