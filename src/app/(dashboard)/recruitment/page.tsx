"use client"
import { useState, useEffect, useCallback } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import { Briefcase, Plus, Users, Clock, ChevronRight, Mail, Phone, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils"

const STAGES = ["APPLICATION","ASSESSMENT","TECHNICAL","INTERVIEW","MANAGEMENT_REVIEW","OFFER","ONBOARDING"]
const STAGE_LABELS: Record<string, string> = { APPLICATION: "Application", ASSESSMENT: "Assessment", TECHNICAL: "Technical", INTERVIEW: "Interview", MANAGEMENT_REVIEW: "Mgmt Review", OFFER: "Offer", ONBOARDING: "Onboarding" }

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"jobs"|"pipeline">("jobs")
  const [selectedJob, setSelectedJob] = useState<string>("")
  const [addJobOpen, setAddJobOpen] = useState(false)
  const [jobForm, setJobForm] = useState({ title: "", departmentId: "", description: "", employmentType: "FULL_TIME", isInternal: false })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/recruitment")
    const data = await r.json()
    setJobs(data.jobs ?? [])
    setApplications(data.applications ?? [])
    setDepartments(data.departments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredApps = selectedJob ? applications.filter((a: any) => a.jobPostingId === selectedJob) : applications

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/recruitment/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jobForm) })
    setAddJobOpen(false)
    load()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Recruitment & ATS</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Manage job postings and candidate pipeline</p>
        </div>
        <Button size="sm" onClick={() => setAddJobOpen(true)}><Plus size={14} /> Post Job</Button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["jobs","pipeline"] as const).map(t => (
          <button key={t} onClick={() => setView(t)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === t ? "var(--card)" : "transparent", color: view === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: view === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t === "jobs" ? "Job Postings" : "Candidate Pipeline"}
          </button>
        ))}
      </div>

      {view === "jobs" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 16 }}>
          {loading ? <div style={{ color: "var(--muted-foreground)", gridColumn: "1/-1", padding: 40, textAlign: "center" }}>Loading...</div>
          : jobs.length === 0 ? (
            <Card style={{ gridColumn: "1/-1" }}>
              <EmptyState icon={Briefcase} title="No job postings yet" description="Create your first job posting to start recruiting." action={<Button onClick={() => setAddJobOpen(true)}><Plus size={14} /> Post Job</Button>} />
            </Card>
          ) : jobs.map((job: any) => (
            <Card key={job.id} style={{ padding: 20, cursor: "pointer" }} onClick={() => { setSelectedJob(job.id); setView("pipeline") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-50, #EBF3FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Briefcase size={18} style={{ color: "var(--primary)" }} />
                </div>
                <Badge status={job.status} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{job.title}</h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>{job.department?.name ?? "—"} · {job.employmentType?.replace(/_/g," ")}</p>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={12} /> {job._count?.applications ?? 0} applicant{(job._count?.applications ?? 0) !== 1 ? "s" : ""}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatDate(job.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          {selectedJob && (
            <div style={{ marginBottom: 12 }}>
              <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "var(--card)", color: "var(--foreground)" }}>
                <option value="">All Jobs</option>
                {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          )}
          {/* Kanban pipeline */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {STAGES.map(stage => {
              const stagApps = filteredApps.filter((a: any) => a.stage === stage)
              return (
                <div key={stage} style={{ minWidth: 220, flex: "0 0 220px" }}>
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--muted)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{STAGE_LABELS[stage]}</span>
                    <span style={{ fontSize: 11, background: "var(--card)", borderRadius: 999, padding: "2px 8px", fontWeight: 700, color: "var(--muted-foreground)" }}>{stagApps.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stagApps.map((app: any) => (
                      <Card key={app.id} style={{ padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{app.candidateName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>{app.jobPosting?.title}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Badge status={app.status} />
                        </div>
                      </Card>
                    ))}
                    {stagApps.length === 0 && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--subtle)", border: "1px dashed var(--border)", borderRadius: 8 }}>Empty</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={addJobOpen} onClose={() => setAddJobOpen(false)} title="Post New Job" width={560}>
        <form onSubmit={addJob}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {[["Job Title","title","text"],["Description","description","text"]].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label} <span style={{ color: "var(--accent)" }}>*</span></label>
                {key === "description" ? (
                  <textarea value={(jobForm as any)[key]} onChange={e => setJobForm(f => ({ ...f, [key]: e.target.value }))} rows={4} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", resize: "vertical" }} />
                ) : (
                  <input type={type} value={(jobForm as any)[key]} onChange={e => setJobForm(f => ({ ...f, [key]: e.target.value }))} required style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
                )}
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Department</label>
                <select value={jobForm.departmentId} onChange={e => setJobForm(f => ({ ...f, departmentId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                  <option value="">Select...</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Employment Type</label>
                <select value={jobForm.employmentType} onChange={e => setJobForm(f => ({ ...f, employmentType: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                  <option value="NYSC">NYSC</option>
                </select>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={jobForm.isInternal} onChange={e => setJobForm(f => ({ ...f, isInternal: e.target.checked }))} />
              Internal posting only
            </label>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddJobOpen(false)}>Cancel</Button>
            <Button type="submit">Post Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
