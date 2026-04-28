"use client"
import Card from "@/components/ui/Card"
import { BarChart2 } from "lucide-react"

export default function SSSurveysPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <Card>
        <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart2 size={32} style={{ color: "#10B981" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Surveys & Pulse Checks</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              Participate in engagement surveys, pulse checks, and 360° feedback forms. Coming soon.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
