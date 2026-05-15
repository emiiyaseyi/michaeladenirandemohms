"use client"
import { useState, useEffect, useRef } from "react"
import { Search, Plus, MoreHorizontal, ChevronDown, ChevronUp, X, Loader2, Info } from "lucide-react"

// ─── Category Select ─────────────────────────────────────────────────────────
function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [categories, setCategories] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/benefits/categories")
      .then(r => r.json())
      .then(d => setCategories((d.categories ?? []).map((c: any) => c.name)))
  }, [])

  const add = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const r = await fetch("/api/benefits/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const d = await r.json()
    setSaving(false)
    if (r.ok) {
      const name = d.category.name
      setCategories(prev => [...prev, name].sort())
      onChange(name)
      setNewName("")
      setAdding(false)
    }
  }

  const fi: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
  }

  return (
    <div>
      <select value={value} onChange={e => onChange(e.target.value)} style={fi}>
        <option value="">— Select category —</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          + Add category
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setAdding(false); setNewName("") } }}
            placeholder="Category name"
            style={{ ...fi, flex: 1, padding: "7px 10px" }}
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !newName.trim()}
            style={{ padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName("") }}
            style={{ padding: "7px 10px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--foreground)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

type Benefit = {
  id: string; name: string; category: string; status: string; enrollType: string
  _count: { enrollments: number }
}

type Employee = { id: string; firstName: string; lastName: string; jobTitle?: string }
type Group    = { id: string; name: string }

// ─── Multi-select tag picker ─────────────────────────────────────────────────
function TagPicker({ label, items, selected, onToggle, onAddAll, onRemoveAll, search, onSearch }: {
  label: string
  items: { id: string; label: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onAddAll: () => void
  onRemoveAll: () => void
  search: string
  onSearch: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const selectedItems = items.filter(i => selected.includes(i.id))
  const filteredItems = items.filter(i =>
    !selected.includes(i.id) &&
    i.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: "var(--accent)" }}>* </span>{label}
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onAddAll} style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>Add all</button>
          <button onClick={onRemoveAll} style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>Remove all</button>
        </div>
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            minHeight: 40, border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`,
            borderRadius: 8, padding: "6px 10px", cursor: "pointer",
            background: "var(--background)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          }}
        >
          {selectedItems.map(i => (
            <span key={i.id} style={{
              display: "flex", alignItems: "center", gap: 4, background: "var(--muted)",
              borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500,
            }}>
              {i.label}
              <button onClick={e => { e.stopPropagation(); onToggle(i.id) }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: "var(--muted-foreground)" }}>
                <X size={11} />
              </button>
            </span>
          ))}
          <ChevronDown size={14} style={{ marginLeft: "auto", color: "var(--muted-foreground)", flexShrink: 0 }} />
        </div>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden",
          }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
              <input
                autoFocus
                value={search}
                onChange={e => { e.stopPropagation(); onSearch(e.target.value) }}
                onClick={e => e.stopPropagation()}
                placeholder="Search..."
                style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--foreground)" }}
              />
              <Search size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {filteredItems.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>No results</div>
              ) : filteredItems.map(i => (
                <div
                  key={i.id}
                  onClick={e => { e.stopPropagation(); onToggle(i.id) }}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <span style={{ flex: 1 }}>{i.label}</span>
                  {i.sub && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{i.sub}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Deduction Card ──────────────────────────────────────────────────────────
type DeductSettings = { empType: string; empVal: string; coType: string; coVal: string }

function DeductionCard({ title, open, onToggle, settings, onChange }: {
  title: string; open: boolean; onToggle: () => void
  settings: DeductSettings; onChange: (v: DeductSettings) => void
}) {
  const fi: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
  }
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--muted)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: 16 }}>
          {(["emp", "co"] as const).map(kind => {
            const isEmp = kind === "emp"
            const typeKey = isEmp ? "empType" : "coType"
            const valKey  = isEmp ? "empVal"  : "coVal"
            const lbl     = isEmp ? "Employee deduction (Annual)" : "Company contribution (Annual)"
            return (
              <div key={kind} style={{ marginBottom: isEmp ? 16 : 0 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <span style={{ color: "var(--accent)" }}>*</span> {lbl}
                  <span title="Amount can either be a percentage of gross earnings or a fixed amount." style={{ color: "var(--muted-foreground)", cursor: "help", display: "flex" }}>
                    <Info size={13} />
                  </span>
                </label>
                {["PERCENTAGE", "AMOUNT"].map(t => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="radio" checked={settings[typeKey] === t} onChange={() => onChange({ ...settings, [typeKey]: t })} style={{ accentColor: "var(--primary)" }} />
                    {t === "PERCENTAGE" ? "Percentage of gross earnings" : "Amount"}
                  </label>
                ))}
                <div style={{ position: "relative" }}>
                  <input
                    value={settings[valKey]}
                    onChange={e => onChange({ ...settings, [valKey]: e.target.value })}
                    style={{ ...fi, paddingRight: settings[typeKey] === "PERCENTAGE" ? 32 : 12 }}
                    placeholder="0"
                  />
                  {settings[typeKey] === "PERCENTAGE" && (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--muted-foreground)" }}>%</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Add Benefit Drawer ──────────────────────────────────────────────────────
function AddBenefitDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [category, setCategory] = useState("")
  const [enrollType, setEnrollType] = useState<"EMPLOYEES" | "CUSTOM_GROUPS">("EMPLOYEES")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickerSearch, setPickerSearch] = useState("")
  const [useSame, setUseSame] = useState(true)
  const [sameSettings, setSameSettings] = useState<DeductSettings>({ empType: "AMOUNT", empVal: "", coType: "AMOUNT", coVal: "" })
  const [perSettings, setPerSettings] = useState<Record<string, DeductSettings>>({})
  const [deductionOpen, setDeductionOpen] = useState(true)
  const [cumulative, setCumulative] = useState<Record<string, { deduction: string; contribution: string }>>({})
  const [bulkDed, setBulkDed] = useState("")
  const [bulkCon, setBulkCon] = useState("")

  useEffect(() => {
    if (step === 2) {
      fetch("/api/employees")
        .then(r => r.json()).then(d => setEmployees(d.employees ?? []))
      fetch("/api/people/custom-groups")
        .then(r => r.json()).then(d => setGroups(d.groups ?? []))
    }
  }, [step])

  useEffect(() => {
    setPerSettings(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => { if (!next[id]) next[id] = { empType: "AMOUNT", empVal: "", coType: "AMOUNT", coVal: "" } })
      return next
    })
    setCumulative(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => { if (!next[id]) next[id] = { deduction: "0", contribution: "0" } })
      return next
    })
  }, [selectedIds])

  const enrolleeItems = enrollType === "EMPLOYEES"
    ? employees.map(e => ({ id: e.id, label: `${e.firstName} ${e.lastName}`, sub: e.jobTitle }))
    : groups.map(g => ({ id: g.id, label: g.name }))

  const toggle = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const applyBulk = (ded: string, con: string) => {
    setCumulative(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => { next[id] = { deduction: ded !== "" ? ded : (prev[id]?.deduction ?? "0"), contribution: con !== "" ? con : (prev[id]?.contribution ?? "0") } })
      return next
    })
  }

  const go = (n: number) => {
    setError("")
    if (step === 1 && n > 0) {
      if (!name.trim()) { setError("Benefit name is required"); return }
      if (!effectiveDate) { setError("Effective date is required"); return }
    }
    if (step === 2 && n > 0) {
      if (selectedIds.length === 0) { setError("Please enroll at least one item"); return }
    }
    setStep(s => s + n)
  }

  const submit = async () => {
    setSaving(true); setError("")
    try {
      const r1 = await fetch("/api/benefits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, effectiveDate, category, enrollType }),
      })
      const d1 = await r1.json()
      if (!r1.ok) { setError(d1.error ?? "Failed to create"); setSaving(false); return }

      const benefitId = d1.benefit.id
      const enrollments = selectedIds.map(id => {
        const s = useSame ? sameSettings : (perSettings[id] ?? sameSettings)
        const c = cumulative[id] ?? { deduction: "0", contribution: "0" }
        return {
          employeeId: id,
          employeeDeductionType: s.empType,
          employeeDeductionValue: parseFloat(s.empVal) || 0,
          companyContributionType: s.coType,
          companyContributionValue: parseFloat(s.coVal) || 0,
          cumulativeDeduction: parseFloat(c.deduction) || 0,
          cumulativeContribution: parseFloat(c.contribution) || 0,
        }
      })

      if (enrollments.length > 0) {
        await fetch(`/api/benefits/${benefitId}/enroll`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollments }),
        })
      }
      onSaved()
    } catch { setError("Something went wrong"); setSaving(false) }
  }

  const selectedEmployees = enrollType === "EMPLOYEES" ? employees.filter(e => selectedIds.includes(e.id)) : []
  const fi: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", background: "rgba(0,0,0,0.4)" }}>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{ width: 580, background: "var(--card)", height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add benefit</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Step {step} of 4</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexShrink: 0 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? "var(--primary)" : "var(--border)" }} />
          ))}
        </div>

        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ color: "var(--accent)" }}>*</span> Benefit name
                  <span title="Display name for this benefit" style={{ color: "var(--muted-foreground)", cursor: "help", display: "flex" }}><Info size={13} /></span>
                </label>
                <input value={name} onChange={e => setName(e.target.value)} style={fi} placeholder="e.g., Health Insurance" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Category</label>
                <CategorySelect value={category} onChange={setCategory} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ color: "var(--accent)" }}>*</span> Effective date
                </label>
                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={fi} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "block" }}>
                  <span style={{ color: "var(--accent)" }}>*</span> Choose a type
                </label>
                {[{ v: "EMPLOYEES", l: "Employees" }, { v: "CUSTOM_GROUPS", l: "Custom Groups" }].map(({ v, l }) => (
                  <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer", fontSize: 13 }}>
                    <input type="radio" checked={enrollType === v} onChange={() => { setEnrollType(v as any); setSelectedIds([]) }} style={{ accentColor: "var(--primary)" }} />
                    {l}
                  </label>
                ))}
              </div>

              <TagPicker
                label={enrollType === "EMPLOYEES" ? "Enroll employees" : "Enroll groups"}
                items={enrolleeItems}
                selected={selectedIds}
                onToggle={toggle}
                onAddAll={() => setSelectedIds(enrolleeItems.map(i => i.id))}
                onRemoveAll={() => setSelectedIds([])}
                search={pickerSearch}
                onSearch={setPickerSearch}
              />

              {selectedIds.length > 0 && enrollType === "EMPLOYEES" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={useSame} onChange={e => setUseSame(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
                  Use same setting for all selected employees
                </label>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              {useSame ? (
                <DeductionCard
                  title="All selected employees"
                  open={deductionOpen}
                  onToggle={() => setDeductionOpen(o => !o)}
                  settings={sameSettings}
                  onChange={setSameSettings}
                />
              ) : selectedEmployees.map(e => (
                <DeductionCard
                  key={e.id}
                  title={`${e.firstName} ${e.lastName}`}
                  open={true}
                  onToggle={() => {}}
                  settings={perSettings[e.id] ?? { empType: "AMOUNT", empVal: "", coType: "AMOUNT", coVal: "" }}
                  onChange={v => setPerSettings(prev => ({ ...prev, [e.id]: v }))}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Cummulative Deduction/contribution</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
                If your employees have existing deductions and/or contributions that you want to track, please enter the totals here.
              </div>
              <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <Info size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Tip: Use the textboxes in the table header to enter same amounts for all employees at once.
                </div>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                  <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600 }}>Employee</div>
                  <div style={{ padding: "8px 10px", borderLeft: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Deduction</div>
                    <input placeholder="0" value={bulkDed}
                      onChange={e => { setBulkDed(e.target.value); applyBulk(e.target.value, bulkCon) }}
                      style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", outline: "none" }}
                    />
                  </div>
                  <div style={{ padding: "8px 10px", borderLeft: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Contribution</div>
                    <input placeholder="0" value={bulkCon}
                      onChange={e => { setBulkCon(e.target.value); applyBulk(bulkDed, e.target.value) }}
                      style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", outline: "none" }}
                    />
                  </div>
                </div>
                {selectedEmployees.map(e => {
                  const c = cumulative[e.id] ?? { deduction: "0", contribution: "0" }
                  return (
                    <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ padding: "12px 14px", fontSize: 13 }}>{e.firstName} {e.lastName}</div>
                      {["deduction", "contribution"].map(k => (
                        <div key={k} style={{ padding: "8px 10px", borderLeft: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)" }}>
                            <span style={{ padding: "0 8px", fontSize: 12, color: "var(--muted-foreground)" }}>₦</span>
                            <input
                              value={(c as any)[k]}
                              onChange={ev => setCumulative(prev => ({ ...prev, [e.id]: { ...prev[e.id], [k]: ev.target.value } }))}
                              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "8px 8px 8px 0", background: "transparent" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, background: "var(--danger-bg)", border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--accent)" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          {step > 1 && (
            <button onClick={() => go(-1)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              Previous
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => go(1)} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Next
            </button>
          ) : (
            <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />Saving…</> : "Save"}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Three-dot Menu ──────────────────────────────────────────────────────────
function BenefitMenu({ onView, onEnroll, onDelete }: { onView: () => void; onEnroll: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, minWidth: 160, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          {[
            { label: "View", action: onView },
            { label: "Enroll employees", action: onEnroll },
            { label: "Delete", action: onDelete, danger: true },
          ].map(item => (
            <button key={item.label} onClick={() => { setOpen(false); item.action() }} style={{ display: "block", width: "100%", padding: "10px 14px", fontSize: 13, textAlign: "left", background: "none", border: "none", cursor: "pointer", color: item.danger ? "var(--accent)" : "var(--foreground)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async (q = "") => {
    setLoading(true)
    const r = await fetch(`/api/benefits?search=${encodeURIComponent(q)}`)
    const d = await r.json()
    setBenefits(d.benefits ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const deleteBenefit = async (id: string) => {
    if (!confirm("Delete this benefit? This will remove all enrollments.")) return
    setDeleting(id)
    await fetch(`/api/benefits/${id}`, { method: "DELETE" })
    setDeleting(null)
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Employee Benefits</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Manage benefit plans and employee enrolments.</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", outline: "none" }}
          />
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          <Plus size={14} /> Add benefit
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Benefit", "Category", "Enrolled", "Status", ""].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center" }}>
                <Loader2 size={20} style={{ animation: "spin .8s linear infinite", color: "var(--muted-foreground)" }} />
              </td></tr>
            ) : benefits.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No benefits found</td></tr>
            ) : benefits.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 500 }}>{b.name}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{b.category}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>
                  {b._count.enrollments} {b._count.enrollments === 1 ? "employee" : "employees"} enrolled
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: b.status === "ACTIVE" ? "var(--success-bg)" : "var(--muted)", color: b.status === "ACTIVE" ? "var(--success)" : "var(--muted-foreground)" }}>
                    {b.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  {deleting === b.id
                    ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />
                    : <BenefitMenu onView={() => window.location.href = `/admin/benefits/${b.id}`} onEnroll={() => window.location.href = `/admin/benefits/${b.id}/enroll`} onDelete={() => deleteBenefit(b.id)} />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddBenefitDrawer onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
