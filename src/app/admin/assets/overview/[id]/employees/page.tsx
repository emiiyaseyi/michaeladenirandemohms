"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { X, ChevronDown, ChevronUp, Search } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }

const PERIOD_UNITS = ["Months", "Years", "Days", "Weeks"]

type EmpSettings = { hasPeriod: boolean; period: string; periodUnit: string; assignedOn: string; description: string }
function defaultSettings(): EmpSettings {
  return { hasPeriod: false, period: "", periodUnit: "Months", assignedOn: "", description: "" }
}

function PeriodInput({ value, unit, onValue, onUnit }: { value: string; unit: string; onValue: (v: string) => void; onUnit: (u: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input type="number" min={1} value={value} onChange={e => onValue(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="e.g. 6" />
      <div style={{ position: "relative", flex: 1 }}>
        <div onClick={() => setOpen(v => !v)} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
          <span>{unit || "Months"}</span>
          <ChevronDown size={13} style={{ color: "var(--muted-foreground)" }} />
        </div>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "4px 0" }}>
            {PERIOD_UNITS.map(u => (
              <div key={u} onClick={() => { onUnit(u); setOpen(false) }}
                style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: (unit || "Months") === u ? "var(--muted)" : "transparent", color: "var(--foreground)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = (unit || "Months") === u ? "var(--muted)" : "transparent"}>
                {u}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeeAccordion({ name, settings, onChange, single }: { name: string; settings: EmpSettings; onChange: (s: EmpSettings) => void; single?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: single ? 0 : 6 }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "var(--muted)", userSelect: "none" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
        {open ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />}
      </div>
      {open && (
        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Is there a set period for which this asset will be possessed?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Yes", "No"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name={`period-${name}`} checked={settings.hasPeriod === (opt === "Yes")} onChange={() => onChange({ ...settings, hasPeriod: opt === "Yes", period: "", periodUnit: "Months" })}
                    style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                  {opt}
                </label>
              ))}
            </div>
            {settings.hasPeriod && (
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Period</label>
                <PeriodInput value={settings.period} unit={settings.periodUnit} onValue={v => onChange({ ...settings, period: v })} onUnit={u => onChange({ ...settings, periodUnit: u })} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Assignment date</label>
            <input type="date" value={settings.assignedOn} onChange={e => onChange({ ...settings, assignedOn: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea value={settings.description} onChange={e => onChange({ ...settings, description: e.target.value })} rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>
      )}
    </div>
  )
}

function MultiSelectEmployees({ employees, value, onChange }: { employees: any[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const filtered = employees.filter(e => !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()))
  const selected = employees.filter(e => value.includes(e.id))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={lbl}>Employees</label>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => onChange(employees.map(e => e.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--primary)", padding: 0 }}>Add all</button>
          <button type="button" onClick={() => onChange([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--primary)", padding: 0 }}>Remove all</button>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <div onClick={() => setOpen(true)} style={{ ...inp, minHeight: 42, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "text", padding: "8px 36px 8px 12px" }}>
          {selected.map(e => (
            <span key={e.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--muted)", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
              {e.firstName} {e.lastName}
              <X size={12} style={{ cursor: "pointer", color: "var(--muted-foreground)" }} onClick={ev => { ev.stopPropagation(); toggle(e.id) }} />
            </span>
          ))}
          {selected.length === 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Select employees</span>}
          <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
        </div>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}
            onMouseDown={e => e.preventDefault()}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                style={{ width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                onBlur={() => setOpen(false)} />
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.map(e => {
                const checked = value.includes(e.id)
                return (
                  <div key={e.id} onMouseDown={() => toggle(e.id)}
                    style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: checked ? "var(--muted)" : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={checked} onChange={() => {}} style={{ width: 14, height: 14, accentColor: "var(--primary)", flexShrink: 0 }} />
                    {e.firstName} {e.lastName}
                  </div>
                )
              })}
              {filtered.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssetEmployeesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [asset, setAsset] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [useSame, setUseSame] = useState(false)
  const [sharedSettings, setSharedSettings] = useState<EmpSettings>(defaultSettings())
  const [perEmpSettings, setPerEmpSettings] = useState<Record<string, EmpSettings>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/assets/${id}`).then(r => r.json()).then(d => setAsset(d.asset))
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [id])

  useEffect(() => {
    setPerEmpSettings(prev => {
      const next: Record<string, EmpSettings> = {}
      selectedEmpIds.forEach(empId => { next[empId] = prev[empId] ?? defaultSettings() })
      return next
    })
  }, [selectedEmpIds])

  const finish = async () => {
    setSaving(true)
    setError("")
    const assignments = selectedEmpIds.map(empId => {
      const s = useSame ? sharedSettings : (perEmpSettings[empId] ?? defaultSettings())
      return { employeeId: empId, hasPeriod: s.hasPeriod, period: s.period, periodUnit: s.periodUnit, assignedOn: s.assignedOn, description: s.description }
    })
    const r = await fetch(`/api/assets/${id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, useSameSettings: useSame }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed"); return }
    router.push(`/admin/assets/overview/${id}`)
  }

  return (
    <div>
      {/* Breadcrumb - shown in TopBar, but keep page content minimal */}
      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Add or remove employees from {asset?.name ?? "…"} asset</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Which employees would you like to add/remove from this asset?</div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 20 }}>
            <MultiSelectEmployees employees={employees} value={selectedEmpIds} onChange={setSelectedEmpIds} />
          </div>

          {selectedEmpIds.length > 0 && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
                <input type="checkbox" checked={useSame} onChange={e => setUseSame(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "var(--primary)" }} />
                Use same setting for all selected employees
              </label>

              {useSame && (
                <div style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
                  <strong>Heads up! Existing employee assets will be updated</strong><br />
                  Selecting this option will also update the settings of existing employee assets. If this is not your expected outcome, deselect this option and configure the new employee assets one after the other.
                </div>
              )}

              {useSame ? (
                <EmployeeAccordion name="All selected employees" settings={sharedSettings} onChange={setSharedSettings} single />
              ) : (
                <div>
                  {selectedEmpIds.map(empId => {
                    const emp = employees.find(e => e.id === empId)
                    if (!emp) return null
                    return (
                      <EmployeeAccordion
                        key={empId}
                        name={`${emp.firstName} ${emp.lastName}`}
                        settings={perEmpSettings[empId] ?? defaultSettings()}
                        onChange={s => setPerEmpSettings(prev => ({ ...prev, [empId]: s }))}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={finish} disabled={saving}
          style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Finish"}
        </button>
      </div>
    </div>
  )
}
