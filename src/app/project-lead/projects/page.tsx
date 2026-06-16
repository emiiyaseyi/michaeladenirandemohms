"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FolderKanban, Plus, Users, Calendar, Loader2, ChevronRight } from "lucide-react"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#16a34a", label: "Active" },
  ON_HOLD:   { bg: "#FEF3C7", color: "#D97706", label: "On Hold" },
  COMPLETED: { bg: "#DBEAFE", color: "#2563eb", label: "Completed" },
  CANCELLED: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}

export default function PLProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [deptIds, setDeptIds] = useState<string[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", departmentId: "", startDate: "", endDate: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/project-lead/projects")
    if (r.ok) {
      const d = await r.json()
      setProjects(d.projects ?? [])
      setDeptIds(d.deptIds ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!deptIds.length) return
    fetch("/api/settings/departments")
      .then(r => r.json())
      .then(d => {
        const all = d.departments ?? []
        setDepts(all.filter((dept: any) => deptIds.includes(dept.id)))
        setForm(f => ({ ...f, departmentId: deptIds[0] ?? "" }))
      })
  }, [deptIds.join(",")])

  const createProject = async () => {
    setError("")
    if (!form.name.trim()) { setError("Name is required"); return }
    if (!form.departmentId) { setError("Department is required"); return }
    setSaving(true)
    const r = await fetch("/api/project-lead/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to create"); return }
    setShowCreate(false)
    setForm({ name: "", description: "", departmentId: deptIds[0] ?? "", startDate: "", endDate: "" })
    load()
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FolderKanban size={20} style={{ color: "var(--primary)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Projects</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} across your departments
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Project
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
          <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
        </div>
      ) : projects.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "60px 20px", textAlign: "center" }}>
          <FolderKanban size={40} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No projects yet</div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
            Create your first project to start assigning team members.
          </p>
          <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create First Project</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {projects.map((p: any) => {
            const s = STATUS_COLORS[p.status] ?? STATUS_COLORS.ACTIVE
            return (
              <div key={p.id}
                onClick={() => router.push(`/project-lead/projects/${p.id}`)}
                style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ""}>
                <div style={{ height: 3, background: "var(--primary)" }} />
                <div style={{ padding: "16px 18px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{p.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 10px", lineHeight: 1.5 }}>{p.description}</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                      <Users size={12} /> <strong style={{ color: "var(--foreground)" }}>{p._count.members}</strong> member{p._count.members !== 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {p.department.name}
                    </div>
                    {(p.startDate || p.endDate) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <Calendar size={12} />
                        {p.startDate ? new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        {" → "}
                        {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Ongoing"}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                  Manage <ChevronRight size={13} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError("") }} title="New Project" width={480}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Project Name <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Data Pipeline Overhaul" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="What is this project about?" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Department <span style={{ color: "var(--accent)" }}>*</span></label>
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => { setShowCreate(false); setError("") }}>Cancel</Button>
          <Button loading={saving} onClick={createProject}>Create Project</Button>
        </div>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
