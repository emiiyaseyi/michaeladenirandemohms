"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { X, ChevronDown, ChevronUp, Search, Info } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }
const req = <span style={{ color: "var(--danger)" }}>*</span>

const PERIOD_UNITS = ["Months", "Years", "Days", "Weeks"]
const ADD_NEW_SENTINEL = "__new__"

function TypeDropdown({ types, value, onChange }: {
  types: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const isAddNew = value === ADD_NEW_SENTINEL
  const selected = types.find(t => t.id === value)
  const displayLabel = isAddNew ? "Add new type..." : (selected?.name ?? "")
  const filtered = types.filter(t => t.name.toLowerCase().includes(q.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: displayLabel ? "var(--foreground)" : "var(--muted-foreground)", fontStyle: isAddNew ? "italic" : "normal" }}>
          {displayLabel || "Please select"}
        </span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              style={{ width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map(t => (
              <div key={t.id} onClick={() => { onChange(t.id); setOpen(false); setQ("") }}
                style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", background: value === t.id ? "var(--muted)" : "transparent", color: "var(--foreground)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === t.id ? "var(--muted)" : "transparent"}>
                {t.name}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <div onClick={() => { onChange(ADD_NEW_SENTINEL); setOpen(false); setQ("") }}
              style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", color: "var(--primary)", fontWeight: 600 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              Add new type...
            </div>
          </div>
        </div>
      )}
    </div>
  )
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

type EmpSettings = { hasPeriod: boolean; period: string; periodUnit: string; assignedOn: string; description: string }
function defaultSettings(): EmpSettings { return { hasPeriod: false, period: "", periodUnit: "Months", assignedOn: "", description: "" } }

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
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--foreground)" }}>
              Is there a set period for which this asset will be possessed?
              <Info size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>
                  Period <Info size={14} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <PeriodInput value={settings.period} unit={settings.periodUnit} onValue={v => onChange({ ...settings, period: v })} onUnit={u => onChange({ ...settings, periodUnit: u })} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>
              Assignment date <Info size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <input type="date" value={settings.assignedOn} onChange={e => onChange({ ...settings, assignedOn: e.target.value })} style={inp} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }}>
              Description <Info size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <textarea value={settings.description} onChange={e => onChange({ ...settings, description: e.target.value })} rows={3}
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
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
          {selected.length === 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}></span>}
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
                    {checked && <span style={{ marginLeft: "auto", color: "var(--primary)" }}>✓</span>}
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

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position: "fixed", top: 20, right: 20, background: "var(--danger)", color: "white", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 99999, maxWidth: 320, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: 0, flexShrink: 0 }}><X size={14} /></button>
    </div>
  )
}

export default function NewAssetPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [types, setTypes] = useState<{ id: string; name: string }[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [newTypeName, setNewTypeName] = useState("")
  const [addingType, setAddingType] = useState(false)
  const [typeError, setTypeError] = useState("")

  const [form, setForm] = useState({
    name: "", assetTypeId: "", description: "", identifier: "",
    commissionDate: "", isMultiAssignable: false, maxAssignees: "",
  })
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [useSame, setUseSame] = useState(false)
  const [sharedSettings, setSharedSettings] = useState<EmpSettings>(defaultSettings())
  const [perEmpSettings, setPerEmpSettings] = useState<Record<string, EmpSettings>>({})
  const [saving, setSaving] = useState(false)

  const isAddNew = form.assetTypeId === ADD_NEW_SENTINEL

  useEffect(() => {
    fetch("/api/assets/types").then(r => r.json()).then(d => {
      if (!d.types?.length) {
        fetch("/api/assets/types", { method: "PUT" }).then(r => r.json()).then(d2 => setTypes(d2.types ?? []))
      } else {
        setTypes(d.types ?? [])
      }
    })
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  useEffect(() => {
    setPerEmpSettings(prev => {
      const next: Record<string, EmpSettings> = {}
      selectedEmpIds.forEach(id => { next[id] = prev[id] ?? defaultSettings() })
      return next
    })
  }, [selectedEmpIds])

  const addNewType = async () => {
    if (!newTypeName.trim()) { setTypeError("Name is required"); return }
    setTypeError(""); setAddingType(true)
    const r = await fetch("/api/assets/types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTypeName.trim() }) })
    const d = await r.json()
    setAddingType(false)
    if (!r.ok) { setTypeError(d.error ?? "Failed"); return }
    const newType = d.type
    setTypes(prev => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)))
    setForm(f => ({ ...f, assetTypeId: newType.id }))
    setNewTypeName("")
    setTypeError("")
  }

  const handleEmpChange = (ids: string[]) => {
    const max = form.isMultiAssignable && form.maxAssignees ? parseInt(form.maxAssignees) : form.isMultiAssignable ? null : 1
    if (max !== null && ids.length > max) {
      setToast(`You can't assign this asset to more than ${max} employee${max !== 1 ? "s" : ""}`)
      return
    }
    setSelectedEmpIds(ids)
  }

  const goToStep2 = () => {
    if (!form.name.trim()) { setError("Asset name is required"); return }
    if (!form.commissionDate) { setError("Commission date is required"); return }
    if (isAddNew) { setError("Please save the new asset type first"); return }
    setError("")
    setStep(2)
  }

  const finish = async () => {
    setSaving(true)
    const assignments = selectedEmpIds.map(id => {
      const s = useSame ? sharedSettings : (perEmpSettings[id] ?? defaultSettings())
      return { employeeId: id, hasPeriod: s.hasPeriod, period: s.period, periodUnit: s.periodUnit, assignedOn: s.assignedOn, description: s.description }
    })
    const r = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assignments }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to create asset"); return }
    router.push(`/admin/assets/overview/${d.asset.id}`)
  }

  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {step === 1 && (
        <>
          <div style={cardStyle}>
            <div style={{ padding: "24px 28px 20px" }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Create new asset</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>When you assign asset to an employee, we'll email the employee to let them know you've assigned an asset to them.</div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>

              {/* Row 1 - changes layout when "Add new type..." is selected */}
              {!isAddNew ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>{req} Asset type</label>
                    <TypeDropdown types={types} value={form.assetTypeId} onChange={id => setForm(f => ({ ...f, assetTypeId: id }))} />
                  </div>
                  <div>
                    <label style={lbl}>{req} Asset name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Add new type mode - 3 rows */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={lbl}>{req} Asset type</label>
                      <TypeDropdown types={types} value={form.assetTypeId} onChange={id => setForm(f => ({ ...f, assetTypeId: id }))} />
                    </div>
                    <div>
                      <label style={lbl}>{req} New Asset Type</label>
                      {typeError && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 4 }}>{typeError}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addNewType() }}
                          style={{ ...inp, flex: 1 }} placeholder="Type name" />
                        <button type="button" onClick={addNewType} disabled={addingType}
                          style={{ padding: "9px 16px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {addingType ? "…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={lbl}>{req} Asset name</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="" />
                    </div>
                    <div>
                      <label style={lbl}>Description</label>
                      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={lbl}>Identifier</label>
                      <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} style={inp} placeholder="" />
                    </div>
                    <div>
                      <label style={lbl}>{req} Commission Date</label>
                      <input type="date" value={form.commissionDate} onChange={e => setForm(f => ({ ...f, commissionDate: e.target.value }))} style={inp} />
                    </div>
                  </div>
                </>
              )}

              {/* Rows 2 & 3 only shown when NOT add-new mode */}
              {!isAddNew && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={lbl}>Description</label>
                      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="" />
                    </div>
                    <div>
                      <label style={lbl}>Identifier</label>
                      <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} style={inp} placeholder="" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <label style={lbl}>{req} Commission Date</label>
                      <input type="date" value={form.commissionDate} onChange={e => setForm(f => ({ ...f, commissionDate: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>{req} Can this asset be assigned to multiple employees?</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                        {["Yes", "No"].map(opt => (
                          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="radio" name="multi" checked={form.isMultiAssignable === (opt === "Yes")} onChange={() => setForm(f => ({ ...f, isMultiAssignable: opt === "Yes", maxAssignees: "" }))}
                              style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                            {opt}
                          </label>
                        ))}
                      </div>
                      {form.isMultiAssignable && (
                        <div style={{ marginTop: 16 }}>
                          <label style={lbl}>{req} Maximum employees</label>
                          <input type="number" min={1} value={form.maxAssignees} onChange={e => setForm(f => ({ ...f, maxAssignees: e.target.value }))} style={inp} placeholder="" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Can this asset... shown in add-new mode at bottom */}
              {isAddNew && (
                <div>
                  <label style={lbl}>{req} Can this asset be assigned to multiple employees?</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                    {["Yes", "No"].map(opt => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input type="radio" name="multi" checked={form.isMultiAssignable === (opt === "Yes")} onChange={() => setForm(f => ({ ...f, isMultiAssignable: opt === "Yes", maxAssignees: "" }))}
                          style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {form.isMultiAssignable && (
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>{req} Maximum employees</label>
                      <input type="number" min={1} value={form.maxAssignees} onChange={e => setForm(f => ({ ...f, maxAssignees: e.target.value }))} style={{ ...inp, maxWidth: "50%" }} placeholder="" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={goToStep2}
              style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={cardStyle}>
            <div style={{ padding: "24px 28px 20px" }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Assign Employees</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Which employees would you like to assign to this asset? You can skip this step and assign later.</div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>
              <div style={{ marginBottom: 20 }}>
                <MultiSelectEmployees employees={employees} value={selectedEmpIds} onChange={handleEmpChange} />
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
                      {selectedEmpIds.map(id => {
                        const emp = employees.find(e => e.id === id)
                        if (!emp) return null
                        return (
                          <EmployeeAccordion key={id} name={`${emp.firstName} ${emp.lastName}`}
                            settings={perEmpSettings[id] ?? defaultSettings()}
                            onChange={s => setPerEmpSettings(prev => ({ ...prev, [id]: s }))} />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setStep(1)}
              style={{ padding: "10px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              Previous
            </button>
            <button onClick={finish} disabled={saving}
              style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creating…" : "Finish"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
