"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { FileText, Search, ChevronDown, ChevronUp, Download, Calendar } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"

const ENTITY_COLORS: Record<string, { bg: string; color: string }> = {
  KPI:               { bg: "#EEF2FF", color: "#4338CA" },
  PerformanceCycle:  { bg: "#DCFCE7", color: "#15803D" },
  Employee:          { bg: "#FEF9C3", color: "#92400E" },
  User:              { bg: "#FEE2E2", color: "#DC2626" },
  LeaveRequest:      { bg: "#E0F2FE", color: "#0369A1" },
  ExternalAdmin:     { bg: "#F3E8FF", color: "#7E22CE" },
  OrgDocument:       { bg: "#FCE7F3", color: "#BE185D" },
  PersonalDocument:  { bg: "#FCE7F3", color: "#BE185D" },
  Contractor:        { bg: "#FFEDD5", color: "#C2410C" },
  Role:              { bg: "#E0E7FF", color: "#3730A3" },
  AdminRole:         { bg: "#E0E7FF", color: "#3730A3" },
  Violation:         { bg: "#FEE2E2", color: "#DC2626" },
  Suspension:        { bg: "#FEE2E2", color: "#DC2626" },
  DisciplinaryPolicy:{ bg: "#FEE2E2", color: "#DC2626" },
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

type RangePreset = "all" | "this_month" | "last_month" | "this_year" | "custom"

function rangeDates(preset: RangePreset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date()
  switch (preset) {
    case "all":         return {}
    case "this_month":  return { from: startOfMonth(now).toISOString().slice(0, 10), to: endOfMonth(now).toISOString().slice(0, 10) }
    case "last_month":  { const lm = subMonths(now, 1); return { from: startOfMonth(lm).toISOString().slice(0, 10), to: endOfMonth(lm).toISOString().slice(0, 10) } }
    case "this_year":   return { from: startOfYear(now).toISOString().slice(0, 10), to: endOfYear(now).toISOString().slice(0, 10) }
    case "custom":      return { from: customFrom || undefined, to: customTo || undefined }
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [skip, setSkip] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rangePreset, setRangePreset] = useState<RangePreset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showDownload, setShowDownload] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)
  const TAKE = 50

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setSkip(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setSkip(0) }, [rangePreset, customFrom, customTo])

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setShowDownload(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const buildParams = useCallback((extra: Record<string, string> = {}) => {
    const { from, to } = rangeDates(rangePreset, customFrom, customTo)
    const params = new URLSearchParams(extra)
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (from) params.set("from", from)
    if (to)   params.set("to", to)
    return params
  }, [debouncedSearch, rangePreset, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    const params = buildParams({ take: String(TAKE), skip: String(skip) })
    const d = await fetch(`/api/audit-log?${params}`).then(r => r.json())
    setLogs(d.logs ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [buildParams, skip])

  useEffect(() => { load() }, [load])

  const downloadCsv = () => {
    const params = buildParams({ format: "csv" })
    window.location.href = `/api/audit-log?${params}`
    setShowDownload(false)
  }

  const downloadPdf = async () => {
    setShowDownload(false)
    const { jsPDF } = await import("jspdf")
    const autoTableMod: any = await import("jspdf-autotable")
    const autoTable = autoTableMod.default ?? autoTableMod

    // Fetch ALL matching rows for the PDF (capped at 5000 for sanity)
    const params = buildParams({ take: "5000", skip: "0" })
    const data = await fetch(`/api/audit-log?${params}`).then(r => r.json())
    const rows = (data.logs ?? []) as any[]

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const today = format(new Date(), "MMM d, yyyy HH:mm")
    const { from, to } = rangeDates(rangePreset, customFrom, customTo)
    const rangeLabel = from || to
      ? `${from ? format(new Date(from), "MMM d, yyyy") : "…"} – ${to ? format(new Date(to), "MMM d, yyyy") : "…"}`
      : "All time"

    doc.setFontSize(14); doc.setFont("helvetica", "bold")
    doc.text("Audit Log", 14, 14)
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100)
    doc.text(`Range: ${rangeLabel}  |  ${rows.length} records  |  Generated ${today}`, 14, 20)

    autoTable(doc, {
      startY: 26,
      head: [["Timestamp", "Actor", "Target", "Action", "Entity", "Entity ID", "Reason", "IP"]],
      body: rows.map(r => [
        format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
        r.user?.email ?? "—",
        r.targetUser?.email ?? "—",
        r.action.replace(/_/g, " "),
        r.entity,
        r.entityId ? r.entityId.slice(0, 12) : "—",
        (r.reason ?? "").slice(0, 60),
        r.ipAddress ?? "—",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [11, 92, 46], textColor: 255, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 28 }, 6: { cellWidth: 42 } },
      didDrawPage: () => {
        doc.setFontSize(8); doc.setTextColor(150)
        doc.text(`Page ${doc.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8)
      },
    })

    doc.save(`audit-log-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const totalPages = Math.ceil(total / TAKE)
  const currentPage = Math.floor(skip / TAKE) + 1

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileText size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Audit Log</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>System-wide record of all significant actions</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div ref={downloadRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDownload(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              <Download size={14} /> Download <ChevronDown size={12} />
            </button>
            {showDownload && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 9, boxShadow: "0 6px 20px rgba(0,0,0,0.08)", minWidth: 180, zIndex: 50, overflow: "hidden" }}>
                <button onClick={downloadCsv} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}>
                  Download CSV
                </button>
                <button onClick={downloadPdf} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)", borderTop: "1px solid var(--border)" }}>
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600 }}>
          <Calendar size={14} /> Range:
        </div>
        <select
          value={rangePreset}
          onChange={e => setRangePreset(e.target.value as RangePreset)}
          style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--background)", fontSize: 13, color: "var(--foreground)", cursor: "pointer" }}
        >
          <option value="all">All time</option>
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="this_year">This year</option>
          <option value="custom">Custom range…</option>
        </select>
        {rangePreset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--background)", fontSize: 13, color: "var(--foreground)" }}
            />
            <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--background)", fontSize: 13, color: "var(--foreground)" }}
            />
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 9, padding: "6px 12px", minWidth: 260, marginLeft: "auto", flex: 1 }}>
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
                {["Timestamp", "Actor", "Target", "Action", "Entity", "Entity ID", "Details", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>No audit log entries found.</td></tr>
              ) : logs.map(log => {
                const isOpen = expanded === log.id
                const hasDetails = log.oldValues || log.newValues || log.ipAddress || log.userAgent || log.reason
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
                      <td style={{ padding: "10px 14px" }}>
                        {log.targetUser ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{log.targetUser.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{log.targetUser.email}</div>
                          </div>
                        ) : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>—</span>}
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
                        <td colSpan={8} style={{ padding: "12px 14px 12px 32px" }}>
                          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                            {log.reason && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>Reason</div>
                                <div style={{ fontSize: 12, maxWidth: 360 }}>{log.reason}</div>
                              </div>
                            )}
                            {log.ipAddress && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>IP Address</div>
                                <code style={{ fontSize: 12 }}>{log.ipAddress}</code>
                              </div>
                            )}
                            {log.userAgent && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 }}>User Agent</div>
                                <code style={{ fontSize: 11, maxWidth: 360, display: "inline-block", wordBreak: "break-all" }} title={log.userAgent}>{log.userAgent.length > 80 ? log.userAgent.slice(0, 80) + "…" : log.userAgent}</code>
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
