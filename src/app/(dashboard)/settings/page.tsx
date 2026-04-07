"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import { Settings, Building2, CalendarDays, Plus, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const [tab, setTab] = useState<"departments"|"leave-types"|"holidays">("departments")
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [addDeptOpen, setAddDeptOpen] = useState(false)
  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [addHolidayOpen, setAddHolidayOpen] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: "", description: "", divisionId: "" })
  const [leaveForm, setLeaveForm] = useState({ name: "", description: "", defaultDays: "21", waitingDays: "0", genderSpecific: "", requiresDoc: false, minDocDays: "2" })
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", year: new Date().getFullYear().toString() })

  const load = async () => {
    const r = await fetch("/api/settings")
    const d = await r.json()
    setDepartments(d.departments ?? [])
    setDivisions(d.divisions ?? [])
    setLeaveTypes(d.leaveTypes ?? [])
    setHolidays(d.holidays ?? [])
  }

  useEffect(() => { load() }, [])

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/settings/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deptForm) })
    setAddDeptOpen(false); load()
  }
  const addLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/settings/leave-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leaveForm) })
    setAddLeaveOpen(false); load()
  }
  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/settings/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(holidayForm) })
    setAddHolidayOpen(false); load()
  }

  const TABS = [
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "leave-types", label: "Leave Types", icon: CalendarDays },
    { key: "holidays", label: "Public Holidays", icon: CalendarDays },
  ] as const

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Settings</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Configure your HRMS</p>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar nav */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <Card style={{ padding: 8 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key as any)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === key ? "var(--primary-50, #EBF3FF)" : "transparent", color: tab === key ? "var(--primary)" : "var(--muted-foreground)", fontWeight: tab === key ? 700 : 400, fontSize: 13, textAlign: "left" }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </Card>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === "departments" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Departments ({departments.length})</h3>
                <Button size="sm" onClick={() => setAddDeptOpen(true)}><Plus size={14} /> Add</Button>
              </div>
              <div>
                {departments.map(d => (
                  <div key={d.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{d.division?.name ?? "No Division"} · {d._count?.employees ?? 0} employees</div>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No departments yet. Add one to get started.</div>}
              </div>
            </Card>
          )}

          {tab === "leave-types" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Leave Types ({leaveTypes.length})</h3>
                <Button size="sm" onClick={() => setAddLeaveOpen(true)}><Plus size={14} /> Add</Button>
              </div>
              <div>
                {leaveTypes.map(l => (
                  <div key={l.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{l.defaultDays} days · {l.genderSpecific ? `${l.genderSpecific} only` : "All genders"} · {l.waitingDays > 0 ? `${l.waitingDays} day notice` : "No notice"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, background: l.isActive ? "var(--success-bg)" : "var(--muted)", color: l.isActive ? "var(--success)" : "var(--muted-foreground)", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{l.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                ))}
                {leaveTypes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No leave types configured.</div>}
              </div>
            </Card>
          )}

          {tab === "holidays" && (
            <Card>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Public Holidays {new Date().getFullYear()}</h3>
                <Button size="sm" onClick={() => setAddHolidayOpen(true)}><Plus size={14} /> Add</Button>
              </div>
              <div>
                {holidays.map(h => (
                  <div key={h.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{new Date(h.date).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</div>
                  </div>
                ))}
                {holidays.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No holidays configured for this year.</div>}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Dept Modal */}
      <Modal open={addDeptOpen} onClose={() => setAddDeptOpen(false)} title="Add Department" width={440}>
        <form onSubmit={addDept}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={deptForm.name} onChange={e => setDeptForm(f => ({...f, name: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description</label><input value={deptForm.description} onChange={e => setDeptForm(f => ({...f, description: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
            <Button type="submit">Add Department</Button>
          </div>
        </form>
      </Modal>

      {/* Add Leave Type Modal */}
      <Modal open={addLeaveOpen} onClose={() => setAddLeaveOpen(false)} title="Add Leave Type" width={480}>
        <form onSubmit={addLeave}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={leaveForm.name} onChange={e => setLeaveForm(f => ({...f, name: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Default Days</label><input type="number" value={leaveForm.defaultDays} onChange={e => setLeaveForm(f => ({...f, defaultDays: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Notice Period (days)</label><input type="number" value={leaveForm.waitingDays} onChange={e => setLeaveForm(f => ({...f, waitingDays: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
            </div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Gender Restriction</label><select value={leaveForm.genderSpecific} onChange={e => setLeaveForm(f => ({...f, genderSpecific: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }}><option value="">All genders</option><option value="MALE">Male only</option><option value="FEMALE">Female only</option></select></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={leaveForm.requiresDoc} onChange={e => setLeaveForm(f => ({...f, requiresDoc: e.target.checked}))} /> Requires supporting document</label>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddLeaveOpen(false)}>Cancel</Button>
            <Button type="submit">Add Leave Type</Button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal open={addHolidayOpen} onClose={() => setAddHolidayOpen(false)} title="Add Public Holiday" width={400}>
        <form onSubmit={addHoliday}>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Holiday Name <span style={{ color: "var(--accent)" }}>*</span></label><input required value={holidayForm.name} onChange={e => setHolidayForm(f => ({...f, name: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date <span style={{ color: "var(--accent)" }}>*</span></label><input type="date" required value={holidayForm.date} onChange={e => setHolidayForm(f => ({...f, date: e.target.value}))} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)" }} /></div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddHolidayOpen(false)}>Cancel</Button>
            <Button type="submit">Add Holiday</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
