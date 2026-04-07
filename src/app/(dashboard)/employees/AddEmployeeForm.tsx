"use client"
import { useState } from "react"
import Button from "@/components/ui/Button"

export default function AddEmployeeForm({ departments, onSuccess }: { departments: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", workEmail: "", phone: "", jobTitle: "", departmentId: "", employmentType: "FULL_TIME", hireDate: "", gender: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const r = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data = await r.json()
    setLoading(false)
    if (!r.ok) { setError(data.error ?? "Failed to add employee"); return }
    onSuccess()
  }

  const field = (label: string, key: string, type = "text", required = true) => (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>{label}{required && <span style={{ color: "var(--accent)" }}> *</span>}</label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} required={required}
        style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} />
    </div>
  )

  return (
    <form onSubmit={submit}>
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {field("First Name", "firstName")}
        {field("Last Name", "lastName")}
        {field("Work Email", "workEmail", "email")}
        {field("Phone", "phone", "tel", false)}
        {field("Job Title", "jobTitle", "text", false)}
        {field("Hire Date", "hireDate", "date", false)}

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Gender</label>
          <select value={form.gender} onChange={e => set("gender", e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
            <option value="">Select...</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Employment Type <span style={{ color: "var(--accent)" }}>*</span></label>
          <select value={form.employmentType} onChange={e => set("employmentType", e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
            <option value="NYSC">NYSC</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Department</label>
          <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}>
            <option value="">Select department...</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {error && <div style={{ gridColumn: "1 / -1", background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button type="submit" loading={loading}>Add Employee</Button>
      </div>
    </form>
  )
}
