"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X, ArrowRight } from "lucide-react"

export default function ProfileCompletionReminder({ rolePath }: { rolePath: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const editHref = `${rolePath}/self-service/edit`
  const onEditPage = pathname === editHref

  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (onEditPage || dismissed) return
    let cancelled = false
    fetch("/api/self-service/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.profile) return
        if (d.profile.completeness < 100) {
          setShow(true)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [onEditPage, dismissed])

  if (onEditPage || dismissed || !show) return null

  const close = () => {
    setDismissed(true)
    setShow(false)
  }

  const goToEdit = () => {
    setDismissed(true)
    setShow(false)
    router.push(editHref)
  }

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 9999,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
          maxWidth: 460, width: "100%", padding: "32px 32px 28px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          position: "relative",
        }}
      >
        <button
          onClick={close}
          aria-label="Dismiss"
          style={{
            position: "absolute", top: 14, right: 14, background: "none", border: "none",
            cursor: "pointer", color: "var(--muted-foreground)", padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
          Complete your profile
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: 22 }}>
          Your account is ready, but a few details are still missing. Please fill them in to finish setting up your account.
        </p>

        <button
          onClick={goToEdit}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 22px", background: "var(--primary)", color: "white",
            border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(11,92,46,0.25)", cursor: "pointer",
          }}
        >
          Complete my profile <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
