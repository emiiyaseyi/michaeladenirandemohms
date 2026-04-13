"use client"
import Card from "@/components/ui/Card"
import { HelpCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function GrievancePage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/self-service" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Self Service
        </Link>
        <span style={{ color: "var(--border)" }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Grievance</span>
      </div>
      <Card>
        <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HelpCircle size={32} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Grievance Portal</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              Raise workplace grievances or complaints confidentially. All submissions are reviewed by HR. Coming soon.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
