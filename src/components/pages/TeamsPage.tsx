"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Card from "@/components/ui/Card"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import {
  Users, Search, Cpu, Briefcase, Plus, Edit3, Trash2,
  Crown, UserPlus, X, ChevronDown, AlertCircle,
} from "lucide-react"
import { roleLabel } from "@/lib/rbac"

const CAT_META = {
  TECHNICAL: { label: "Technical", color: "#6366F1", bg: "#EEF2FF", icon: Cpu },
  NON_TECHNICAL: { label: "Non-Technical", color: "#F59E0B", bg: "#FFFBEB", icon: Briefcase },
}

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--muted-foreground)" }}>{label}</label>
    {children}
  </div>
)

// ── Team form modal ────────────────────────────────────────────────────────────
function TeamFormModal({
  team, departments, employees, onClose, onSave,
}: {
  team?: any; departments: any[]; employees: any[];
  onClose: () => void; onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: team?.name ?? "",
    category: team?.category ?? "NON_TECHNICAL",
    departmentId: team?.department?.id ?? "",
    headId: team?.head?.id ?? "",
    description: team?.description ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit() {
    if (!form.name.trim()) { setError("Team name is required"); return }
    setSaving(true); setError("")
    try { await onSave(form) } catch (e: any) { setError(e.message ?? "Failed to save") }
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title={team ? "Edit Team" : "Create Team"} width={520}>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <F label="Team Name *">
          <input value={form.name} onChange={set("name")} style={fi} placeholder="e.g. Frontend Engineers" />
        </F>
        <F label="Category">
          <select value={form.category} onChange={set("category")} style={fi}>
            <option value="TECHNICAL">Technical</option>
            <option value="NON_TECHNICAL">Non-Technical</option>
          </select>
        </F>
        <F label="Department">
          <select value={form.departmentId} onChange={set("departmentId")} style={fi}>
            <option value="">No department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </F>
        <F label="Team Head (Lead)">
          <select value={form.headId} onChange={set("headId")} style={fi}>
            <option value="">None</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` · ${e.jobTitle}` : ""}</option>
            ))}
          </select>
        </F>
        <F label="Description">
          <textarea value={form.description} onChange={set("description")} rows={2}
            style={{ ...fi, resize: "vertical" }} placeholder="Optional team description…" />
        </F>
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--accent)", background: "var(--danger-bg)", padding: "10px 14px", borderRadius: 8 }}>
            <AlertCircle size={14} />{error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : team ? "Save Changes" : "Create Team"}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Assign member modal ────────────────────────────────────────────────────────
function AssignMemberModal({ team, allEmployees, onClose, onAssign }: {
  team: any; allEmployees: any[]; onClose: () => void; onAssign: (empId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const memberIds = new Set(team.members.map((m: any) => m.id))

  const available = allEmployees.filter(e =>
    !memberIds.has(e.id) && e.employeeStatus === "ACTIVE" &&
    (!search || `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Modal open onClose={onClose} title={`Add Member to ${team.name}`} width={520}>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "8px 12px" }}>
          <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
            style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {available.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
              {search ? "No matches" : "All active employees are already in this team"}
            </div>
          )}
          {available.map(emp => (
            <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{emp.jobTitle ?? "—"} · {emp.department?.name ?? "—"}</div>
              </div>
              <Button
                variant="secondary"
                onClick={async () => {
                  setSaving(emp.id)
                  await onAssign(emp.id)
                  setSaving(null)
                }}
                disabled={saving === emp.id}
                style={{ fontSize: 12, padding: "4px 12px" }}
              >
                {saving === emp.id ? "Adding…" : "Add"}
              </Button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Team card ─────────────────────────────────────────────────────────────────
function TeamCard({
  team, canEdit, canDelete, allEmployees, onEdit, onDelete, onRefresh,
}: {
  team: any; canEdit: boolean; canDelete: boolean; allEmployees: any[];
  onEdit: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const cat = team.category as keyof typeof CAT_META
  const meta = CAT_META[cat] ?? CAT_META.NON_TECHNICAL

  async function removeMember(empId: string) {
    await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeMemberId: empId }),
    })
    onRefresh()
  }

  async function addMember(empId: string) {
    await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addMemberId: empId }),
    })
    onRefresh()
  }

  return (
    <>
      <Card>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: expanded ? "1px solid var(--border)" : "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={18} style={{ color: meta.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{team.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              {team.department && (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{team.department.name}</div>
              )}
              {team.head && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Crown size={11} style={{ color: "#F59E0B" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{team.head.firstName} {team.head.lastName}</span>
                  {team.head.jobTitle && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>· {team.head.jobTitle}</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{team.members.length}</span>
              {canEdit && (
                <>
                  <button onClick={() => setAssignOpen(true)} title="Add member"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                    <UserPlus size={13} />
                  </button>
                  <button onClick={onEdit} title="Edit team"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                    <Edit3 size={13} />
                  </button>
                  {canDelete && (
                    <button onClick={onDelete} title="Delete team"
                      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setExpanded(v => !v)}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
            </div>
          </div>
          {team.description && (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8, marginLeft: 52 }}>{team.description}</div>
          )}
        </div>

        {/* Members list */}
        {expanded && (
          <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
            {team.members.length === 0 && (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>No members yet</div>
            )}
            {team.members.map((m: any) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: "var(--muted)" }}>
                <Avatar name={`${m.firstName} ${m.lastName}`} photo={m.profilePhoto} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{m.firstName} {m.lastName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {m.jobTitle ?? "—"} · {roleLabel(m.user?.role ?? "STAFF")}
                  </div>
                </div>
                {m.id === team.head?.id && <Crown size={12} style={{ color: "#F59E0B", flexShrink: 0 }} />}
                {canEdit && (
                  <button onClick={() => removeMember(m.id)} title="Remove from team"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2, display: "flex", alignItems: "center" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {assignOpen && (
        <AssignMemberModal
          team={team}
          allEmployees={allEmployees}
          onClose={() => { setAssignOpen(false); onRefresh() }}
          onAssign={addMember}
        />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role ?? ""

  const [teams, setTeams] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<"" | "TECHNICAL" | "NON_TECHNICAL">("")
  const [view, setView] = useState<"roster" | "subteams">("roster")

  // Modals
  const [formTeam, setFormTeam] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTeam, setDeleteTeam] = useState<any | null>(null)

  const load = useCallback(async () => {
    const [teamsRes, empsRes] = await Promise.all([
      fetch("/api/teams").then(r => r.ok ? r.json() : { teams: [] }),
      fetch("/api/employees").then(r => r.ok ? r.json() : { employees: [], departments: [] }),
    ])
    setTeams(teamsRes.teams ?? [])
    setEmployees(empsRes.employees ?? [])
    setDepartments(empsRes.departments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const canEdit = ["ADMIN", "ADMIN", "ADMIN"].includes(userRole)
  const canDelete = userRole === "ADMIN"

  const technical    = employees.filter(e => e.category === "TECHNICAL")
  const nonTechnical = employees.filter(e => e.category !== "TECHNICAL")

  const filteredTeams = teams.filter(t => {
    const matchCat = !catFilter || t.category === catFilter
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.name?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredRoster = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""} ${e.workEmail}`.toLowerCase().includes(q)
    const matchCat = !catFilter || (catFilter === "TECHNICAL" ? e.category === "TECHNICAL" : e.category !== "TECHNICAL")
    return matchSearch && matchCat
  })

  const stats = [
    { label: "Total Staff", value: employees.length },
    { label: "Technical", value: technical.length, color: "#6366F1" },
    { label: "Non-Technical", value: nonTechnical.length, color: "#F59E0B" },
    { label: "Sub-Teams", value: teams.length },
  ]

  async function saveTeam(data: any) {
    const url = formTeam?.id ? `/api/teams/${formTeam.id}` : "/api/teams"
    const method = formTeam?.id ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed") }
    setFormOpen(false); setFormTeam(null); await load()
  }

  async function confirmDelete() {
    if (!deleteTeam) return
    await fetch(`/api/teams/${deleteTeam.id}`, { method: "DELETE" })
    setDeleteTeam(null); await load()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Teams</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Staff grouped by technical and non-technical functions</p>
        </div>
        {canEdit && view === "subteams" && (
          <Button onClick={() => { setFormTeam(null); setFormOpen(true) }}>
            <Plus size={14} /> New Team
          </Button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color ?? "var(--foreground)" }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* View tabs + filters */}
      <Card style={{ padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* View switch */}
        <div style={{ display: "flex", gap: 2 }}>
          {([["roster", "Roster"], ["subteams", "Sub-Teams"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: view === v ? 700 : 400,
                border: "1px solid", borderRadius: 6, cursor: "pointer",
                background: view === v ? "var(--primary)" : "transparent",
                borderColor: view === v ? "var(--primary)" : "var(--border)",
                color: view === v ? "white" : "var(--muted-foreground)",
              }}
            >{l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={view === "roster" ? "Search employees…" : "Search teams…"}
            style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {(["", "TECHNICAL", "NON_TECHNICAL"] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: catFilter === c ? 700 : 400,
                border: "1px solid", borderRadius: 6, cursor: "pointer",
                background: catFilter === c ? "var(--primary)" : "transparent",
                borderColor: catFilter === c ? "var(--primary)" : "var(--border)",
                color: catFilter === c ? "white" : "var(--muted-foreground)",
              }}
            >{c === "" ? "All" : c === "TECHNICAL" ? "Technical" : "Non-Technical"}</button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Loading…</Card>
      ) : view === "roster" ? (
        /* ── ROSTER: all employees grouped by category ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, alignItems: "start" }}>
          {(catFilter ? [catFilter] : ["TECHNICAL", "NON_TECHNICAL"] as const).map(cat => {
            const meta = CAT_META[cat as keyof typeof CAT_META]
            const Icon = meta.icon
            const list = filteredRoster.filter(e => cat === "TECHNICAL" ? e.category === "TECHNICAL" : e.category !== "TECHNICAL")
            return (
              <Card key={cat}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{list.length} employee{list.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, color: meta.color }}>{list.length}</div>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 600, overflowY: "auto" }}>
                  {list.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                      No employees{search ? " matching search" : ""}.
                    </div>
                  ) : list.map((emp: any) => (
                    <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}>
                      <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.profilePhoto} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
                          {emp.jobTitle ?? "—"} · {emp.department?.name ?? "—"}
                        </div>
                        {emp.team && (
                          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: meta.color }}>
                            {emp.team.name}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        {roleLabel(emp.user?.role ?? "STAFF")}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ── SUB-TEAMS view ── */
        filteredTeams.length === 0 ? (
          <Card style={{ padding: "48px 24px", textAlign: "center" }}>
            <Users size={36} style={{ color: "var(--muted-foreground)", opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>No sub-teams yet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              {canEdit ? "Click \"New Team\" to create one." : "No sub-teams have been created."}
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))", gap: 16 }}>
            {filteredTeams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                canEdit={canEdit}
                canDelete={canDelete}
                allEmployees={employees}
                onEdit={() => { setFormTeam(team); setFormOpen(true) }}
                onDelete={() => setDeleteTeam(team)}
                onRefresh={load}
              />
            ))}
          </div>
        )
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <TeamFormModal
          team={formTeam ?? undefined}
          departments={departments}
          employees={employees.filter(e => e.employeeStatus === "ACTIVE")}
          onClose={() => { setFormOpen(false); setFormTeam(null) }}
          onSave={saveTeam}
        />
      )}

      {/* Delete confirm */}
      {deleteTeam && (
        <Modal open onClose={() => setDeleteTeam(null)} title="Delete Team" width={400}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Delete <strong>{deleteTeam.name}</strong>? Members will be unassigned but not removed from the organisation.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={() => setDeleteTeam(null)}>Cancel</Button>
              <Button onClick={confirmDelete} style={{ background: "#EF4444", borderColor: "#EF4444" }}>Delete Team</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
