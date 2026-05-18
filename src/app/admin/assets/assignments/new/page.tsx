"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, ChevronDown, Info } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--foreground)" }
const req = <span style={{ color: "var(--danger)" }}>*</span>

const INTERVALS = ["Months", "Years", "Days", "Weeks"]

function SearchDropdown({ options, value, onChange, placeholder }: {
  options: { id: string; label: string; sub?: string }[]
  value: string
  onChange: (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()) || (o.sub ?? "").toLowerCase().includes(q.toLowerCase()))

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
        <span style={{ color: selected ? "var(--foreground)" : "var(--muted-foreground)" }}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
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
                style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", background: value === o.id ? "var(--muted)" : "transparent" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === o.id ? "var(--muted)" : "transparent"}>
                <div style={{ color: "var(--foreground)" }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{o.sub}</div>}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function IntervalDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: value ? "var(--foreground)" : "var(--muted-foreground)" }}>{value || "Interval"}</span>
        <ChevronDown size={13} style={{ color: "var(--muted-foreground)" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "4px 0" }}>
          {INTERVALS.map(iv => (
            <div key={iv} onClick={() => { onChange(iv); setOpen(false) }}
              style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: value === iv ? "var(--muted)" : "transparent", color: "var(--foreground)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === iv ? "var(--muted)" : "transparent"}>
              {iv}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssignAssetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedEmployeeId = searchParams.get("employeeId") ?? ""
  const [employees, setEmployees] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [form, setForm] = useState({
    employeeId: preselectedEmployeeId, assetId: "", assignedOn: "",
    hasTenure: false as boolean | null,
    period: "", interval: "", note: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
    fetch("/api/assets").then(r => r.json()).then(d => setAssets(d.assets ?? []))
  }, [])

  const empOptions = employees.map(e => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))
  const assetOptions = assets.map(a => ({ id: a.id, label: a.name, sub: a.identifier ?? undefined }))

  const finish = async () => {
    if (!form.employeeId) { setError("Please select an employee"); return }
    if (!form.assetId) { setError("Please select an asset"); return }
    if (!form.assignedOn) { setError("Assignment date is required"); return }
    if (form.hasTenure === null) { setError("Please specify if this has a tenure"); return }
    if (form.hasTenure && !form.period) { setError("Period is required when tenure is set"); return }
    if (form.hasTenure && !form.interval) { setError("Interval is required when tenure is set"); return }

    setError(""); setSaving(true)
    const r = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to assign asset"); return }
    router.push(`/admin/assets/assignments/${form.employeeId}`)
  }

  return (
    <div>
      {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "24px 28px 20px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Assign employee asset</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>When you assign asset to an employee, we'll email the employee to let them know you've assigned an asset to them.</div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>

          {/* Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={lbl}>{req} Select employee</label>
              <SearchDropdown options={empOptions} value={form.employeeId} onChange={id => setForm(f => ({ ...f, employeeId: id }))} placeholder="Please select" />
            </div>
            <div>
              <label style={lbl}>{req} Which asset is it?</label>
              <SearchDropdown options={assetOptions} value={form.assetId} onChange={id => setForm(f => ({ ...f, assetId: id }))} placeholder="Please select" />
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={lbl}>{req} Assignment Date</label>
              <input type="date" value={form.assignedOn} onChange={e => setForm(f => ({ ...f, assignedOn: e.target.value }))}
                style={inp} placeholder="Select date" />
            </div>
            <div>
              <label style={lbl}>{req} Does it have a tenure?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {["Yes", "No"].map(opt => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="tenure" checked={form.hasTenure === (opt === "Yes")} onChange={() => setForm(f => ({ ...f, hasTenure: opt === "Yes", period: "", interval: "" }))}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)" }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3 — only when Yes */}
          {form.hasTenure && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {req} Period <Info size={14} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <input type="number" min={1} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={inp} placeholder="" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {req} Interval <Info size={14} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <IntervalDropdown value={form.interval} onChange={v => setForm(f => ({ ...f, interval: v }))} />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={lbl}>Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={4}
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
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
