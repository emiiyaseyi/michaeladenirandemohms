"use client"
import { useState, useEffect } from "react"
import { Inbox, Loader2, Eye, Download, X } from "lucide-react"

interface Doc {
  id: string
  title: string
  category: string
  fileUrl: string
  canView: boolean
  canDownload: boolean
  requiresAck: boolean
  myAck: { acknowledged: boolean; acknowledgedAt: string | null } | null
}

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [ackDoc, setAckDoc] = useState<Doc | null>(null)
  const [typedName, setTypedName] = useState("")
  const [acking, setAcking] = useState(false)
  const [ackError, setAckError] = useState("")

  useEffect(() => {
    fetch("/api/documents")
      .then(r => r.json())
      .then(d => { setDocs(d.docs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function openAck(doc: Doc) {
    setAckDoc(doc)
    setTypedName("")
    setAckError("")
  }

  function closeAck() {
    setAckDoc(null)
    setTypedName("")
    setAckError("")
  }

  async function submitAck() {
    if (!ackDoc) return
    setAcking(true)
    setAckError("")
    const res = await fetch(`/api/documents/${ackDoc.id}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typedName }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAckError(data.error ?? "Failed to acknowledge")
      setAcking(false)
      return
    }
    setDocs(prev => prev.map(d =>
      d.id === ackDoc.id
        ? { ...d, myAck: { acknowledged: true, acknowledgedAt: new Date().toISOString() } }
        : d
    ))
    setAcking(false)
    closeAck()
  }

  const th: React.CSSProperties = {
    padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--foreground)", background: "var(--muted)",
    borderBottom: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "13px 20px", fontSize: 13, borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
  }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Your Document(s)</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Here are your assigned documents</p>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> Loading…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Document</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "60px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted-foreground)" }}>
                        <Inbox size={36} strokeWidth={1.2} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: 13 }}>No data</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  docs.map(doc => {
                    const acked = doc.myAck?.acknowledged
                    const statusLabel = !doc.requiresAck
                      ? "No action required"
                      : acked ? "Acknowledged" : "Pending acknowledgement"
                    const statusColor = !doc.requiresAck ? "#6B7280" : acked ? "#16a34a" : "#D97706"
                    const statusBg   = !doc.requiresAck ? "#F3F4F6" : acked ? "#DCFCE7" : "#FEF3C7"

                    return (
                      <tr key={doc.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
                        <td style={td}>
                          <span style={{ fontWeight: 600 }}>{doc.title}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{doc.category}</span>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: statusBg, color: statusColor, whiteSpace: "nowrap" }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ ...td }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {doc.canView && (
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", textDecoration: "none" }}>
                                <Eye size={13} /> View
                              </a>
                            )}
                            {doc.canDownload && (
                              <a href={doc.fileUrl} download
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", textDecoration: "none" }}>
                                <Download size={13} /> Download
                              </a>
                            )}
                            {doc.requiresAck && !acked && (
                              <button onClick={() => openAck(doc)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "var(--primary)", border: "none", color: "white", cursor: "pointer" }}>
                                Acknowledge
                              </button>
                            )}
                            {!doc.canView && !doc.canDownload && (!doc.requiresAck || acked) && (
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Acknowledge modal */}
      {ackDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: "28px 32px", width: 420, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Acknowledge Document</h3>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{ackDoc.title}</p>
              </div>
              <button onClick={closeAck} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
              Type your full name as it appears on your profile to confirm you have read this document.
            </p>
            <input
              value={typedName}
              onChange={e => { setTypedName(e.target.value); setAckError("") }}
              placeholder="Full name"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${ackError ? "#DC2626" : "var(--border)"}`, borderRadius: 8, fontSize: 13, outline: "none", background: "var(--muted)", color: "var(--foreground)", boxSizing: "border-box" }}
              onKeyDown={e => { if (e.key === "Enter") submitAck() }}
            />
            {ackError && <p style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{ackError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={closeAck} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 13, cursor: "pointer", color: "var(--foreground)" }}>
                Cancel
              </button>
              <button onClick={submitAck} disabled={acking || !typedName.trim()}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "white", fontSize: 13, fontWeight: 600, cursor: acking || !typedName.trim() ? "default" : "pointer", opacity: acking || !typedName.trim() ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                {acking && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
