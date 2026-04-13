"use client"
import Card from "@/components/ui/Card"
import { ShoppingBag, Users, Package, Wrench, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RequisitionsPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/self-service" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Self Service
        </Link>
        <span style={{ color: "var(--border)" }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Requisitions</span>
      </div>
      <Card>
        <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#FEF3C715", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={32} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Requisitions</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              Submit requests for assets, resources, or raise a staffing requisition that routes to the ATS. Coming soon.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {[{ icon: Users, label: "Staff Requisition" }, { icon: Package, label: "Asset Request" }, { icon: Wrench, label: "IT Support" }].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>
                <Icon size={13} /> {label}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
