"use client"
import { useState, useEffect } from "react"
import Button from "@/components/ui/Button"
import { Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"

const fi = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" } as const

const F = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--foreground)" }}>
      {label}{required && <span style={{ color: "var(--accent)" }}> *</span>}
    </label>
    {children}
  </div>
)

export default function EditEmployeeModal({ employee, departments, employees: allEmployees, onClose, onSuccess, currentUserRole }: {
  employee: any; departments: any[]; employees: any[]; onClose: () => void; onSuccess: () => void; currentUserRole?: string
}) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/teams").then(r => r.ok ? r.json() : { teams: [] }).then(d => setTeams(d.teams ?? []))
  }, [])

  useEffect(() => {
    if (!employee) return
    setForm({
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
      middleName: employee.middleName ?? "",
      role: employee.user?.role ?? "STAFF",
      additionalRoles: employee.user?.additionalRoles ?? [],
      gender: employee.gender ?? "",
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "",
      maritalStatus: employee.maritalStatus ?? "",
      nationality: employee.nationality ?? "Nigerian",
      stateOfOrigin: employee.stateOfOrigin ?? "",
      personalEmail: employee.personalEmail ?? "",
      phone: employee.phone ?? "",
      alternatePhone: employee.alternatePhone ?? "",
      address: employee.address ?? "",
      city: employee.city ?? "",
      state: employee.state ?? "",
      country: employee.country ?? "Nigeria",
      postalCode: employee.postalCode ?? "",
      jobTitle: employee.jobTitle ?? "",
      departmentId: employee.departmentId ?? "",
      employmentType: employee.employmentType ?? "FULL_TIME",
      employeeStatus: employee.employeeStatus ?? "ACTIVE",
      hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
      confirmationDate: employee.confirmationDate ? employee.confirmationDate.split("T")[0] : "",
      managerId: employee.managerId ?? "",
      departmentLeadId: employee.departmentLeadId ?? "",
      teamId: employee.teamId ?? "",
      grossSalary: employee.grossSalary ?? "",
      annualLeaveBalance: employee.annualLeaveBalance ?? 21,
      sickLeaveBalance: employee.sickLeaveBalance ?? 14,
      bankName: employee.bankName ?? "",
      bankAccountNo: employee.bankAccountNo ?? "",
      bankAccountName: employee.bankAccountName ?? "",
      nokName: employee.nokName ?? "",
      nokPhone: employee.nokPhone ?? "",
      nokRelationship: employee.nokRelationship ?? "",
      nokAddress: employee.nokAddress ?? "",
    })
  }, [employee])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setForm(f => {
      const updated = { ...f, [k]: value }

      if (k === "departmentId" && value) {
        const deptEmps = allEmployees.filter((emp: any) => emp.departmentId === value && emp.id !== employee?.id)
        const mgr = deptEmps.find((emp: any) => emp.user?.role === "TEAM_LEAD" || emp.user?.role === "TEAM_LEAD")
        const lead = deptEmps.find((emp: any) => emp.user?.role === "TEAM_LEAD")
        const mgrAny = deptEmps.find((emp: any) => emp.user?.role === "TEAM_LEAD")
        if (lead) updated.departmentLeadId = lead.id
        if (mgrAny) updated.managerId = mgrAny.id
        else if (mgr) updated.managerId = mgr.id
      }

      if (k === "teamId" && value) {
        const team = teams.find((t: any) => t.id === value)
        if (team) {
          if (team.department?.id) updated.departmentId = team.department.id
          if (team.head?.id) updated.managerId = team.head.id
          const deptEmps = allEmployees.filter((emp: any) => emp.departmentId === team.department?.id && emp.id !== employee?.id)
          const lead = deptEmps.find((emp: any) => emp.user?.role === "TEAM_LEAD")
          if (lead) updated.departmentLeadId = lead.id
        }
      }

      return updated
    })
  }

  const save = async () => {
    setLoading(true); setError("")
    const r = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to save"); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onSuccess(); onClose() }, 1200)
  }

  const sel = (label: string, key: string, options: [string, string][], req = false) => (
    <F label={label} required={req}>
      <select value={form[key] ?? ""} onChange={set(key)} style={fi}>
        <option value="">Select…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </F>
  )

  const inp = (label: string, key: string, type = "text", req = false) => (
    <F label={label} required={req}>
      <input type={type} value={form[key] ?? ""} onChange={set(key)} style={fi} />
    </F>
  )

  const section = (title: string) => (
    <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginTop: 8, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>{title}</div>
  )

  const reportingOptions: [string, string][] = allEmployees
    .filter((e: any) => e.id !== employee?.id)
    .map((e: any) => [e.id, `${e.firstName} ${e.lastName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}`])

  return (
    <div>
      <div style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {section("Personal Information")}
          {inp("First Name", "firstName", "text", true)}
          {inp("Last Name", "lastName", "text", true)}
          {inp("Middle Name", "middleName")}
          {sel("Gender", "gender", [["MALE", "Male"], ["FEMALE", "Female"]])}
          {inp("Date of Birth", "dateOfBirth", "date")}
          {sel("Marital Status", "maritalStatus", [["SINGLE","Single"],["MARRIED","Married"],["DIVORCED","Divorced"],["WIDOWED","Widowed"]])}
          {inp("Nationality", "nationality")}
          {inp("State of Origin", "stateOfOrigin")}

          {section("Contact")}
          {inp("Personal Email", "personalEmail", "email")}
          {inp("Phone", "phone", "tel")}
          {inp("Alternate Phone", "alternatePhone", "tel")}

          {section("Address")}
          <div style={{ gridColumn: "1/-1" }}>{inp("Street Address", "address")}</div>
          {inp("City", "city")}
          {inp("State", "state")}
          {inp("Country", "country")}
          {inp("Postal Code", "postalCode")}

          {section("Employment")}
          {inp("Job Title", "jobTitle")}
          <F label="Department">
            <select value={form.departmentId ?? ""} onChange={set("departmentId")} style={fi}>
              <option value="">No department</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </F>
          {sel("Employment Type", "employmentType", [["FULL_TIME","Full Time"],["PART_TIME","Part Time"],["CONTRACT","Contract"],["STAFF","Intern"],["NYSC","NYSC"]])}
          {sel("Status", "employeeStatus", [["ACTIVE","Active"],["ON_LEAVE","On Leave"],["SUSPENDED","Suspended"],["TERMINATED","Terminated"],["RESIGNED","Resigned"]])}
          {inp("Hire Date", "hireDate", "date")}
          {inp("Confirmation Date", "confirmationDate", "date")}
          {inp("Gross Salary (₦)", "grossSalary", "number")}
          {inp("Annual Leave Balance", "annualLeaveBalance", "number")}
          {inp("Sick Leave Balance", "sickLeaveBalance", "number")}

          {section("Team & Reporting")}
          <F label="Team">
            <select value={form.teamId ?? ""} onChange={set("teamId")} style={fi}>
              <option value="">No team</option>
              {teams.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.department ? ` · ${t.department.name}` : ""}
                </option>
              ))}
            </select>
          </F>
          <div />
          <F label="Manager">
            <select value={form.managerId ?? ""} onChange={set("managerId")} style={fi}>
              <option value="">None</option>
              {reportingOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
          <F label="Department Lead">
            <select value={form.departmentLeadId ?? ""} onChange={set("departmentLeadId")} style={fi}>
              <option value="">None</option>
              {reportingOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
          {(form.managerId || form.departmentLeadId) && (
            <div style={{ gridColumn: "1/-1", fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success, #1A7336)", display: "inline-block" }} />
              Auto-filled from team/department. Adjust manually if needed.
            </div>
          )}

          {section("System Access")}
          <F label="Role">
            {form.role === "SUPER_ADMIN" ? (
              <input value="Super Admin" disabled style={{ ...fi, opacity: 0.6, cursor: "not-allowed" }} />
            ) : (
              <select value={form.role ?? "STAFF"} onChange={set("role")} style={fi}>
                <option value="STAFF">Staff</option>
                <option value="TEAM_LEAD">Team Lead</option>
                {currentUserRole === "SUPER_ADMIN" && <option value="ADMIN">Admin</option>}
              </select>
            )}
          </F>
          <div />

          {section("Next of Kin")}
          {inp("NOK Full Name", "nokName")}
          {inp("NOK Phone", "nokPhone", "tel")}
          {sel("NOK Relationship", "nokRelationship", [["Spouse","Spouse"],["Parent","Parent"],["Sibling","Sibling"],["Child","Child"],["Other","Other"]])}
          <div style={{ gridColumn: "1/-1" }}>{inp("NOK Address", "nokAddress")}</div>

          {section("Bank Details")}
          {inp("Bank Name", "bankName")}
          {inp("Account Number", "bankAccountNo")}
          {inp("Account Name", "bankAccountName")}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--danger-bg)", color: "var(--accent)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 16 }}>
            <AlertCircle size={14} />{error}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
        {saved && <span style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={13} /> Saved!</span>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={loading}>
          {loading ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
        </Button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
