"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }
const req = <span style={{ color: "var(--danger)" }}>*</span>

const SYSTEM_ACTIONS = ["Deduction", "Demotion", "Redeployment", "Suspension", "Termination", "Probation"]

function SearchDropdown({ options, value, onChange, placeholder }: {
  options: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o => o.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: selected ? "var(--foreground)" : "var(--muted-foreground)" }}>{selected?.name ?? placeholder}</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              style={{ width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map(o => (
              <div key={o.id} onClick={() => { onChange(o.id); setOpen(false); setQ("") }}
                style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", background: value === o.id ? "var(--muted)" : "transparent", color: "var(--foreground)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === o.id ? "var(--muted)" : "transparent"}>
                {o.name}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "16px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewPolicyPage() {
  const router = useRouter()
  const [violationTypes, setViolationTypes] = useState<{ id: string; name: string }[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({ name: "", violationTypeId: "", systemAction: "", hasThreshold: false, violationCount: "", description: "" })
  const [exemptedIds, setExemptedIds] = useState<string[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/disciplinary/violation-types").then(r => r.json()).then(d => setViolationTypes(d.types ?? []))
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
  }, [])

  const filteredEmps = employees.filter(e =>
    !empSearch || `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase())
  )

  const toggleExemption = (id: string) =>
    setExemptedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const addAll = () => setExemptedIds(filteredEmps.map(e => e.id))
  const removeAll = () => setExemptedIds([])

  const submit = async () => {
    if (!form.name.trim()) { setError("Policy name is required"); return }
    if (!form.violationTypeId) { setError("Violation type is required"); return }
    setError(""); setSaving(true)
    const r = await fetch("/api/disciplinary/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, exemptedEmployeeIds: exemptedIds }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to create policy"); return }
    router.push(`/admin/disciplinary/policies/${d.policy.id}`)
  }

  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }
  const cardHead: React.CSSProperties = { padding: "20px 28px 16px", borderBottom: "1px solid var(--border)" }
  const cardBody: React.CSSProperties = { padding: "24px 28px" }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/disciplinary/policies")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--foreground)", fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={14} /> Policies
        </button>
        <span style={{ color: "var(--muted-foreground)" }}>›</span>
        <span style={{ color: "var(--muted-foreground)" }}>Record new policy</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 1.0 Policy */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>1.0 Policy</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Enter the policy name and set the default values (these can be changed later).</div>
          </div>
          <div style={cardBody}>
            {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={lbl}>{req} Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Name" />
              </div>
              <div>
                <label style={lbl}>{req} Violation type</label>
                <SearchDropdown options={violationTypes} value={form.violationTypeId} onChange={id => setForm(f => ({ ...f, violationTypeId: id }))} placeholder="Select violation type" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={lbl}>{req} Is there a threshold before system actions are triggered?</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {["Yes", "No"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="threshold" checked={form.hasThreshold === (opt === "Yes")} onChange={() => setForm(f => ({ ...f, hasThreshold: opt === "Yes", violationCount: "" }))}
                        style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                      {opt}
                    </label>
                  ))}
                </div>
                {form.hasThreshold && (
                  <div style={{ marginTop: 16 }}>
                    <label style={lbl}>{req} Violation Count</label>
                    <input type="number" min={1} value={form.violationCount} onChange={e => setForm(f => ({ ...f, violationCount: e.target.value }))} style={inp} placeholder="e.g. 3" />
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>{req} System action</label>
                <SearchDropdown
                  options={SYSTEM_ACTIONS.map(a => ({ id: a, name: a }))}
                  value={form.systemAction}
                  onChange={id => setForm(f => ({ ...f, systemAction: id }))}
                  placeholder="Select system action" />
              </div>
            </div>

            <div>
              <label style={lbl}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={4}
                style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>
        </div>

        {/* 2.0 Exemptions */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>2.0 Exemptions</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Which employees should be exempted from policy?</div>
          </div>
          <div style={{ ...cardBody, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 10 }}>
              <button onClick={addAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--primary)", padding: 0 }}>Add all</button>
              <button onClick={removeAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--primary)", padding: 0 }}>Remove all</button>
            </div>
            <div style={{ position: "relative", marginBottom: 4 }}>
              <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder=""
                style={{ ...inp, paddingRight: 36 }} />
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 280, overflowY: "auto" }}>
              {filteredEmps.map(emp => {
                const checked = exemptedIds.includes(emp.id)
                return (
                  <div key={emp.id} onClick={() => toggleExemption(emp.id)}
                    style={{ padding: "12px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", background: checked ? "var(--muted)" : "transparent" }}
                    onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                    onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                    <input type="checkbox" checked={checked} onChange={() => {}} style={{ width: 14, height: 14, accentColor: "var(--primary)", flexShrink: 0 }} />
                    {emp.firstName} {emp.lastName}
                  </div>
                )
              })}
              {filteredEmps.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No employees found.</div>}
            </div>
            {exemptedIds.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted-foreground)" }}>{exemptedIds.length} employee{exemptedIds.length !== 1 ? "s" : ""} selected for exemption</div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => router.push("/admin/disciplinary/policies")}
            style={{ padding: "10px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ padding: "10px 28px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Creating…" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  )
}
