"use client"
import { useState, useEffect, useRef } from "react"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import { LogOut, CheckCircle2, Circle, Loader2, UserMinus, AlertTriangle, FileText, Users, Clock, Inbox, X, Paperclip } from "lucide-react"
import { formatDate } from "@/lib/utils"

const EXIT_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: "Resignation", TERMINATION: "Termination",
  RETIREMENT: "Retirement", CONTRACT_END: "Contract End", REDUNDANCY: "Redundancy",
}

const CATEGORY_COLOR: Record<string, string> = {
  ADMIN: "#6366F1", IT: "#0EA5E9", FINANCE: "#10B981", HR: "#F59E0B",
  EMPLOYEE: "#8B5CF6", PROJECT_LEAD: "#F59E0B", SUPER_ADMIN: "#EF4444",
}

const PROCESS_STEPS = [
  { icon: FileText, color: "#6366F1", bg: "#EEF2FF", title: "Submit Request", desc: "Fill in the form below with your exit type, intended last day, and reason." },
  { icon: Users,    color: "#0EA5E9", bg: "#E0F2FE", title: "HR Review",       desc: "HR will review your request and initiate the offboarding process." },
  { icon: Clock,    color: "#F59E0B", bg: "#FEF3C7", title: "Offboarding",     desc: "Complete all checklist items assigned to you before your last day." },
  { icon: CheckCircle2, color: "#10B981", bg: "#ECFDF5", title: "Clearance",   desc: "Receive full clearance and final settlement upon completion." },
]

export default function SSExitPage() {
  const [offboarding, setOffboarding] = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [form, setForm]               = useState({ exitType: "RESIGNATION", reason: "", intendedLastDay: "" })
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [docFile, setDocFile]         = useState<File | null>(null)
  const [docUrl, setDocUrl]           = useState("")
  const [docUploading, setDocUploading] = useState(false)
  const [docError, setDocError]       = useState("")
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/self-service/exit")
      .then(r => r.json())
      .then(d => { setOffboarding(d.offboarding ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleFile = async (file: File) => {
    setDocError("")
    const ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png"]
    if (!ALLOWED.includes(file.type)) { setDocError("Only PDF, DOC, DOCX, JPG, PNG files are accepted"); return }
    if (file.size > 1 * 1024 * 1024) { setDocError("File too large — max 1MB"); return }
    setDocFile(file); setDocUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const r = await fetch("/api/self-service/exit/upload-doc", { method: "POST", body: fd })
    setDocUploading(false)
    if (r.ok) { const d = await r.json(); setDocUrl(d.url) }
    else { const d = await r.json(); setDocError(d.error ?? "Upload failed"); setDocFile(null) }
  }

  const removeDoc = () => { setDocFile(null); setDocUrl(""); setDocError(""); if (fileInputRef.current) fileInputRef.current.value = "" }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setConfirmOpen(true)
  }

  const confirmSubmit = async () => {
    setSubmitting(true); setSubmitError("")
    try {
      const r = await fetch("/api/self-service/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, documentUrl: docUrl || null }),
      })
      const d = await r.json()
      if (r.ok) { setSubmitted(true); setConfirmOpen(false) }
      else setSubmitError(d.error ?? "Failed to submit")
    } catch {
      setSubmitError("Network error, please try again")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid var(--border)",
    borderRadius: 10, fontSize: 14, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
    transition: "border-color .15s",
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  /* ── Offboarding in progress ─────────────────────────────────────────────── */
  if (offboarding) {
    const tasks = offboarding.tasks ?? []
    const done  = tasks.filter((t: any) => t.status === "COMPLETED").length
    const pct   = tasks.length ? Math.round((done / tasks.length) * 100) : 0

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>My Offboarding</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Your exit process status and checklist.</p>
        </div>

        {/* Summary banner */}
        <Card>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <UserMinus size={26} style={{ color: "#EF4444" }} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{EXIT_TYPE_LABEL[offboarding.exitType] ?? offboarding.exitType}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>
                  Last working day: <strong style={{ color: "var(--foreground)" }}>{formatDate(offboarding.lastWorkingDay)}</strong>
                </div>
              </div>
              <Badge status={offboarding.status} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted-foreground)", marginBottom: 8 }}>
              <span>Checklist progress</span>
              <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{done}/{tasks.length} tasks complete ({pct}%)</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 5, background: pct === 100 ? "var(--success)" : "var(--primary)", width: `${pct}%`, transition: "width .4s" }} />
            </div>
          </div>
        </Card>

        {/* Checklist */}
        <Card>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Offboarding Checklist</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tasks.map((task: any, i: number) => {
                const completed = task.status === "COMPLETED"
                return (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "16px 0",
                    borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    {completed
                      ? <CheckCircle2 size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
                      : <Circle size={22} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: completed ? "line-through" : "none" }}>
                        {task.title}
                      </div>
                      {task.assignedTo && (
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>Assigned to: {task.assignedTo}</div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                      background: CATEGORY_COLOR[task.category] ? `${CATEGORY_COLOR[task.category]}18` : "var(--muted)",
                      color: CATEGORY_COLOR[task.category] ?? "var(--muted-foreground)",
                    }}>
                      {task.category}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  /* ── No offboarding yet — request form ───────────────────────────────────── */

  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Exit Request</h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Submit a resignation request to HR.</p>
      </div>
      <Card>
        <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={34} style={{ color: "#10B981" }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Request Submitted</div>
            <div style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 420, lineHeight: 1.6 }}>
              Your exit request has been sent to HR. They will initiate the offboarding process and notify you of next steps.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Exit Request</h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>
          Submit a formal exit request to HR to begin the offboarding process.
        </p>
      </div>

      {/* Warning banner */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 20px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12 }}>
        <AlertTriangle size={20} style={{ color: "#EA580C", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "#9A3412", lineHeight: 1.6 }}>
          <strong>Before you proceed:</strong> Submitting this request will notify HR and your manager. Please ensure you have read your employment contract and understand the notice period requirements.
        </div>
      </div>

      {/* Process steps */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>How it works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Card key={i}>
                <div style={{ padding: "20px 20px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: step.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} style={{ color: step.color }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: step.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>Step {i + 1}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Request form */}
      {!confirmOpen ? (
        <Card>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F3E8FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LogOut size={20} style={{ color: "#7C3AED" }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Submit Exit Request</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Fill in the details below to submit your request</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7, color: "var(--foreground)" }}>
                    Exit Type <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <select required value={form.exitType} onChange={e => setForm(f => ({ ...f, exitType: e.target.value }))} style={inputCls}>
                    <option value="RESIGNATION">Resignation</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="CONTRACT_END">Contract End</option>
                    <option value="REDUNDANCY">Redundancy</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7, color: "var(--foreground)" }}>
                    Intended Last Working Day <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <input
                    type="date" required value={form.intendedLastDay}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    onChange={e => setForm(f => ({ ...f, intendedLastDay: e.target.value }))}
                    style={inputCls}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7, color: "var(--foreground)" }}>
                  Reason for Leaving
                </label>
                <textarea
                  value={form.reason} rows={5}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Briefly describe your reason for leaving (optional but helpful for HR records)…"
                  style={{ ...inputCls, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* Document upload */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--foreground)" }}>
                  Do you have a supporting document?
                  <span title="Optional. Accepted: PDF, DOC, DOCX, JPG, PNG — max 1MB" style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--muted-foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--muted-foreground)", cursor: "help", fontWeight: 700, flexShrink: 0 }}>?</span>
                </label>

                {docUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", border: "1.5px solid var(--primary)", borderRadius: 10, background: "var(--muted)" }}>
                    <Paperclip size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docFile?.name}</span>
                    <button type="button" onClick={removeDoc} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2, display: "flex", borderRadius: 4 }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    style={{
                      border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: 12, padding: "32px 20px", textAlign: "center",
                      background: dragOver ? "var(--muted)" : "transparent",
                      transition: "all .15s", cursor: "pointer",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {docUploading
                          ? <Loader2 size={22} style={{ color: "var(--primary)", animation: "spin .8s linear infinite" }} />
                          : <Inbox size={22} style={{ color: "var(--primary)" }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
                      {docUploading ? "Uploading…" : "Drop your file here or"}
                    </div>
                    {!docUploading && (
                      <>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
                          Only pdf, doc, docx, png, jpg, jpeg — max 1MB
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                          style={{ padding: "8px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          Choose file
                        </button>
                      </>
                    )}
                  </div>
                )}

                {docError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{docError}</div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="danger">
                  <LogOut size={14} /> Review & Submit Request
                </Button>
              </div>
            </form>
          </div>
        </Card>
      ) : (
        /* Confirmation panel */
        <Card>
          <div style={{ padding: "32px 32px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={22} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Confirm Exit Request</div>
                <div style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  You are about to submit a <strong style={{ color: "var(--foreground)" }}>{EXIT_TYPE_LABEL[form.exitType]}</strong> request
                  with an intended last day of <strong style={{ color: "var(--foreground)" }}>{form.intendedLastDay ? new Date(form.intendedLastDay).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</strong>.
                  HR will be notified immediately and will begin the offboarding process.
                </div>
              </div>
            </div>

            {form.reason && (
              <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px", marginBottom: 12, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--foreground)" }}>Reason:</strong> {form.reason}
              </div>
            )}
            {docUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--muted)", borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
                <Paperclip size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span style={{ color: "var(--muted-foreground)" }}>Supporting document attached:</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{docFile?.name}</span>
              </div>
            )}

            {submitError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626" }}>
                {submitError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>Go Back</Button>
              <Button variant="danger" disabled={submitting} onClick={confirmSubmit}>
                {submitting
                  ? <><Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> Submitting…</>
                  : "Yes, Submit Request"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
