"use client"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { Loader2 } from "lucide-react"

// Hook: returns a `confirmLogout` callback and the modal element to render.
// Mount the modal once near the trigger; the callback opens it.
export function useLogoutConfirm() {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const confirmLogout = () => setOpen(true)

  const close = () => { if (!signingOut) setOpen(false) }

  const doLogout = async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: "/login" })
  }

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const modal = open ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,31,68,0.5)", backdropFilter: "blur(4px)" }} onClick={close} />
      <div style={{ position: "relative", background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: "24px 24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 10, color: "var(--foreground)" }}>Log out?</h2>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0, marginBottom: 20 }}>
          Are you sure you want to log out? You'll need to sign in again to return.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={close}
            disabled={signingOut}
            style={{
              padding: "9px 18px",
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: signingOut ? "not-allowed" : "pointer",
              color: "var(--foreground)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doLogout}
            disabled={signingOut}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 90,
              padding: "9px 18px",
              background: "#DC2626",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: signingOut ? "not-allowed" : "pointer",
              opacity: signingOut ? 0.85 : 1,
            }}
          >
            {signingOut ? <Loader2 size={14} style={{ animation: "logout-spin .8s linear infinite" }} /> : "Logout"}
          </button>
        </div>
      </div>
      <style>{`@keyframes logout-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ) : null

  return { confirmLogout, modal }
}
