"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Phone, Mail } from "lucide-react"

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
}

export default function CompanyDetailsPage() {
  const router = useRouter()
  const [details, setDetails] = useState<any>(null)
  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/company-details").then(r => r.json()),
      fetch("/api/company-details/workplaces").then(r => r.json()),
    ]).then(([dr, wr]) => {
      setDetails(dr.details)
      setWorkplaces(wr.workplaces ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
        <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: "#16a34a", borderRadius: 8, padding: "0 36px", display: "flex", alignItems: "center", gap: 32, minHeight: 200, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: -40, right: 120, width: 0, height: 0, borderLeft: "90px solid transparent", borderRight: "90px solid transparent", borderBottom: "160px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 10, right: 260, width: 0, height: 0, borderLeft: "55px solid transparent", borderRight: "55px solid transparent", borderBottom: "100px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, right: 60, width: 0, height: 0, borderLeft: "70px solid transparent", borderRight: "70px solid transparent", borderTop: "120px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: 420, width: 0, height: 0, borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderBottom: "70px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            <Image src={details?.logoUrl || "/company.svg"} alt="" width={56} height={56} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
          </div>
        </div>
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{details?.companyName || "Data Science Nigeria"}</h1>
        </div>
      </div>

      {/* ── Workplaces ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Workplaces</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Company Address</p>
          </div>
          <button onClick={() => router.push("/admin/company-details/workplaces")}
            style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Manage Workplaces
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {workplaces.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No workplaces added yet.</p>
          ) : (
            workplaces.map((w: any) => (
              <div key={w.id}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{w.displayName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>
                  <MapPin size={11} />
                  {[w.addressLine1, w.city, w.state, w.zipCode, w.country].filter(Boolean).join(", ")}
                </div>
                {w.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    <Phone size={11} /> {w.phone}
                  </div>
                )}
                {w.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    <Mail size={11} /> {w.email}
                  </div>
                )}
              </div>
            ))
          )}

        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
