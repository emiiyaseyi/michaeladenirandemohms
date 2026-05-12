"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, X, Search } from "lucide-react"

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box", outline: "none",
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>{value || "N/A"}</div>
    </div>
  )
}

function DeleteModal({ onClose, onConfirm, deleting }: { onClose: () => void; onConfirm: () => void; deleting: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Confirm action</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 8 }}>Are you sure you want to delete this policy?</p>
          <p style={{ fontSize: 13, color: "var(--foreground)" }}>Click <strong>Delete</strong> to proceed.</p>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ padding: "9px 22px", background: "var(--danger)", border: "none", borderRadius: 8, cursor: deleting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExemptionsModal({ policy, employees, onClose, onSaved }: {
  policy: any; employees: any[]; onClose: () => void; onSaved: () => void
}) {
  const [selected, setSelected] = useState<string[]>(() => policy.exemptions?.map((e: any) => e.employee.id) ?? [])
  const [q, setQ] = useState("")
  const [saving, setSaving] = useState(false)

  const filtered = employees.filter(e => !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()))
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/disciplinary/policies/${policy.id}/exemptions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: selected }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Add or remove employee from policy</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{ position: "relative", marginBottom: 4 }}>
            <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Select employees"
              style={{ ...inp, paddingRight: 36 }} />
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowY: "auto", maxHeight: 320 }}>
            {filtered.map(emp => {
              const checked = selected.includes(emp.id)
              return (
                <div key={emp.id} onClick={() => toggle(emp.id)}
                  style={{ padding: "13px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", background: checked ? "var(--muted)" : "transparent" }}
                  onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                  onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = checked ? "var(--muted)" : "transparent" }}>
                  {emp.firstName} {emp.lastName}
                </div>
              )
            })}
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No employees found.</div>}
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ policy, violationTypes, onClose, onSaved }: {
  policy: any; violationTypes: { id: string; name: string }[]; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: policy.name ?? "",
    violationTypeId: policy.violationTypeId ?? "",
    systemAction: policy.systemAction ?? "",
    hasThreshold: policy.hasThreshold ?? false,
    violationCount: policy.violationCount ? String(policy.violationCount) : "",
    description: policy.description ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return }
    setSaving(true); setError("")
    const r = await fetch(`/api/disciplinary/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    onSaved()
  }

  const selStyle: React.CSSProperties = { ...inp }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Policy Details</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Violation Type</label>
              <select value={form.violationTypeId} onChange={e => setForm(f => ({ ...f, violationTypeId: e.target.value }))} style={selStyle}>
                <option value="">None</option>
                {violationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>System Action</label>
              <select value={form.systemAction} onChange={e => setForm(f => ({ ...f, systemAction: e.target.value }))} style={selStyle}>
                <option value="">None</option>
                {["Deduction", "Demotion", "Redeployment", "Suspension", "Termination", "Probation"].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Has Threshold?</label>
            <div style={{ display: "flex", gap: 20 }}>
              {["Yes", "No"].map(o => (
                <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" checked={form.hasThreshold === (o === "Yes")} onChange={() => setForm(f => ({ ...f, hasThreshold: o === "Yes" }))} style={{ accentColor: "var(--primary)" }} />
                  {o}
                </label>
              ))}
            </div>
          </div>
          {form.hasThreshold && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Violation Count</label>
              <input type="number" min={1} value={form.violationCount} onChange={e => setForm(f => ({ ...f, violationCount: e.target.value }))} style={inp} />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding: "9px 22px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ViewPolicyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [policy, setPolicy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [violationTypes, setViolationTypes] = useState<any[]>([])
  const [modal, setModal] = useState<"delete" | "exemptions" | "edit" | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/disciplinary/policies/${id}`).then(r => r.json()).then(d => { setPolicy(d.policy); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []))
    fetch("/api/disciplinary/violation-types").then(r => r.json()).then(d => setViolationTypes(d.types ?? []))
  }, [id])

  const doDelete = async () => {
    setDeleting(true)
    await fetch(`/api/disciplinary/policies/${id}`, { method: "DELETE" })
    setDeleting(false)
    router.push("/admin/disciplinary/policies")
  }

  const th: React.CSSProperties = { padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.04em" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, borderBottom: "1px solid var(--border)" }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
  if (!policy) return <div style={{ padding: 60, textAlign: "center", color: "var(--danger)", fontSize: 13 }}>Policy not found.</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 }}>
        <button onClick={() => router.push("/admin/disciplinary/policies")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--foreground)", fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={14} /> Policies
        </button>
        <span style={{ color: "var(--muted-foreground)" }}>›</span>
        <span style={{ color: "var(--muted-foreground)" }}>View policy</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{policy.name}</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setModal("edit")}
            style={{ padding: "8px 18px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Edit details
          </button>
          <button onClick={() => setModal("delete")}
            style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: "var(--danger)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Delete
          </button>
          <button onClick={() => setModal("exemptions")}
            style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            Update exemptions
          </button>
        </div>
      </div>

      {/* Content card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Details */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: 0 }}>
            <Field label="Name" value={policy.name} />
            <Field label="Violation type" value={policy.violationType?.name} />
            <Field label="System action" value={policy.systemAction} />
            <Field label="Description" value={policy.description} />
          </div>
        </div>

        {/* Exemptions */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Exemptions</div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  <th style={th}>Name</th>
                  <th style={th}>Department</th>
                  <th style={th}>Email</th>
                </tr>
              </thead>
              <tbody>
                {policy.exemptions?.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                      No data
                    </td>
                  </tr>
                ) : policy.exemptions?.map((ex: any) => (
                  <tr key={ex.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={td}>{ex.employee.firstName} {ex.employee.lastName}</td>
                    <td style={td}>{ex.employee.department?.name ?? "—"}</td>
                    <td style={td}>{ex.employee.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "delete" && (
        <DeleteModal onClose={() => setModal(null)} onConfirm={doDelete} deleting={deleting} />
      )}
      {modal === "exemptions" && (
        <ExemptionsModal policy={policy} employees={employees} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
      {modal === "edit" && (
        <EditModal policy={policy} violationTypes={violationTypes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
