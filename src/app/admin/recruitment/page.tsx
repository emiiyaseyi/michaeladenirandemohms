"use client"
import { useState, useEffect } from "react"
import { Briefcase, Users, Clock, CheckCircle, Plus, Loader2, X } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN:       { bg: "#DCFCE7", color: "#15803D" },
  DRAFT:      { bg: "#F3F4F6", color: "#6B7280" },
  CLOSED:     { bg: "#FEE2E2", color: "#DC2626" },
  CANCELLED:  { bg: "#FFF7ED", color: "#9A3412" },
}

export default function RecruitmentOverviewPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [jobForm, setJobForm] = useState({ title: "", departmentId: "", description: "", employmentType: "FULL_TIME", isInternal: false })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/recruitment").then(r => r.json()).then(d => {
      setJobs(d.jobs ?? [])
      setApplications(d.applications ?? [])
      setDepartments(d.departments ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openJobs = jobs.filter(j => j.status === "OPEN").length
  const totalApps = applications.length
  const activeApps = applications.filter(a => a.status === "ACTIVE").length
  const hired = applications.filter(a => a.status === "HIRED").length

  const doAddJob = async () => {
    if (!jobForm.title.trim() || !jobForm.description.trim()) { setErr("Title and description are required."); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/recruitment/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jobForm) })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    setShowAddJob(false)
    setJobForm({ title: "", departmentId: "", description: "", employmentType: "FULL_TIME", isInternal: false })
    load()
  }

  const statsCards = [
    { label: "Total Jobs", value: jobs.length, icon: Briefcase, color: "#6366F1" },
    { label: "Open Positions", value: openJobs, icon: CheckCircle, color: "#22C55E" },
    { label: "Total Applicants", value: totalApps, icon: Users, color: "#3B82F6" },
    { label: "Active Pipeline", value: activeApps, icon: Clock, color: "#F59E0B" },
  ]

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Recruitment</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>Manage job postings and your candidate pipeline.</p>
        </div>
        <button onClick={() => { setShowAddJob(true); setErr("") }}
          style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Post Job
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {statsCards.map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800 }}>{loading ? "—" : s.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>Recent Job Postings</h2>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Briefcase size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No job postings yet</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Create your first job posting to start recruiting.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Job Title", "Department", "Type", "Applicants", "Status", "Date"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 8).map(j => {
                const sc = STATUS_COLORS[j.status] ?? STATUS_COLORS.DRAFT
                return (
                  <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{j.title}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{j.department?.name ?? "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{j.employmentType?.replace(/_/g, " ")}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{j._count?.applications ?? 0}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{j.status}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>
                      {new Date(j.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Job Modal */}
      {showAddJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Post New Job</h2>
              <button onClick={() => setShowAddJob(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Job Title <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} rows={4}
                  style={{ ...fi, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Department</label>
                  <select value={jobForm.departmentId} onChange={e => setJobForm(f => ({ ...f, departmentId: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                    <option value="">Select…</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Employment Type</label>
                  <select value={jobForm.employmentType} onChange={e => setJobForm(f => ({ ...f, employmentType: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="STAFF">Intern</option>
                    <option value="NYSC">NYSC</option>
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={jobForm.isInternal} onChange={e => setJobForm(f => ({ ...f, isInternal: e.target.checked }))} />
                Internal posting only
              </label>
              {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddJob(false)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doAddJob} disabled={saving} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {saving ? "Posting…" : "Post Job"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
