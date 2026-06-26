"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, Users, MoreHorizontal, Plus, Loader2, X } from "lucide-react"

const STAGES = ["APPLICATION","ASSESSMENT","TECHNICAL","INTERVIEW","MANAGEMENT_REVIEW","OFFER","ONBOARDING"]
const STAGE_LABEL: Record<string, string> = { APPLICATION: "Application", ASSESSMENT: "Assessment", TECHNICAL: "Technical", INTERVIEW: "Interview", MANAGEMENT_REVIEW: "Mgmt Review", OFFER: "Offer", ONBOARDING: "Onboarding" }

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  APPLICATION:      { bg: "#EFF6FF", color: "#2563EB" },
  ASSESSMENT:       { bg: "#FFF7ED", color: "#C2410C" },
  TECHNICAL:        { bg: "#F5F3FF", color: "#7C3AED" },
  INTERVIEW:        { bg: "#ECFDF5", color: "#059669" },
  MANAGEMENT_REVIEW:{ bg: "#FEF9C3", color: "#854D0E" },
  OFFER:            { bg: "#F0FDF4", color: "#15803D" },
  ONBOARDING:       { bg: "#DCFCE7", color: "#15803D" },
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#15803D" },
  REJECTED:  { bg: "#FEE2E2", color: "#DC2626" },
  WITHDRAWN: { bg: "#F3F4F6", color: "#6B7280" },
  HIRED:     { bg: "#EFF6FF", color: "#2563EB" },
}

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

function RowMenu({ app, onMoveStage, onUpdateStatus, onDelete }: { app: any; onMoveStage: (stage: string) => void; onUpdateStatus: (s: string) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState<"stage" | "status" | null>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v); setSub(null)
  }
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) { setOpen(false); setSub(null) }
    }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [open])
  return (
    <>
      <button ref={btnRef} onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--muted-foreground)" }}>
        <MoreHorizontal size={16} />
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, right: pos.right, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 170, padding: "4px 0" }}>
          <div style={{ position: "relative" }}>
            <button onMouseEnter={() => setSub("stage")} style={{ display: "flex", width: "100%", padding: "10px 16px", background: sub === "stage" ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left", justifyContent: "space-between" }}>
              Move to Stage <span>›</span>
            </button>
            {sub === "stage" && (
              <div style={{ position: "absolute", right: "calc(100% + 4px)", top: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1, minWidth: 160, padding: "4px 0" }}>
                {STAGES.filter(s => s !== app.stage).map(s => (
                  <button key={s} onClick={() => { setOpen(false); setSub(null); onMoveStage(s) }} style={{ display: "block", width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>{STAGE_LABEL[s]}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button onMouseEnter={() => setSub("status")} style={{ display: "flex", width: "100%", padding: "10px 16px", background: sub === "status" ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left", justifyContent: "space-between" }}>
              Update Status <span>›</span>
            </button>
            {sub === "status" && (
              <div style={{ position: "absolute", right: "calc(100% + 4px)", top: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1, minWidth: 140, padding: "4px 0" }}>
                {["ACTIVE", "REJECTED", "WITHDRAWN", "HIRED"].filter(s => s !== app.status).map(s => (
                  <button key={s} onClick={() => { setOpen(false); setSub(null); onUpdateStatus(s) }} style={{ display: "block", width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>{s.charAt(0) + s.slice(1).toLowerCase()}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setOpen(false); onDelete() }} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left" }}>Delete</button>
        </div>,
        document.body
      )}
    </>
  )
}

const PAGE_SIZE = 10

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [jobFilter, setJobFilter] = useState("")
  const [jobOpen, setJobOpen] = useState(false)
  const [stageFilter, setStageFilter] = useState("")
  const [stageOpen, setStageOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [addForm, setAddForm] = useState({ jobPostingId: "", candidateName: "", candidateEmail: "", candidatePhone: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/recruitment/applicants").then(r => r.json()),
      fetch("/api/recruitment").then(r => r.json()),
    ]).then(([a, r]) => {
      setApplicants(a.applicants ?? [])
      setJobs(r.jobs ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = applicants.filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q || a.candidateName.toLowerCase().includes(q) || a.candidateEmail.toLowerCase().includes(q)
    const matchJob = !jobFilter || a.jobPostingId === jobFilter
    const matchStage = !stageFilter || a.stage === stageFilter
    return matchQ && matchJob && matchStage
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const doMoveStage = async (id: string, stage: string) => {
    const r = await fetch(`/api/recruitment/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) })
    if (r.ok) { const { applicant } = await r.json(); setApplicants(prev => prev.map(a => a.id === applicant.id ? applicant : a)) }
  }

  const doUpdateStatus = async (id: string, status: string) => {
    const r = await fetch(`/api/recruitment/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (r.ok) { const { applicant } = await r.json(); setApplicants(prev => prev.map(a => a.id === applicant.id ? applicant : a)) }
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/recruitment/applicants/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setApplicants(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const doAdd = async () => {
    if (!addForm.jobPostingId || !addForm.candidateName.trim() || !addForm.candidateEmail.trim()) { setErr("Job, name and email are required."); return }
    setSaving(true); setErr("")
    const r = await fetch("/api/recruitment/applicants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    const { applicant } = await r.json()
    setApplicants(prev => [applicant, ...prev])
    setShowAdd(false)
    setAddForm({ jobPostingId: "", candidateName: "", candidateEmail: "", candidatePhone: "", notes: "" })
  }

  const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "12px 16px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search applicants…"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", width: 220, outline: "none" }} />
          </div>
          {/* Job filter */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setJobOpen(o => !o); setStageOpen(false) }}
              style={{ padding: "8px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
              {jobFilter ? jobs.find(j => j.id === jobFilter)?.title ?? "Filter by job" : "Filter by job"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {jobOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 220, padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
                <button onClick={() => { setJobFilter(""); setJobOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: !jobFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>All jobs</button>
                {jobs.map(j => <button key={j.id} onClick={() => { setJobFilter(j.id); setJobOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: jobFilter === j.id ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>{j.title}</button>)}
              </div>
            )}
          </div>
          {/* Stage filter */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setStageOpen(o => !o); setJobOpen(false) }}
              style={{ padding: "8px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
              {stageFilter ? STAGE_LABEL[stageFilter] : "Filter by stage"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {stageOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 180, padding: "4px 0" }}>
                <button onClick={() => { setStageFilter(""); setStageOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: !stageFilter ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>All stages</button>
                {STAGES.map(s => <button key={s} onClick={() => { setStageFilter(s); setStageOpen(false) }} style={{ display: "block", width: "100%", padding: "9px 16px", background: stageFilter === s ? "var(--muted)" : "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: "var(--foreground)" }}>{STAGE_LABEL[s]}</button>)}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => { setShowAdd(true); setErr("") }} style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Add Applicant
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No applicants found</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{search || jobFilter || stageFilter ? "No results match your filters." : "No applicants yet."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Candidate</th>
                  <th style={th}>Position</th>
                  <th style={th}>Stage</th>
                  <th style={th}>Status</th>
                  <th style={th}>Applied</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(a => {
                  const sc = STAGE_COLORS[a.stage] ?? STAGE_COLORS.APPLICATION
                  const ss = STATUS_COLORS[a.status] ?? STATUS_COLORS.ACTIVE
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{a.candidateName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{a.candidateEmail}</div>
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>{a.jobPosting?.title ?? "-"}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{STAGE_LABEL[a.stage]}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: ss.bg, color: ss.color }}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</span>
                      </td>
                      <td style={{ ...td, color: "var(--muted-foreground)" }}>
                        {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <RowMenu app={a} onMoveStage={stage => doMoveStage(a.id, stage)} onUpdateStatus={status => doUpdateStatus(a.id, status)} onDelete={() => setDeleteTarget(a)} />
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

      {/* Add applicant modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Applicant</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Job Position <span style={{ color: "#ef4444" }}>*</span></label>
                <select value={addForm.jobPostingId} onChange={e => setAddForm(f => ({ ...f, jobPostingId: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select job…</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Full Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={addForm.candidateName} onChange={e => setAddForm(f => ({ ...f, candidateName: e.target.value }))} style={fi} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="email" value={addForm.candidateEmail} onChange={e => setAddForm(f => ({ ...f, candidateEmail: e.target.value }))} style={fi} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phone</label>
                <input value={addForm.candidatePhone} onChange={e => setAddForm(f => ({ ...f, candidatePhone: e.target.value }))} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Notes</label>
                <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...fi, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              {err && <div style={{ padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={doAdd} disabled={saving} style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {saving && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                {saving ? "Adding…" : "Add Applicant"}
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
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Delete Applicant</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>
              Remove <strong>{deleteTarget.candidateName}</strong> from the pipeline? This cannot be undone.
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
