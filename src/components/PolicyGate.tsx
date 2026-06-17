"use client"
import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

const READ_SECONDS = 15

interface PendingDoc {
  id: string
  title: string
  category: string
  fileUrl: string
}

export default function PolicyGate({ employeeId }: { employeeId?: string }) {
  const [docs, setDocs] = useState<PendingDoc[]>([])
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [countdown, setCountdown] = useState(READ_SECONDS)
  const [typedName, setTypedName] = useState("")
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!employeeId) { setLoaded(true); return }
    fetch("/api/documents/pending-ack")
      .then(r => r.json())
      .then(d => { setDocs(d.docs ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [employeeId])

  useEffect(() => {
    setCountdown(READ_SECONDS)
    setTypedName("")
    setSignError("")
    if (timerRef.current) clearInterval(timerRef.current)
    if (docs.length === 0 || idx >= docs.length) return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idx, docs.length])

  if (!loaded || docs.length === 0 || idx >= docs.length) return null

  const doc = docs[idx]
  const progress = Math.round(((READ_SECONDS - countdown) / READ_SECONDS) * 100)
  const canSign = countdown === 0 && typedName.trim().length > 0

  const sign = async () => {
    if (!canSign || signing) return
    setSigning(true)
    setSignError("")
    const res = await fetch(`/api/documents/${doc.id}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typedName }),
    })
    const data = await res.json()
    setSigning(false)
    if (!res.ok) { setSignError(data.error ?? "Failed to sign"); return }
    if (idx + 1 < docs.length) {
      setIdx(i => i + 1)
    } else {
      setDocs([])
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--card)", borderRadius: 16,
        width: "100%", maxWidth: 820,
        maxHeight: "95vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d97706", marginBottom: 4 }}>
                Action Required — Document {idx + 1} of {docs.length}
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{doc.title}</h2>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {doc.category}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10 }}>
            {countdown > 0
              ? `Please read this document carefully before signing — ${countdown}s remaining`
              : "You may now sign below"}
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: countdown > 0 ? "var(--primary)" : "#16a34a",
              borderRadius: 4, transition: "width 1s linear, background 0.3s",
            }} />
          </div>
        </div>

        {/* Document viewer — no download, no copy */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", userSelect: "none" }}>
          <iframe
            src={`${doc.fileUrl}#toolbar=0&navpanes=0`}
            style={{ width: "100%", height: "100%", border: "none", display: "block", minHeight: 380 }}
            title={doc.title}
          />
          {/* Transparent overlay blocks right-click save-as on the PDF */}
          <div
            style={{ position: "absolute", inset: 0, zIndex: 2 }}
            onContextMenu={e => e.preventDefault()}
          />
        </div>

        {/* Sign area */}
        <div style={{ padding: "18px 28px", borderTop: "1px solid var(--border)", background: "var(--background)" }}>
          {countdown > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted-foreground)" }}>
              <Loader2 size={14} style={{ animation: "spin .8s linear infinite", flexShrink: 0 }} />
              Signing becomes available once you have had time to review the document.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                Type your full name exactly as it appears on your profile to confirm you have read and agree to this policy.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={typedName}
                  onChange={e => { setTypedName(e.target.value); setSignError("") }}
                  placeholder="Your full name"
                  onKeyDown={e => { if (e.key === "Enter") sign() }}
                  style={{
                    flex: 1, padding: "10px 14px",
                    border: `1.5px solid ${signError ? "#DC2626" : "var(--border)"}`,
                    borderRadius: 8, fontSize: 14,
                    background: "var(--muted)", color: "var(--foreground)", outline: "none",
                  }}
                />
                <button
                  onClick={sign}
                  disabled={!canSign || signing}
                  style={{
                    padding: "10px 24px", borderRadius: 8, border: "none",
                    background: canSign && !signing ? "var(--primary)" : "var(--muted)",
                    color: canSign && !signing ? "white" : "var(--muted-foreground)",
                    fontSize: 14, fontWeight: 700,
                    cursor: canSign && !signing ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}>
                  {signing && <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} />}
                  {signing ? "Signing…" : "I Agree & Sign"}
                </button>
              </div>
              {signError && <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{signError}</p>}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
