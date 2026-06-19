"use client"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { UserCheck, Search, X, Loader2, Plus, Users, Sparkles, Trash2 } from "lucide-react"
import Modal from "@/components/ui/Modal"

const fi: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8,
  fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
}
const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8,
  cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white",
}
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px",
  border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--background)",
  color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer",
}
const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }
const td: React.CSSProperties = { padding: "12px", fontSize: 13, color: "var(--foreground)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }

type Cycle = { id: string; name: string; year: number; half: number; stage: string; isActive: boolean }
type Person = { id: string; firstName: string; lastName: string; jobTitle?: string | null; profilePhoto?: string | null }
type Reviewer = { id: string; role: string; reviewer: Person }
type Appraisal = {
  id: string; stage: string
  employee: Person
  reviewers: Reviewer[]
  _count: { peers: number; ratings: number }
}
type Peer = { id: string; peerId: string; status: string; peer: Person }

const fullName = (p?: Person | null) => (p ? `${p.firstName} ${p.lastName}`.trim() : "")

function Spinner() {
  return <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />
}

// ── Searchable employee picker ───────────────────────────────────────────────
function EmployeePicker({
  employees, onPick, onClose, exclude = [],
}: {
  employees: Person[]; onPick: (id: string) => void; onClose: () => void; exclude?: string[]
}) {
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [onClose])
  const ex = useMemo(() => new Set(exclude), [exclude])
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return employees
      .filter(e => !ex.has(e.id))
      .filter(e => !t || fullName(e).toLowerCase().includes(t) || (e.jobTitle ?? "").toLowerCase().includes(t))
      .slice(0, 50)
  }, [employees, q, ex])
  return (
    <div ref={ref} style={{ position: "absolute", zIndex: 50, top: "calc(100% + 4px)", left: 0, width: 280, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
      <div style={{ position: "relative", padding: 8, borderBottom: "1px solid var(--border)" }}>
        <Search size={14} style={{ position: "absolute", left: 18, top: 18, color: "var(--muted-foreground)" }} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff…" style={{ ...fi, paddingLeft: 30 }} />
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>No matches</div>
        ) : filtered.map(e => (
          <button key={e.id} onClick={() => onPick(e.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName(e)}</div>
            {e.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.jobTitle}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Reviewer cell (PRIMARY / COUNTER) ────────────────────────────────────────
function ReviewerCell({
  appraisal, role, employees, onChanged,
}: {
  appraisal: Appraisal; role: "PRIMARY" | "COUNTER"; employees: Person[]; onChanged: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = appraisal.reviewers.find(r => r.role === role)?.reviewer ?? null

  async function pick(reviewerId: string) {
    setOpen(false); setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/reviewers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId, role }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed"); return }
      await onChanged()
    } finally { setBusy(false) }
  }
  async function clear() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/reviewers?role=${role}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed"); return }
      await onChanged()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: current ? 600 : 400, color: current ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {current ? fullName(current) : "—"}
      </span>
      {busy ? <Spinner /> : (
        <>
          <button onClick={() => setOpen(o => !o)} style={{ ...ghostBtn, padding: "3px 8px" }}>Edit</button>
          {current && (
            <button onClick={clear} title="Clear" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "inline-flex", padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </>
      )}
      {open && (
        <EmployeePicker
          employees={employees}
          exclude={[appraisal.employee.id]}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
      {error && <span style={{ fontSize: 11, color: "#DC2626" }}>{error}</span>}
    </div>
  )
}

// ── Peers manager modal ──────────────────────────────────────────────────────
function PeersModal({
  appraisal, employees, onClose, onChanged,
}: {
  appraisal: Appraisal; employees: Person[]; onClose: () => void; onChanged: () => Promise<void>
}) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Person[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPeers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/peers`)
      const d = await res.json()
      setPeers(d.peers ?? [])
    } finally { setLoading(false) }
  }, [appraisal.id])

  useEffect(() => { loadPeers() }, [loadPeers])

  const peerIds = useMemo(() => peers.map(p => p.peerId), [peers])

  async function refresh() {
    await loadPeers()
    await onChanged()
  }

  async function addPeer(peerId: string) {
    setBusy(true); setError(null); setPickerOpen(false)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/peers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to add peer"); return }
      setCandidates(c => c ? c.filter(x => x.id !== peerId) : c)
      await refresh()
    } finally { setBusy(false) }
  }
  async function removePeer(peerId: string) {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/peers?peerId=${peerId}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to remove peer"); return }
      await refresh()
    } finally { setBusy(false) }
  }
  async function suggest() {
    setSuggesting(true); setError(null)
    try {
      const res = await fetch(`/api/performance/appraisals/${appraisal.id}/peers?suggest=1`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to suggest"); return }
      const d = await res.json()
      setCandidates(d.candidates ?? [])
    } finally { setSuggesting(false) }
  }

  const exclude = useMemo(() => [appraisal.employee.id, ...peerIds], [appraisal.employee.id, peerIds])

  return (
    <Modal open onClose={onClose} title={`Peers — ${fullName(appraisal.employee)}`} width={560}>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {error && <div style={{ fontSize: 12, color: "#DC2626", background: "rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8 }}>Current peers</div>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}><Spinner /> Loading…</div>
          ) : peers.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No peers assigned yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {peers.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName(p.peer)}</div>
                    {p.peer.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{p.peer.jobTitle}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{p.status}</span>
                  <button onClick={() => removePeer(p.peerId)} disabled={busy} title="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#DC2626", display: "inline-flex", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, position: "relative", flexWrap: "wrap" }}>
          <button onClick={suggest} disabled={suggesting} style={{ ...ghostBtn, opacity: suggesting ? 0.6 : 1 }}>
            {suggesting ? <Spinner /> : <Sparkles size={13} />} Suggest from shared projects
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setPickerOpen(o => !o)} style={ghostBtn}><Plus size={13} /> Add staff</button>
            {pickerOpen && (
              <EmployeePicker employees={employees} exclude={exclude} onPick={addPeer} onClose={() => setPickerOpen(false)} />
            )}
          </div>
        </div>

        {candidates && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8 }}>Suggested candidates</div>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No suggestions from shared projects.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {candidates.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName(c)}</div>
                      {c.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.jobTitle}</div>}
                    </div>
                    <button onClick={() => addPeer(c.id)} disabled={busy} style={{ ...ghostBtn, padding: "5px 10px" }}><Plus size={13} /> Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AssignReviewersPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [cycleId, setCycleId] = useState<string>("")
  const [appraisals, setAppraisals] = useState<Appraisal[]>([])
  const [employees, setEmployees] = useState<Person[]>([])
  const [loadingCycles, setLoadingCycles] = useState(true)
  const [loadingAppraisals, setLoadingAppraisals] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [assignedMsg, setAssignedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [peersFor, setPeersFor] = useState<Appraisal | null>(null)

  // cycles + employees (once)
  useEffect(() => {
    (async () => {
      setLoadingCycles(true)
      try {
        const res = await fetch("/api/performance/cycles")
        const d = await res.json()
        const cs: Cycle[] = d.cycles ?? []
        setCycles(cs)
        const def = cs.find(c => c.isActive) ?? cs[0]
        if (def) setCycleId(def.id)
      } finally { setLoadingCycles(false) }
    })()
    ;(async () => {
      const res = await fetch("/api/employees")
      const d = await res.json()
      setEmployees(d.employees ?? [])
    })()
  }, [])

  const loadAppraisals = useCallback(async () => {
    if (!cycleId) return
    setLoadingAppraisals(true); setError(null)
    try {
      const res = await fetch(`/api/performance/appraisals?cycleId=${cycleId}&scope=all`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to load appraisals"); return }
      const d = await res.json()
      setAppraisals(d.appraisals ?? [])
    } finally { setLoadingAppraisals(false) }
  }, [cycleId])

  useEffect(() => { loadAppraisals() }, [loadAppraisals])

  // keep open peer modal's appraisal reference fresh after refetch
  useEffect(() => {
    if (peersFor) {
      const fresh = appraisals.find(a => a.id === peersFor.id)
      if (fresh && fresh !== peersFor) setPeersFor(fresh)
    }
  }, [appraisals]) // eslint-disable-line react-hooks/exhaustive-deps

  async function autofill() {
    if (!cycleId) return
    setAutofilling(true); setError(null); setAssignedMsg(null)
    try {
      const res = await fetch(`/api/performance/cycles/${cycleId}/autofill-peers`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Auto-assign failed"); return }
      const d = await res.json()
      setAssignedMsg(`${d.assigned ?? 0} peers assigned`)
      await loadAppraisals()
    } finally { setAutofilling(false) }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <UserCheck size={26} style={{ color: "var(--primary)", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Assign Reviewers</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Set each staff member&apos;s two reviewers and their peers</p>
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260 }}>
          {loadingCycles ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}><Spinner /> Loading…</div>
          ) : (
            <select style={fi} value={cycleId} onChange={e => { setCycleId(e.target.value); setAssignedMsg(null) }}>
              {cycles.length === 0 && <option value="">No cycles</option>}
              {cycles.map(c => (
                <option key={c.id} value={c.id}>{c.name} (H{c.half} {c.year}){c.isActive ? " • Active" : ""}</option>
              ))}
            </select>
          )}
        </div>
        <button onClick={autofill} disabled={autofilling || !cycleId} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", gap: 6, opacity: autofilling || !cycleId ? 0.6 : 1 }}>
          {autofilling ? <Spinner /> : <Users size={14} />} Auto-assign all peers
        </button>
        {assignedMsg && <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>{assignedMsg}</span>}
      </div>

      {error && <div style={{ fontSize: 12, color: "#DC2626", background: "rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "visible" }}>
        {loadingAppraisals ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Loading…</div>
        ) : appraisals.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No appraisals in this cycle.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Subject</th>
                <th style={th}>Primary reviewer</th>
                <th style={th}>Counter reviewer</th>
                <th style={th}>Peers</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map(a => (
                <tr key={a.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{fullName(a.employee)}</div>
                    {a.employee.jobTitle && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{a.employee.jobTitle}</div>}
                  </td>
                  <td style={td}><ReviewerCell appraisal={a} role="PRIMARY" employees={employees} onChanged={loadAppraisals} /></td>
                  <td style={td}><ReviewerCell appraisal={a} role="COUNTER" employees={employees} onChanged={loadAppraisals} /></td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{a._count?.peers ?? 0} peers</span>
                      <button onClick={() => setPeersFor(a)} style={ghostBtn}><Users size={13} /> Manage</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {peersFor && (
        <PeersModal
          appraisal={peersFor}
          employees={employees}
          onClose={() => setPeersFor(null)}
          onChanged={loadAppraisals}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
