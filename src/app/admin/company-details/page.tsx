"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Edit3, Loader2 } from "lucide-react"

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

  const filing  = workplaces.find((w: any) => w.isFiling)
  const mailing = workplaces.find((w: any) => w.isMailing)

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
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", height: 200, position: "relative", zIndex: 1 }}>
          <Image src={details?.logoUrl || "/company.png"} alt="" width={180} height={170} style={{ objectFit: "contain", objectPosition: "bottom" }} />
        </div>
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{details?.companyName || "Your Company"}</h1>
        </div>
        <button
          onClick={() => router.push("/admin/company-details/edit")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "white", color: "#15803d", border: "none", flexShrink: 0, position: "relative", zIndex: 1 }}>
          <Edit3 size={12} /> Edit Company Information
        </button>
      </div>

      {/* ── Workplaces ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Workplaces</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Filing &amp; Mailing Address</p>
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
            <>
              {filing && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Filing Address:</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{filing.displayName}</div>
                  <div style={{ fontSize: 13 }}>{[filing.addressLine1, filing.city, filing.state, filing.zipCode, filing.country].filter(Boolean).join(", ")}</div>
                </div>
              )}
              {mailing && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Mailing Address:</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{mailing.displayName}</div>
                  <div style={{ fontSize: 13 }}>{[mailing.addressLine1, mailing.city, mailing.state, mailing.zipCode, mailing.country].filter(Boolean).join(", ")}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
