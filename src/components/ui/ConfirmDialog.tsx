"use client"
import Modal from "./Modal"
import Button from "./Button"
import { Loader2 } from "lucide-react"

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title, body, confirmText = "Confirm",
  variant = "primary", loading = false,
  disabled = false, disabledHint,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: React.ReactNode
  confirmText?: string
  variant?: "primary" | "danger"
  loading?: boolean
  disabled?: boolean
  disabledHint?: string
}) {
  if (!open) return null
  const confirmBg = variant === "danger" ? "#DC2626" : "var(--primary)"
  return (
    <Modal open onClose={loading ? () => {} : onClose} title={title} width={460}>
      <div style={{ padding: "20px 24px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
        {body}
        {disabled && disabledHint && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--warning-bg, #FEF3C7)", color: "var(--warning, #92400E)", borderRadius: 8, fontSize: 12 }}>
            {disabledHint}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <button onClick={onConfirm} disabled={loading || disabled}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: confirmBg, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading || disabled ? "not-allowed" : "pointer", opacity: loading || disabled ? 0.6 : 1 }}>
          {loading && <Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} />}
          {loading ? "Working…" : confirmText}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}
