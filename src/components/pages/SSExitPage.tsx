"use client"
import Card from "@/components/ui/Card"
import { LogOut } from "lucide-react"

export default function SSExitPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <Card>
        <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F3E8FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={32} style={{ color: "#7C3AED" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Exit & Offboarding</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              Initiate a resignation or view your offboarding checklist and exit interview. Coming soon.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
