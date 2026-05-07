"use client"
import { useState, useEffect, useRef } from "react"
import { Search, Briefcase, MoreHorizontal, Plus, Loader2, X } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN:      { bg: "#DCFCE7", color: "#15803D" },
  DRAFT:     { bg: "#F3F4F6", color: "#6B7280" },
  CLOSED:    { bg: "#FEE2E2", color: "#DC2626" },
  CANCELLED: { bg: "#FFF7ED", color: "#9A3412" },
}

function RowMenu({ job, onEdit, onClose, onDelete }: { job: any; onEdit: () => void; onClose: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 150, padding: "4px 0" }}>
          <button onClick={() => { setOpen(false); onEdit() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Edit</button>
          {job.status !== "OPEN" && (
            <button onClick={() => { setOpen(false); onClose() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Open</button>
          )}
          {job.status === "OPEN" && (
            <button onClick={() => { setOpen(false); onClose() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>Close</button>
          )}
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>Delete</button>
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 10

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [statusOpen, setStatusOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [form, setForm] = useState({ title: "", departmentId: "", description: "", employmentType: "FULL_TIME", isInternal: false })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/recruitment").then(r => r.json()).then(d => { setJobs(d.jobs ?? []); setDepartments(d.departments ?? []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchQ = !q || j.title.toLowerCase().includes(q) || (j.department?.name ?? "").toLowerCase().includes(q)
    const matchS = !statusFilter || j.status === statusFilter
    return matchQ && matchS
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openForm = (job?: any) => {
    setEditTarget(job ?? null)
    setForm(job ? { title: job.title, departmentId: job.departmentId ?? "", description: job.description, employmentType: job.employmentType, isInternal: job.isInternal } : { title: "", departmentId: "", description: "", employmentType: "FULL_TIME", isInternal: false })
    setErr("")
    setShowForm(true)
  }

  const doSave = async () => {
    if (!form.title.trim() || !form.description.trim()) { setErr("Title and description are required."); return }
    setSaving(true); setErr("")
    const url = editTarget ? `/api/recruitment/jobs/${editTarget.id}` : "/api/recruitment/jobs"
    const method = editTarget ? "PATCH" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    setShowForm(false)
    load()
  }

  const doToggleStatus = async (job: any) => {
    const newStatus = job.status === "OPEN" ? "CLOSED" : "OPEN"
    await fetch(`/api/recruitment/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
    load()
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/recruitment/jobs/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search jobs…"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 220, outline: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setStatusOpen(o => !o)}
              style={{ padding: "8px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, minWidth: 140 }}>
              {statusFilter || "All statuses"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {statusOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 160, padding: "4px 0" }}>
                <button onClick={() => { setStatusFilter(""); setStatusOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: !statusFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>All statuses</button>
                {["OPEN", "DRAFT", "CLOSED", "CANCELLED"].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setStatusOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: statusFilter === s ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => openForm()} style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Post Job
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Briefcase size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No job postings</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search || statusFilter ? "No results match your filters." : "Post your first job to start recruiting."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Job Title</th>
                  <th style={th}>Department</th>
                  <th style={th}>Type</th>
                  <th style={th}>Applicants</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date Posted</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(j => {
                  const sc = STATUS_COLORS[j.status] ?? STATUS_COLORS.DRAFT
                  return (
                    <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{j.title}{j.isInternal && <span style={{ marginLeft: 6, fontSize: 10, background: "var(--muted)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Internal</span>}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{j.department?.name ?? "—"}</td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{j.employmentType?.replace(/_/g, " ")}</td>
                      <td style={td}>{j._count?.applications ?? 0}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{j.status}</span>
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>
                        {new Date(j.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <RowMenu job={j} onEdit={() => openForm(j)} onClose={() => doToggleStatus(j)} onDelete={() => setDeleteTarget(j)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 6, background: page === p ? "var(--primary)" : "var(--background)", color: page === p ? "white" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Job Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{editTarget ? "Edit Job" : "Post New Job"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Job Title <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} style={{ ...fi, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Department</label>
                  <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                    <option value="">Select…</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Employment Type</label>
                  <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="STAFF">Intern</option>
                    <option value="NYSC">NYSC</option>
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isInternal} onChange={e => setForm(f => ({ ...f, isInternal: e.target.checked }))} />
                Internal posting only
              </label>
              {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doSave} disabled={saving} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {saving ? "Saving…" : (editTarget ? "Save" : "Post Job")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Delete Job</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>? All applicants for this job will also be removed.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} style={{ padding: "9px 22px", background: "#DC2626", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
