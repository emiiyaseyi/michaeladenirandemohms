"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Loader2 } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

const BLANK = {
  firstName: "", middleName: "", lastName: "", email: "",
  hireDate: "", offerDeadline: "", workLocation: "", departmentId: "", managerId: "", employeeNumber: "",
  grossSalary: "", jobTitle: "", letterText: "",
}

function buildLetter(f: typeof BLANK, deptName: string, mgr: string) {
  const hire = f.hireDate ? new Date(f.hireDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "[Start Date]"
  const sal = f.grossSalary ? `₦${Number(f.grossSalary).toLocaleString()} per annum` : "[Salary]"
  const fullName = [f.firstName, f.middleName, f.lastName].filter(Boolean).join(" ")
  return `Dear ${fullName || "[Candidate Name]"},

We are pleased to offer you the position of ${f.jobTitle || "[Job Title]"} at Michael Demo HRMS.

POSITION DETAILS
Job Title: ${f.jobTitle || "[Job Title]"}
Department: ${deptName || "[Department]"}
Reporting to: ${mgr || "[Manager]"}
Start Date: ${hire}
Offer Deadline: ${f.offerDeadline ? new Date(f.offerDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "[Deadline]"}
Work Location: ${f.workLocation || "[Location]"}

COMPENSATION
Gross Annual Salary: ${sal}

This offer is subject to satisfactory completion of background and reference checks.

Please confirm your acceptance by signing and returning this letter within the offer period.

Yours sincerely,
HR Department
Michael Demo HRMS`
}

export default function NewOfferPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...BLANK })
  const [departments, setDepartments] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/settings/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? [])).catch(() => {})
    fetch("/api/employees").then(r => r.json()).then(d => setManagers(d.employees ?? [])).catch(() => {})
  }, [])

  const set = (k: keyof typeof BLANK, v: string) => setForm(f => ({ ...f, [k]: v }))

  const nextStep = () => {
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.hireDate) {
        setErr("First Name, Last Name, Email and Hire Date are required.")
        return
      }
      if (!form.letterText) {
        const dept = departments.find(d => d.id === form.departmentId)?.name ?? ""
        const mgr = managers.find(m => m.id === form.managerId)
        const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : ""
        setForm(f => ({ ...f, letterText: buildLetter(f, dept, mgrName) }))
      }
    }
    setErr("")
    setStep(s => s + 1)
  }

  const doSave = async () => {
    setSaving(true); setErr("")
    const candidateName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")
    const body = {
      candidateName, candidateEmail: form.email, jobTitle: form.jobTitle || null,
      departmentId: form.departmentId || null, managerId: form.managerId || null,
      hireDate: form.hireDate || null, salary: form.grossSalary || null, letterText: form.letterText || null,
    }
    const r = await fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed to save"); return }
    router.push("/admin/people/offers")
  }

  const STEPS = ["Basic Information", "Offer Letter", "Document", "Asset"]

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/people/offers")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: 0 }}>Offers</button>
        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ color: "var(--muted-foreground)" }}>Send an offer letter</span>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
        {STEPS.map((label, i) => {
          const s = i + 1
          const active = step === s
          const done = step > s
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: s < STEPS.length ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: done || active ? "var(--primary)" : "var(--muted)", color: done || active ? "white" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, border: active ? "2px solid var(--primary)" : "none" }}>
                  {s}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap" }}>{label}</span>
              </div>
              {s < STEPS.length && <div style={{ flex: 1, height: 2, background: step > s ? "var(--primary)" : "var(--border)", margin: "0 8px", marginBottom: 18 }} />}
            </div>
          )
        })}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 }}>
        {step === 1 && (
          <>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>1.1 Offer letter template info</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                Fill out the basic information to populate the <span style={{ padding: "2px 8px", background: "var(--muted)", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid var(--border)" }}>Smart Text</span> fields in your offer letter.
              </p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6 }}>
                Please note: This information will also be used to onboard them into Michael Demo HRMS if they sign the offer.
              </p>
            </div>

            <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>First Name</label>
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Offer letter template</label>
                <select style={{ ...fi, appearance: "none" }}>
                  <option value="">Select template</option>
                  <option value="default">Default Template</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Middle Name</label>
                <input value={form.middleName} onChange={e => set("middleName", e.target.value)} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Offer deadline</label>
                <input type="date" value={form.offerDeadline} onChange={e => set("offerDeadline", e.target.value)} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Last Name</label>
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Work Location</label>
                <select value={form.workLocation} onChange={e => set("workLocation", e.target.value)} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select Work Location</option>
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Enter Email" style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Add to Department</label>
                <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select Department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Hire date</label>
                <input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Manager</label>
                <select value={form.managerId} onChange={e => set("managerId", e.target.value)} style={{ ...fi, appearance: "none" }}>
                  <option value="">Select Manager</option>
                  {managers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Employee Number</label>
                <input value={form.employeeNumber} onChange={e => set("employeeNumber", e.target.value)} style={fi} />
              </div>
            </div>

            {err && <div style={{ margin: "0 32px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}

            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={nextStep} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>

            {/* 1.2 Compensation */}
            <div style={{ borderTop: "2px solid var(--border)", padding: "24px 32px 32px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>1.2 Compensation</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Job Title</label>
                  <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} placeholder="e.g. Data Analyst" style={fi} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Gross Annual Salary (₦)</label>
                  <input type="number" value={form.grossSalary} onChange={e => set("grossSalary", e.target.value)} placeholder="e.g. 2400000" style={fi} />
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Offer Letter</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Review and customise the offer letter text below.</p>
            </div>
            <div style={{ padding: "24px 32px" }}>
              <textarea value={form.letterText} onChange={e => setForm(f => ({ ...f, letterText: e.target.value }))} rows={22}
                style={{ ...fi, fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, resize: "vertical" }} />
            </div>
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Back</button>
              <button onClick={nextStep} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Documents</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Attach any supporting documents to include with this offer.</p>
            </div>
            <div style={{ padding: "40px 32px", textAlign: "center" }}>
              <div style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: 40, color: "var(--muted-foreground)", fontSize: 13 }}>
                <p style={{ marginBottom: 8, fontWeight: 600 }}>No documents required</p>
                <p>You can optionally attach documents. Drag & drop or click to upload.</p>
              </div>
            </div>
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(2)} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Back</button>
              <button onClick={nextStep} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white" }}>Next</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Assets</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>List any assets to be assigned to this hire upon joining.</p>
            </div>
            <div style={{ padding: "40px 32px" }}>
              <div style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <p style={{ marginBottom: 8, fontWeight: 600 }}>No assets assigned</p>
                <p>Assets can be assigned after the offer is accepted.</p>
              </div>
            </div>
            {err && <div style={{ margin: "0 32px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}
            <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(3)} style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Back</button>
              <button onClick={doSave} disabled={saving} style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
                {saving ? "Sending…" : "Send Offer"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
