"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronRight, Loader2 } from "lucide-react"

const fi: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 14, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}

export default function EditOfferPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const [departments, setDepartments] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [form, setForm] = useState({
    candidateName: "", candidateEmail: "", jobTitle: "",
    departmentId: "", managerId: "", hireDate: "", salary: "", letterText: "", status: "PENDING",
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/offers/${id}`).then(r => r.json()),
      fetch("/api/settings/departments").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]).then(([o, d, e]) => {
      const offer = o.offer
      if (offer) {
        setForm({
          candidateName: offer.candidateName ?? "",
          candidateEmail: offer.candidateEmail ?? "",
          jobTitle: offer.jobTitle ?? "",
          departmentId: offer.departmentId ?? "",
          managerId: offer.managerId ?? "",
          hireDate: offer.hireDate ? new Date(offer.hireDate).toISOString().slice(0, 10) : "",
          salary: offer.salary != null ? String(offer.salary) : "",
          letterText: offer.letterText ?? "",
          status: offer.status ?? "PENDING",
        })
      }
      setDepartments(d.departments ?? [])
      setManagers(e.employees ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const doSave = async () => {
    if (!form.candidateName.trim() || !form.candidateEmail.trim()) { setErr("Name and email are required."); return }
    setSaving(true); setErr("")
    const r = await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail,
        jobTitle: form.jobTitle || null,
        departmentId: form.departmentId || null,
        managerId: form.managerId || null,
        hireDate: form.hireDate || null,
        salary: form.salary || null,
        letterText: form.letterText || null,
        status: form.status,
      }),
    })
    setSaving(false)
    if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); return }
    router.push("/admin/people/offers")
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/people/offers")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: 0 }}>Offers</button>
        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ color: "var(--muted-foreground)" }}>Edit Offer Letter</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Edit Offer Letter</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Update the candidate's offer details below.</p>
        </div>

        <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Candidate Name</label>
            <input value={form.candidateName} onChange={e => set("candidateName", e.target.value)} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>* </span>Email</label>
            <input type="email" value={form.candidateEmail} onChange={e => set("candidateEmail", e.target.value)} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Job Title</label>
            <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Gross Annual Salary (₦)</label>
            <input type="number" value={form.salary} onChange={e => set("salary", e.target.value)} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Department</label>
            <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} style={{ ...fi, appearance: "none" }}>
              <option value="">Select department</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Manager</label>
            <select value={form.managerId} onChange={e => set("managerId", e.target.value)} style={{ ...fi, appearance: "none" }}>
              <option value="">Select manager</option>
              {managers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hire Date</label>
            <input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} style={fi} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...fi, appearance: "none" }}>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        <div style={{ padding: "0 32px 28px" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Offer Letter Text</label>
          <textarea value={form.letterText} onChange={e => set("letterText", e.target.value)} rows={14}
            style={{ ...fi, fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, resize: "vertical" }} />
        </div>

        {err && <div style={{ margin: "0 32px 16px", padding: "10px 14px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>{err}</div>}

        <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => router.push("/admin/people/offers")}
            style={{ padding: "10px 24px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={doSave} disabled={saving}
            style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
