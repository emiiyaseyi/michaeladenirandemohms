"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { ShieldCheck, Plus, Trash2, Loader2, X } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

const DUTY_GROUPS = [
  { group: "Payroll & Payslips", duties: [
    { key: "canViewPayslips",   label: "View employee payslips" },
    { key: "canCreatePayslip",  label: "Create / generate payslips" },
    { key: "canEditPayslip",    label: "Edit payslip entries" },
    { key: "canReleasePayslip", label: "Release payslips to employees" },
    { key: "canDeletePayslip",  label: "Delete / void payslips" },
    { key: "canExportPayroll",  label: "Export payroll data" },
  ]},
  { group: "Leave Management", duties: [
    { key: "canViewAllLeave",       label: "View all leave requests" },
    { key: "canApproveLeave",       label: "Approve or reject leave" },
    { key: "canCancelLeave",        label: "Cancel leave on behalf of employee" },
    { key: "canManageLeaveTypes",   label: "Create / edit leave types" },
    { key: "canAdjustLeaveBalance", label: "Manually adjust leave balances" },
    { key: "canViewLeaveReports",   label: "View leave analytics & reports" },
  ]},
  { group: "HR & Employees", duties: [
    { key: "canViewAllEmployees",    label: "View all employee records" },
    { key: "canCreateEmployee",      label: "Add new employees" },
    { key: "canEditEmployee",        label: "Edit employee records" },
    { key: "canDeactivateEmployee",  label: "Deactivate / offboard employees" },
    { key: "canManageDepartments",   label: "Create / edit departments" },
    { key: "canViewReports",         label: "View HR reports" },
    { key: "canExportReports",       label: "Export reports to CSV / PDF" },
    { key: "canManageAnnouncements", label: "Create & manage announcements" },
    { key: "canManageDocuments",     label: "Upload & manage org documents" },
  ]},
  { group: "Benefits Administration", duties: [
    { key: "canViewBenefits",         label: "View benefits enrollments" },
    { key: "canManageBenefits",       label: "Create / edit benefit plans" },
    { key: "canEnrollBenefits",       label: "Enroll employees in benefits" },
    { key: "canProcessBenefitClaims", label: "Process benefit claims" },
    { key: "canManagePension",        label: "Manage pension records" },
    { key: "canManageHMO",            label: "Manage HMO / health insurance" },
  ]},
  { group: "Performance Management", duties: [
    { key: "canViewPerformance",        label: "View performance records" },
    { key: "canCreateReview",           label: "Create performance review cycles" },
    { key: "canManageKPIs",             label: "Create & manage KPIs / goals" },
    { key: "canSubmitAppraisals",       label: "Submit appraisals" },
    { key: "canApproveAppraisals",      label: "Approve & finalise appraisals" },
    { key: "canViewPerformanceReports", label: "View performance analytics" },
  ]},
  { group: "Projects", duties: [
    { key: "canViewProjects",             label: "View all projects" },
    { key: "canCreateProject",            label: "Create projects" },
    { key: "canManageProjectAssignments", label: "Assign / remove team members" },
    { key: "canCloseProject",             label: "Close or archive projects" },
  ]},
  { group: "System & Administration", duties: [
    { key: "canManageSettings", label: "Manage system settings" },
    { key: "canManageUsers",    label: "Create & manage user accounts" },
    { key: "canViewAuditLog",   label: "View audit / activity log" },
    { key: "canSwitchView",     label: "Switch between admin & staff views" },
  ]},
]

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", duties: [] as string[] })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/settings/custom-roles")
    const d = await r.json()
    setRoles(d.customRoles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name || form.duties.length === 0) return
    setSaving(true)
    const r = await fetch("/api/settings/custom-roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json()
    if (d.customRole) setRoles(prev => [...prev, d.customRole])
    setSaving(false); setNewOpen(false); setForm({ name: "", description: "", duties: [] })
  }

  const del = async (id: string) => {
    if (!confirm("Delete this custom role?")) return
    await fetch(`/api/settings/custom-roles?id=${id}`, { method: "DELETE" })
    setRoles(prev => prev.filter(r => r.id !== id))
  }

  const allDuties = DUTY_GROUPS.flatMap(g => g.duties)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Create custom roles with granular permissions drawn from system role capabilities.</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}><Plus size={14} /> New Role</Button>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /><span style={{ fontSize: 13 }}>Loading…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : roles.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px", textAlign: "center" }}>
            <ShieldCheck size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No custom roles yet. Create one by selecting granular permissions.</div>
          </div>
        ) : (
          <div>
            {roles.map((role: any) => {
              const dutyLabels = (role.duties ?? []).map((k: string) => allDuties.find(d => d.key === k)?.label ?? k)
              return (
                <div key={role.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={18} style={{ color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{role.name}</div>
                    {role.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{role.description}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {dutyLabels.slice(0, 8).map((p: string) => (
                        <span key={p} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--success-bg)", color: "var(--success)", fontWeight: 600 }}>{p}</span>
                      ))}
                      {dutyLabels.length > 8 && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>+{dutyLabels.length - 8} more</span>}
                    </div>
                  </div>
                  <button onClick={() => del(role.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--danger)", flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* New Role Modal */}
      {newOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>New Custom Role</div>
              <button onClick={() => setNewOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,220px),1fr))", gap: 14 }}>
                <div><label style={lbl}>Role Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} placeholder="e.g. Payslip Officer" /></div>
                <div><label style={lbl}>Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={inp} placeholder="Brief description" /></div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Permissions *</label>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{form.duties.length} selected</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {DUTY_GROUPS.map(grp => {
                    const allKeys = grp.duties.map(d => d.key)
                    const allSelected = allKeys.every(k => form.duties.includes(k))
                    return (
                      <div key={grp.group}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{grp.group}</div>
                          <button type="button" onClick={() => setForm(f => ({ ...f, duties: allSelected ? f.duties.filter(d => !allKeys.includes(d)) : [...new Set([...f.duties, ...allKeys])] }))} style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: 4 }}>
                          {grp.duties.map(duty => {
                            const selected = form.duties.includes(duty.key)
                            return (
                              <label key={duty.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`, background: selected ? "var(--muted)" : "transparent", cursor: "pointer" }}>
                                <input type="checkbox" checked={selected} onChange={() => setForm(f => ({ ...f, duties: selected ? f.duties.filter(d => d !== duty.key) : [...f.duties, duty.key] }))} style={{ width: 13, height: 13, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, fontWeight: selected ? 600 : 400, color: selected ? "var(--foreground)" : "var(--foreground)" }}>{duty.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button onClick={() => setNewOpen(false)} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name || form.duties.length === 0} style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: "var(--primary)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: (!form.name || form.duties.length === 0) ? 0.5 : 1 }}>
                {saving ? "Creating…" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
