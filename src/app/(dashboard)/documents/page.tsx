"use client"
import Card from "@/components/ui/Card"
import { FolderOpen, Upload, FileText, Search, Filter } from "lucide-react"

export default function DocumentsPage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>Document Management</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 4, fontSize: 13 }}>
          Store, manage, and share important documents securely.
        </p>
      </div>

      {/* Coming soon placeholder */}
      <Card>
        <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--primary-50, #EFF6FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FolderOpen size={32} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Document Management</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 420 }}>
              Upload, organise, and access employee documents, contracts, policies, and compliance files — all in one place. Coming soon.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { icon: Upload, label: "Upload Documents" },
              { icon: FileText, label: "Policy Library" },
              { icon: Search, label: "Search & Filter" },
              { icon: Filter, label: "Access Control" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>
                <Icon size={13} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
