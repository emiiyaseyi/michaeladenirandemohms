"use client"
import { useState, useEffect } from "react"
import { MessageCircle, Plus, Send } from "lucide-react"
import { format } from "date-fns"

const FEEDBACK_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  PEER:    { bg: "#EEF2FF", color: "#4338CA" },
  MANAGER: { bg: "#DCFCE7", color: "#15803D" },
  KUDOS:   { bg: "#FEF9C3", color: "#92400E" },
}

function TypeBadge({ type }: { type: string }) {
  const s = FEEDBACK_TYPE_COLORS[type] ?? FEEDBACK_TYPE_COLORS.PEER
  return <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{type}</span>
}

const fi: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }

export default function PLFeedbackPage() {
  const [tab, setTab] = useState<"received"|"given"|"requests">("received")
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [myEmployeeId, setMyEmployeeId] = useState("")
  const [loading, setLoading] = useState(true)
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fbForm, setFbForm] = useState({ receiverId: "", type: "MANAGER", comment: "", rating: "", isAnonymous: false })
  const [reqForm, setReqForm] = useState({ targetId: "", message: "" })

  const load = async () => {
    setLoading(true)
    const [pd, ed] = await Promise.all([
      fetch("/api/self-service/profile").then(r => r.json()),
      fetch("/api/employees?status=ACTIVE").then(r => r.json()),
    ])
    const empId = pd.profile?.id ?? ""
    setMyEmployeeId(empId)
    setEmployees(ed.employees ?? [])

    if (empId) {
      const [fbd, rqd] = await Promise.all([
        fetch(`/api/performance/feedback?employeeId=${empId}&direction=received`).then(r => r.json()),
        fetch(`/api/performance/feedback/requests?employeeId=${empId}`).then(r => r.json()),
      ])
      setFeedbacks(fbd.feedbacks ?? [])
      setRequests(rqd.requests ?? [])
    }
    setLoading(false)
  }

  const loadGiven = async () => {
    if (!myEmployeeId) return
    const d = await fetch(`/api/performance/feedback?employeeId=${myEmployeeId}&direction=given`).then(r => r.json())
    setFeedbacks(d.feedbacks ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === "given" && myEmployeeId) loadGiven(); else if (tab === "received" && myEmployeeId) load() }, [tab])

  const submitFeedback = async () => {
    setSaving(true)
    await fetch("/api/performance/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fbForm, rating: fbForm.rating ? Number(fbForm.rating) : null }) })
    setSaving(false); setGiveFeedbackOpen(false); if (tab === "given") loadGiven()
  }

  const submitRequest = async () => {
    setSaving(true)
    await fetch("/api/performance/feedback/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqForm) })
    setSaving(false); setRequestOpen(false); load()
  }

  const displayList = tab === "requests" ? requests : feedbacks

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MessageCircle size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Feedback</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Give and receive performance feedback</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setRequestOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Request Feedback
          </button>
          <button onClick={() => setGiveFeedbackOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}>
            <Plus size={14} /> Give Feedback
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["received","given","requests"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
        ) : displayList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No {tab} feedback yet.</div>
        ) : tab === "requests" ? (
          <div>
            {requests.map((r: any) => (
              <div key={r.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>From: {r.requester?.firstName} {r.requester?.lastName} → To: {r.target?.firstName} {r.target?.lastName}</div>
                  {r.message && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>{r.message}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--muted)", color: "var(--muted-foreground)" }}>{r.status}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {feedbacks.map((f: any) => (
              <div key={f.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {tab === "received"
                      ? (f.isAnonymous ? "Anonymous" : `${f.giver?.firstName ?? ""} ${f.giver?.lastName ?? ""}`.trim())
                      : `${f.receiver?.firstName ?? ""} ${f.receiver?.lastName ?? ""}`.trim()
                    }
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TypeBadge type={f.type} />
                    {f.rating && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>★ {f.rating}</span>}
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{format(new Date(f.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
                {f.comment && <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>{f.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Give Feedback Modal */}
      {giveFeedbackOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setGiveFeedbackOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Give Feedback</h3>
              <button onClick={() => setGiveFeedbackOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Employee</label>
                <select value={fbForm.receiverId} onChange={e => setFbForm(f => ({ ...f, receiverId: e.target.value }))} style={fi}>
                  <option value="">Select…</option>
                  {employees.filter(e => e.id !== myEmployeeId).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Type</label>
                <select value={fbForm.type} onChange={e => setFbForm(f => ({ ...f, type: e.target.value }))} style={fi}>
                  <option value="MANAGER">Manager</option>
                  <option value="PEER">Peer</option>
                  <option value="KUDOS">Kudos</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Rating (optional, 1–5)</label>
                <input type="number" min={1} max={5} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} style={fi} placeholder="Optional" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Comment</label>
                <textarea value={fbForm.comment} onChange={e => setFbForm(f => ({ ...f, comment: e.target.value }))} rows={4} style={{ ...fi, resize: "vertical" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={fbForm.isAnonymous} onChange={e => setFbForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
                Submit anonymously
              </label>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setGiveFeedbackOpen(false)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitFeedback} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                <Send size={13} /> {saving ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Feedback Modal */}
      {requestOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setRequestOpen(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, maxWidth: 420, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Request Feedback</h3>
              <button onClick={() => setRequestOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Request From</label>
                <select value={reqForm.targetId} onChange={e => setReqForm(f => ({ ...f, targetId: e.target.value }))} style={fi}>
                  <option value="">Select…</option>
                  {employees.filter(e => e.id !== myEmployeeId).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Message (optional)</label>
                <textarea value={reqForm.message} onChange={e => setReqForm(f => ({ ...f, message: e.target.value }))} rows={3} style={{ ...fi, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setRequestOpen(false)} style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitRequest} disabled={saving} style={{ padding: "9px 24px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "white", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
