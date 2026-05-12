"use client"
import { useState, useEffect, useRef } from "react"
import { Info, ArrowRight, Loader2, Check, X, ChevronDown } from "lucide-react"

const AVAILABLE_ROLES = [
  "Project Lead",
  "HR Admin",
  "Payroll Admin",
  "Primary Admin",
  "Secondary Admin",
]

const DEFAULT_SECTIONS = [
  {
    id: "hr",
    name: "HR",
    categories: [
      { id: "people", name: "People", description: "Approval workflow for HR-related employee requests e.g document, redeployment and exit", chain: [] as string[] },
      { id: "time_leave", name: "Time Tracking and Leave", description: "Approval workflow for employee hours and leave requests", chain: ["Project Lead", "HR Admin"] },
      { id: "loans_salary_tax", name: "Loans, Salary Advance and Tax Relief", description: "Approval workflow for loans, salary advance and tax-relief requests", chain: ["Manager", "HR Admin"] },
    ],
  },
  {
    id: "payroll",
    name: "Payroll",
    categories: [
      { id: "payrolls_regular", name: "Payrolls and Regular Payment Schedules", description: "Approval workflow for regular and custom payroll", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
      { id: "expense_claims", name: "Expense Claims", description: "Approval workflow for employee expense claims", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
      { id: "payroll_changes", name: "Payroll Changes", description: "Approval workflow for payroll changes e.g bonuses, deductions and payables", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
      { id: "custom_payment", name: "Custom Payment Schedules", description: "Approval workflow for custom payment schedules", chain: [] as string[] },
    ],
  },
]

type Category = { id: string; name: string; description: string; chain: string[] }
type Section = { id: string; name: string; categories: Category[] }

export default function ApprovalWorkflowsSettingsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editModal, setEditModal] = useState<{ secIdx: number; catIdx: number } | null>(null)
  const [editChain, setEditChain] = useState<string[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/settings/workflow")
      .then(r => r.json())
      .then(d => {
        setSections(d.workflow?.sections ?? DEFAULT_SECTIONS)
        setLoading(false)
      })
      .catch(() => { setSections(DEFAULT_SECTIONS); setLoading(false) })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const saveAll = async () => {
    setSaving(true)
    await fetch("/api/settings/workflow", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const openEdit = (secIdx: number, catIdx: number) => {
    setEditChain([...sections[secIdx].categories[catIdx].chain])
    setEditModal({ secIdx, catIdx })
    setDropdownOpen(false)
  }

  const saveEdit = () => {
    if (!editModal) return
    setSections(s => s.map((sec, si) => si !== editModal.secIdx ? sec : {
      ...sec,
      categories: sec.categories.map((cat, ci) => ci !== editModal.catIdx ? cat : { ...cat, chain: editChain }),
    }))
    setEditModal(null)
  }

  const removeFromChain = (role: string) => setEditChain(c => c.filter(r => r !== role))
  const addToChain = (role: string) => { setEditChain(c => [...c, role]); setDropdownOpen(false) }

  const editingCategory = editModal ? sections[editModal.secIdx]?.categories[editModal.catIdx] : null
  const availableToAdd = AVAILABLE_ROLES.filter(r => !editChain.includes(r))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--success)" }}>
            <Check size={13} /> Saved
          </span>
        )}
        <button
          onClick={saveAll}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}
        >
          {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : <><Check size={13} /> Save Changes</>}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted-foreground)" }}>
          <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} />
          <span style={{ fontSize: 13 }}>Loading…</span>
        </div>
      ) : (
        sections.map((section, secIdx) => (
          <div key={section.id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
            <div style={{ padding: "14px 24px", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{section.name}</span>
            </div>

            {section.categories.map((cat, catIdx) => (
              <div
                key={cat.id}
                style={{
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  borderBottom: catIdx < section.categories.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: 240, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{cat.name}</span>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Info
                      size={14}
                      style={{ color: "var(--muted-foreground)", cursor: "default", flexShrink: 0 }}
                      onMouseEnter={() => setTooltip(cat.id)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {tooltip === cat.id && (
                      <div style={{
                        position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", zIndex: 20,
                        background: "#1a1a1a", color: "#fff",
                        fontSize: 11, lineHeight: 1.5, borderRadius: 8, padding: "8px 12px",
                        width: 220, whiteSpace: "normal", pointerEvents: "none",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                      }}>
                        {cat.description}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {cat.chain.length === 0 ? (
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>No approvers set</span>
                  ) : (
                    cat.chain.map((role, rIdx) => (
                      <div key={rIdx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{role}</span>
                        {rIdx < cat.chain.length - 1 && <ArrowRight size={13} style={{ color: "var(--muted-foreground)" }} />}
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => openEdit(secIdx, catIdx)}
                  style={{
                    padding: "6px 16px", background: "var(--muted)", border: "1px solid var(--border)",
                    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                    color: "var(--foreground)", flexShrink: 0,
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      {editModal && editingCategory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{editingCategory.name}</span>
              <button onClick={() => setEditModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
                The order in which you select approval roles determines the approval workflow sequence. For example, selecting "HR Admin" before "Manager" means HR approval must be obtained first.
              </p>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  Permissions <span style={{ color: "var(--danger)" }}>*</span>
                </label>

                <div
                  ref={dropdownRef}
                  style={{
                    border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px",
                    background: "var(--background)", display: "flex", flexWrap: "wrap",
                    alignItems: "center", gap: 6, minHeight: 44, position: "relative",
                  }}
                >
                  {editChain.map(role => (
                    <div
                      key={role}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", background: "var(--muted)",
                        border: "1px solid var(--border)", borderRadius: 20,
                        fontSize: 12, fontWeight: 600, color: "var(--foreground)",
                      }}
                    >
                      {role}
                      <button
                        onClick={() => removeFromChain(role)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "var(--muted-foreground)", display: "flex" }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "2px 4px", display: "flex", alignItems: "center" }}
                  >
                    <ChevronDown size={14} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>

                  {dropdownOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden",
                    }}>
                      {availableToAdd.length === 0 ? (
                        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>All roles added</div>
                      ) : (
                        availableToAdd.map(role => (
                          <button
                            key={role}
                            onClick={() => addToChain(role)}
                            style={{
                              display: "block", width: "100%", padding: "9px 14px",
                              textAlign: "left", background: "none", border: "none",
                              cursor: "pointer", fontSize: 13, color: "var(--foreground)",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            {role}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setEditModal(null)}
                style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                style={{ padding: "8px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
