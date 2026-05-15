"use client"
import { useState, useEffect } from "react"
import { MessageSquare, Plus, Calendar } from "lucide-react"
import { format } from "date-fns"

const CONV_TYPES: Record<string, string> = {
  CHECK_IN: "Check-in", ONBOARDING: "Onboarding", CAREER: "Career",
  REALIGNMENT: "Re-alignment", OTHER: "Other",
}

const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

export default function PLConversationsPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"rounds"|"setup">("rounds")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ employeeId: "", conversationWith: "", scheduledDate: "", startTime: "", endTime: "", frequency: "ONE_OFF", conversationType: "OTHER" })

  const load = async () => {
    setLoading(true)
    const [rd, ed] = await Promise.all([
      fetch("/api/performance/conversations/rounds").then(r => r.json()),
      fetch("/api/employees?status=ACTIVE").then(r => r.json()),
    ])
    setRounds(rd.rounds ?? [])
    setEmployees(ed.employees ?? ed ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setSaving(true)
    await fetch("/api/performance/conversations/setups", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    setSaving(false); setModalOpen(false); load()
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MessageSquare size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Conversations</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Schedule and track 1:1 conversations with your team</p>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
          <Plus size={14} /> Schedule Conversation
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["rounds","setup"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t === "rounds" ? "Rounds" : "Setups"}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {tab === "rounds"
                  ? ["Employee", "Scheduled Date", "Type", "Status"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{h}</th>)
                  : ["Employee", "With", "Scheduled", "Frequency", "Type"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : tab === "rounds" ? (
                rounds.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No conversation rounds scheduled yet.</td></tr>
                ) : rounds.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.setup?.employee?.firstName} {r.setup?.employee?.lastName}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={13} style={{ color: "var(--muted-foreground)" }} />
                        {format(new Date(r.scheduledDate), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{CONV_TYPES[r.conversationType] ?? r.conversationType}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--muted)", color: "var(--muted-foreground)" }}>{r.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>Use the button above to schedule a new conversation.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Schedule Conversation</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Team Member</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} style={fi}>
                  <option value="">Select…</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Conversation With</label>
                <input value={form.conversationWith} onChange={e => setForm(f => ({ ...f, conversationWith: e.target.value }))} placeholder="e.g. Manager" style={fi} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Type</label>
                <select value={form.conversationType} onChange={e => setForm(f => ({ ...f, conversationType: e.target.value }))} style={fi}>
                  {Object.entries(CONV_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {[["Scheduled Date","scheduledDate","date"],["Start Time","startTime","time"],["End Time","endTime","time"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={fi} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Frequency</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={fi}>
                  {[["ONE_OFF","One-off"],["WEEKLY","Weekly"],["BIWEEKLY","Biweekly"],["MONTHLY","Monthly"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
