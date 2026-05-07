"use client"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowRight, Check, Loader2, X } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }

const APPROVER_ROLES = [
  { key: "STAFF",        label: "Relief Officer" },
  { key: "PROJECT_LEAD", label: "Project Lead" },
  { key: "ADMIN",        label: "HR Admin" },
  { key: "ADMIN",        label: "Admin" },
]

const DEFAULT_CATEGORIES = [
  { id: "leave", name: "Leave", description: "Leave request approval chain", isSystem: true,
    chain: [
      { role: "STAFF", label: "Relief Officer", deadlineHours: 24 },
      { role: "PROJECT_LEAD", label: "Project Lead", deadlineHours: 24 },
      { role: "ADMIN", label: "HR Admin", deadlineHours: 72 },
    ],
  },
  { id: "performance", name: "Performance Reviews", description: "Appraisal sign-off chain", isSystem: true,
    chain: [
      { role: "PROJECT_LEAD", label: "Manager", deadlineHours: 72 },
      { role: "ADMIN", label: "HR Admin", deadlineHours: 72 },
    ],
  },
  { id: "profile_changes", name: "Employee Profile Changes", description: "Profile update requests", isSystem: true,
    chain: [{ role: "ADMIN", label: "HR Admin", deadlineHours: 48 }],
  },
]

function Section({ title, description, children, defaultOpen = false }: { title: string; description: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{description}</div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  )
}

export default function ApprovalWorkflowsSettingsPage() {
  const [cats, setCats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: "", description: "" })
  const [addStep, setAddStep] = useState<{ catIdx: number; type: "role" | "employee"; role: string; employeeId: string; deadlineHours: number } | null>(null)
  const [empList, setEmpList] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    fetch("/api/settings/workflow").then(r => r.json()).then(d => {
      setCats(d.workflow?.categories ?? DEFAULT_CATEGORIES)
      setLoading(false)
    }).catch(() => { setCats(DEFAULT_CATEGORIES); setLoading(false) })
    fetch("/api/employees").then(r => r.ok ? r.json() : null).then(d => d && setEmpList(d.employees ?? [])).catch(() => {})
  }, [])

  const saveAll = async () => {
    setSaving(true)
    await fetch("/api/settings/workflow", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: cats }) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const addStepToChain = (catIdx: number) => {
    if (!addStep) return
    if (addStep.type === "role") {
      const roleInfo = APPROVER_ROLES.find(r => r.key === addStep.role)
      if (!roleInfo) return
      setCats(c => c.map((cat, i) => i !== catIdx ? cat : { ...cat, chain: [...cat.chain, { type: "role", role: addStep.role, label: roleInfo.label, deadlineHours: addStep.deadlineHours }] }))
    } else {
      const emp = empList.find(e => e.id === addStep.employeeId)
      if (!emp) return
      setCats(c => c.map((cat, i) => i !== catIdx ? cat : { ...cat, chain: [...cat.chain, { type: "employee", employeeId: addStep.employeeId, label: `${emp.firstName} ${emp.lastName}`, jobTitle: emp.jobTitle, deadlineHours: addStep.deadlineHours }] }))
    }
    setAddStep(null)
  }

  const removeStep = (catIdx: number, stepIdx: number) => setCats(c => c.map((cat, i) => i !== catIdx ? cat : { ...cat, chain: cat.chain.filter((_: any, j: number) => j !== stepIdx) }))

  const moveStep = (catIdx: number, stepIdx: number, dir: -1 | 1) => setCats(c => c.map((cat, i) => {
    if (i !== catIdx) return cat
    const chain = [...cat.chain]; const t = stepIdx + dir
    if (t < 0 || t >= chain.length) return cat
    ;[chain[stepIdx], chain[t]] = [chain[t], chain[stepIdx]]
    return { ...cat, chain }
  }))

  const setDeadline = (catIdx: number, stepIdx: number, hours: number) => setCats(c => c.map((cat, i) => i !== catIdx ? cat : { ...cat, chain: cat.chain.map((s: any, j: number) => j !== stepIdx ? s : { ...s, deadlineHours: hours }) }))

  const deleteCat = (catId: string) => { if (!confirm("Delete this workflow category?")) return; setCats(c => c.filter(cat => cat.id !== catId)) }

  const addCategory = () => {
    if (!newCatForm.name.trim()) return
    setCats(c => [...c, { id: `custom_${Date.now()}`, name: newCatForm.name.trim(), description: newCatForm.description.trim(), isSystem: false, chain: [] }])
    setNewCatOpen(false); setNewCatForm({ name: "", description: "" })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section title="Approval Workflows" description="Configure role-based approval chains for leave requests, performance reviews, profile changes, and more." defaultOpen>
        <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--success)" }}><Check size={13} /> Saved</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setNewCatOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
              <Plus size={13} /> New Category
            </button>
            <button onClick={saveAll} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white" }}>
              {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Check size={13} /> Save All</>}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
            <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /><span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : (
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {cats.map((cat, catIdx) => (
              <div key={cat.id} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{cat.name}</span>
                    {cat.isSystem && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>System</span>}
                    {cat.description && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{cat.description}</div>}
                  </div>
                  {!cat.isSystem && (
                    <button onClick={() => deleteCat(cat.id)} style={{ background: "var(--danger-bg)", border: "none", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "var(--danger)" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div style={{ padding: "14px 16px" }}>
                  {cat.chain.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", marginBottom: 10 }}>No steps yet — add approver roles below.</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      {cat.chain.map((step: any, stepIdx: number) => (
                        <div key={stepIdx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", minWidth: 110 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>{step.label}</span>
                            <select value={step.deadlineHours} onChange={e => setDeadline(catIdx, stepIdx, Number(e.target.value))} style={{ fontSize: 10, padding: "2px 4px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--background)", color: "var(--muted-foreground)", marginTop: 2 }}>
                              {[4, 8, 12, 24, 48, 72, 96].map(h => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24}d`}</option>)}
                            </select>
                            <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                              <button onClick={() => moveStep(catIdx, stepIdx, -1)} disabled={stepIdx === 0} style={{ background: "none", border: "none", cursor: stepIdx === 0 ? "default" : "pointer", color: "var(--muted-foreground)", padding: "1px 3px", opacity: stepIdx === 0 ? 0.3 : 1 }}><ChevronUp size={11} /></button>
                              <button onClick={() => moveStep(catIdx, stepIdx, 1)} disabled={stepIdx === cat.chain.length - 1} style={{ background: "none", border: "none", cursor: stepIdx === cat.chain.length - 1 ? "default" : "pointer", color: "var(--muted-foreground)", padding: "1px 3px", opacity: stepIdx === cat.chain.length - 1 ? 0.3 : 1 }}><ChevronDown size={11} /></button>
                              <button onClick={() => removeStep(catIdx, stepIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "1px 3px" }}><X size={11} /></button>
                            </div>
                          </div>
                          {stepIdx < cat.chain.length - 1 && <ArrowRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {addStep?.catIdx === catIdx ? (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: 8, background: "var(--muted)" }}>
                      <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                        {(["role", "employee"] as const).map(t => (
                          <button key={t} onClick={() => setAddStep(s => s ? { ...s, type: t, role: "", employeeId: "" } : null)} style={{ padding: "5px 11px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: addStep.type === t ? "var(--primary)" : "var(--background)", color: addStep.type === t ? "white" : "var(--muted-foreground)", textTransform: "capitalize" }}>
                            {t === "role" ? "Role" : "Person"}
                          </button>
                        ))}
                      </div>
                      {addStep.type === "role" ? (
                        <select value={addStep.role} onChange={e => setAddStep(s => s ? { ...s, role: e.target.value } : null)} style={{ ...inp, flex: 1, minWidth: 160, maxWidth: 220, fontSize: 12, padding: "6px 10px" }}>
                          <option value="">Select role…</option>
                          {APPROVER_ROLES.map((r, i) => <option key={i} value={r.key}>{r.label}</option>)}
                        </select>
                      ) : (
                        <select value={addStep.employeeId} onChange={e => setAddStep(s => s ? { ...s, employeeId: e.target.value } : null)} style={{ ...inp, flex: 1, minWidth: 160, maxWidth: 260, fontSize: 12, padding: "6px 10px" }}>
                          <option value="">Select employee…</option>
                          {empList.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>)}
                        </select>
                      )}
                      <select value={addStep.deadlineHours} onChange={e => setAddStep(s => s ? { ...s, deadlineHours: Number(e.target.value) } : null)} style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, background: "var(--background)", color: "var(--foreground)" }}>
                        {[4, 8, 12, 24, 48, 72, 96].map(h => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24}d`}</option>)}
                      </select>
                      <button onClick={() => addStepToChain(catIdx)} disabled={addStep.type === "role" ? !addStep.role : !addStep.employeeId} style={{ padding: "6px 14px", background: "var(--primary)", color: "white", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (addStep.type === "role" ? !addStep.role : !addStep.employeeId) ? 0.5 : 1 }}>Add</button>
                      <button onClick={() => setAddStep(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddStep({ catIdx, type: "role", role: "", employeeId: "", deadlineHours: 24 })} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px dashed var(--primary)", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>
                      <Plus size={12} /> Add Step
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* New Category Modal */}
      {newCatOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>New Workflow Category</div>
              <button onClick={() => setNewCatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={lbl}>Category Name *</label><input value={newCatForm.name} onChange={e => setNewCatForm(f => ({...f, name: e.target.value}))} style={inp} placeholder="e.g. Document Sign-off" /></div>
              <div><label style={lbl}>Description</label><input value={newCatForm.description} onChange={e => setNewCatForm(f => ({...f, description: e.target.value}))} style={inp} placeholder="Brief description" /></div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setNewCatOpen(false)} style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
              <button onClick={addCategory} disabled={!newCatForm.name.trim()} style={{ padding: "7px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !newCatForm.name.trim() ? 0.5 : 1 }}>Create</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
