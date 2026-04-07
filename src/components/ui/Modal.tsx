"use client"
import { ReactNode, useEffect } from "react"
import { X } from "lucide-react"

export default function Modal({ open, onClose, title, children, width = 560 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,31,68,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: 6, color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
