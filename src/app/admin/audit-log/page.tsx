"use client"
import { useState, useEffect, useCallback } from "react"
import { FileText, Search, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"

const ENTITY_COLORS: Record<string, { bg: string; color: string }> = {
  KPI:               { bg: "#EEF2FF", color: "#4338CA" },
  PerformanceCycle:  { bg: "#DCFCE7", color: "#15803D" },
  Employee:          { bg: "#FEF9C3", color: "#92400E" },
  User:              { bg: "#FEE2E2", color: "#DC2626" },
  Leave:             { bg: "#E0F2FE", color: "#0369A1" },
  ExternalAdmin:     { bg: "#F3E8FF", color: "#7E22CE" },
}

function EntityBadge({ entity }: { entity: string }) {
  const s = ENTITY_COLORS[entity] ?? { bg: "var(--muted)", color: "var(--muted-foreground)" }
  return <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{entity}</span>
}

function ActionBadge({ action }: { action: string }) {
  const isDelete  = /DELETE|REMOVE|REJECT/i.test(action)
  const isCreate  = /CREATE|ADD|INVITE|SUBMIT/i.test(action)
  const isApprove = /APPROV|ACTIVAT/i.test(action)
  const bg    = isDelete ? "#FEE2E2" : isCreate ? "#DCFCE7" : isApprove ? "#DBEAFE" : "var(--muted)"
  const color = isDelete ? "#DC2626" : isCreate ? "#15803D" : isApprove ? "#1D4ED8" : "var(--muted-foreground)"
  return <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: bg, color, whiteSpace: "nowrap" }}>{action.replace(/_/g, " ")}</span>
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [skip, setSkip] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const TAKE = 50

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setSkip(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ take: String(TAKE), skip: String(skip) })
    if (debouncedSearch) params.set("search", debouncedSearch)
    const d = await fetch(`/api/audit-log?${params}`).then(r => r.json())
    setLogs(d.logs ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [debouncedSearch, skip])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / TAKE)
  const currentPage = Math.floor(skip / TAKE) + 1

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileText size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Audit Log</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>System-wide record of all significant actions</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px", minWidth: 260 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entity, action, user…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", width: "100%" }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
        {loading ? "Loading…" : `${total.toLocaleString()} records`}
        {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                {["Timestamp", "User", "Action", "Entity", "Entity ID", "Details", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No audit log entries found.</td></tr>
              ) : logs.map(log => {
                const isOpen = expanded === log.id
                const hasDetails = log.oldValues || log.newValues || log.ipAddress
                return (
                  <>
                    <tr key={log.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{log.user.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{log.user.email}</div>
                          </div>
                        ) : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>System</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }}><ActionBadge action={log.action} /></td>
                      <td style={{ padding: "10px 14px" }}><EntityBadge entity={log.entity} /></td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                        {log.entityId ? log.entityId.slice(0, 12) + "…" : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {hasDetails ? (
                          <button onClick={() => setExpanded(isOpen ? null : log.id)}
                            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: "3px 8px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                            {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Details
                          </button>
                        ) : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }} />
                    </tr>
                    {isOpen && hasDetails && (
                      <tr key={log.id + "_exp"} style={{ background: "rgba(0,0,0,0.015)", borderTop: "1px solid var(--border)" }}>
                        <td colSpan={7} style={{ padding: "12px 14px 12px 32px" }}>
                          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                            {log.ipAddress && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>IP Address</div>
                                <code style={{ fontSize: 12 }}>{log.ipAddress}</code>
                              </div>
                            )}
                            {log.oldValues && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>Before</div>
                                <pre style={{ fontSize: 11, margin: 0, background: "#FEE2E2", padding: "6px 10px", borderRadius: 6, maxWidth: 360, overflowX: "auto" }}>{JSON.stringify(log.oldValues, null, 2)}</pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>After</div>
                                <pre style={{ fontSize: 11, margin: 0, background: "#DCFCE7", padding: "6px 10px", borderRadius: 6, maxWidth: 360, overflowX: "auto" }}>{JSON.stringify(log.newValues, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
          <button onClick={() => setSkip(s => Math.max(0, s - TAKE))} disabled={skip === 0}
            style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: skip === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: skip === 0 ? 0.5 : 1 }}>
            Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setSkip(s => s + TAKE)} disabled={skip + TAKE >= total}
            style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: skip + TAKE >= total ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: skip + TAKE >= total ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
