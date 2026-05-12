"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronDown, X, Search, Loader2, Info } from "lucide-react"

type Employee = { id: string; firstName: string; lastName: string; jobTitle?: string }

function TagPicker({ items, selected, onToggle, onAddAll, onRemoveAll }: {
  items: { id: string; label: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onAddAll: () => void
  onRemoveAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [])

  const selectedItems = items.filter(i => selected.includes(i.id))
  const filteredItems = items.filter(i => !selected.includes(i.id) && i.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ minHeight: 44, border: `1px solid ${open ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", background: "var(--background)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
      >
        {selectedItems.map(i => (
          <span key={i.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--muted)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
            {i.label}
            <button onClick={e => { e.stopPropagation(); onToggle(i.id) }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: "var(--muted-foreground)" }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <ChevronDown size={14} style={{ marginLeft: "auto", color: "var(--muted-foreground)", flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <input autoFocus value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value) }} onClick={e => e.stopPropagation()} placeholder="Search..."
              style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--foreground)" }} />
            <Search size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filteredItems.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>No results</div>
              : filteredItems.map(i => (
                <div key={i.id} onClick={e => { e.stopPropagation(); onToggle(i.id) }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <span style={{ flex: 1 }}>{i.label}</span>
                  {i.sub && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{i.sub}</span>}
                </div>
              ))
            }
          </div>
        </div>
      )}
      {/* Add/Remove all outside dropdown */}
      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
        <button onClick={onAddAll} style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>Add all</button>
        <button onClick={onRemoveAll} style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>Remove all</button>
      </div>
    </div>
  )
}

export default function EnrollEmployeesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [step, setStep] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [benefitName, setBenefitName] = useState("")

  // Cumulative deductions
  const [cumulative, setCumulative] = useState<Record<string, { deduction: string; contribution: string }>>({})
  const [bulkDed, setBulkDed] = useState("")
  const [bulkCon, setBulkCon] = useState("")

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/employees").then(r => r.json()),
      fetch(`/api/benefits/${id}`).then(r => r.json()),
    ]).then(([emp, ben]) => {
      setEmployees(emp.employees ?? [])
      setBenefitName(ben.benefit?.name ?? "")
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    setCumulative(prev => {
      const next = { ...prev }
      selected.forEach(eid => { if (!next[eid]) next[eid] = { deduction: "0", contribution: "0" } })
      return next
    })
  }, [selected])

  const toggle = (eid: string) => setSelected(prev => prev.includes(eid) ? prev.filter(i => i !== eid) : [...prev, eid])
  const items = employees.map(e => ({ id: e.id, label: `${e.firstName} ${e.lastName}`, sub: e.jobTitle }))

  const applyBulk = (ded: string, con: string) => {
    setCumulative(prev => {
      const next = { ...prev }
      selected.forEach(eid => { next[eid] = { deduction: ded !== "" ? ded : (prev[eid]?.deduction ?? "0"), contribution: con !== "" ? con : (prev[eid]?.contribution ?? "0") } })
      return next
    })
  }

  const next = () => {
    if (selected.length === 0) { setError("Please select at least one employee"); return }
    setError(""); setStep(2)
  }

  const submit = async () => {
    setSaving(true); setError("")
    const enrollments = selected.map(eid => {
      const c = cumulative[eid] ?? { deduction: "0", contribution: "0" }
      return { employeeId: eid, cumulativeDeduction: parseFloat(c.deduction) || 0, cumulativeContribution: parseFloat(c.contribution) || 0 }
    })
    const r = await fetch(`/api/benefits/${id}/enroll`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollments }),
    })
    setSaving(false)
    if (!r.ok) { setError("Failed to enroll employees"); return }
    router.push(`/admin/benefits/${id}`)
  }

  const selectedEmployees = employees.filter(e => selected.includes(e.id))

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/benefits")} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
          Benefits
        </button>
        <span style={{ color: "var(--muted-foreground)" }}>›</span>
        <span style={{ color: "var(--muted-foreground)" }}>Enroll Employees</span>
      </div>

      {step === 1 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>Enroll employees in benefit</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Enroll employees</p>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Employees</label>
            </div>
            <TagPicker
              items={items}
              selected={selected}
              onToggle={toggle}
              onAddAll={() => setSelected(items.map(i => i.id))}
              onRemoveAll={() => setSelected([])}
            />
            {error && <div style={{ marginTop: 12, color: "var(--accent)", fontSize: 13 }}>{error}</div>}
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={next} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Cummulative deduction/contribution</h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                If your employees have existing deductions and/or contributions that you want to track, please enter the totals here.
              </p>
            </div>
            <div style={{ padding: 24 }}>
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
                      {(["deduction", "contribution"] as const).map(k => (
                        <div key={k} style={{ padding: "8px 10px", borderLeft: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)" }}>
                            <span style={{ padding: "0 8px", fontSize: 12, color: "var(--muted-foreground)" }}>₦</span>
                            <input value={c[k]} onChange={ev => setCumulative(prev => ({ ...prev, [e.id]: { ...prev[e.id], [k]: ev.target.value } }))}
                              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "8px 8px 8px 0", background: "transparent" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {error && <div style={{ marginBottom: 12, color: "var(--accent)", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ padding: "9px 20px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              Previous
            </button>
            <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />Saving…</> : "Next"}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
