"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { signOut } from "next-auth/react"
import { AlertTriangle } from "lucide-react"

// Idle timeout: 10 minutes idle → show 60s warning → auto logout
const IDLE_MS   = 10 * 60 * 1000  // 10 minutes before warning
const WARN_MS   = 60              // seconds on warning countdown

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]

export default function IdleTimeout() {
  const [warned, setWarned] = useState(false)
  const [countdown, setCountdown] = useState(WARN_MS)
  const idleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Uses replace() so the browser back button cannot restore the authenticated page
  const doSignOut = useCallback(() => {
    signOut({ redirect: false }).then(() => {
      window.location.replace("/login")
    })
  }, [])

  const resetIdle = useCallback(() => {
    if (warned) return   // don't reset once warning shown
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      setWarned(true)
      setCountdown(WARN_MS)
    }, IDLE_MS)
  }, [warned])

  // Boot idle timer
  useEffect(() => {
    resetIdle()
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }))
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetIdle))
    }
  }, [resetIdle])

  // Countdown when warning shown
  useEffect(() => {
    if (!warned) return
    if (warnTimer.current) clearInterval(warnTimer.current)
    warnTimer.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(warnTimer.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (warnTimer.current) clearInterval(warnTimer.current) }
  }, [warned])

  // Auto-logout when countdown hits 0 (outside the state updater)
  useEffect(() => {
    if (warned && countdown === 0) doSignOut()
  }, [warned, countdown, doSignOut])

  const stayLoggedIn = () => {
    setWarned(false)
    if (warnTimer.current) clearInterval(warnTimer.current)
    resetIdle()
  }

  if (!warned) return null

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--card)", borderRadius: 16, padding: 36,
        maxWidth: 420, width: "90%", textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--warning-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <AlertTriangle size={28} style={{ color: "var(--warning)" }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "var(--foreground)" }}>
          Session Expiring
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.5 }}>
          You've been inactive. You'll be signed out automatically in
        </p>
        <div style={{
          fontSize: 56, fontWeight: 900, lineHeight: 1,
          color: countdown <= 15 ? "var(--accent)" : "var(--warning)",
          marginBottom: 24, fontVariantNumeric: "tabular-nums",
          transition: "color 0.3s",
        }}>
          {countdown}s
        </div>
        {/* Circular progress */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <button
            onClick={stayLoggedIn}
            style={{
              padding: "10px 24px", background: "var(--primary)", color: "white",
              border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700,
              flex: 1,
            }}
          >
            Stay Logged In
          </button>
          <button
            onClick={doSignOut}
            style={{
              padding: "10px 20px", background: "var(--muted)", color: "var(--muted-foreground)",
              border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
