"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit2, MapPin, Phone, Mail, Loader2 } from "lucide-react"

export default function ManageWorkplacesPage() {
  const router = useRouter()
  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch("/api/company-details/workplaces")
    const d = await r.json()
    setWorkplaces(d.workplaces ?? [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={() => router.push("/admin/company-details")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, width: "fit-content" }}>
        <ArrowLeft size={14} /> Back to Company Details
      </button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Workplaces</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Company addresses</p>
          </div>
          <button onClick={() => router.push("/admin/company-details/workplaces/add")}
            style={{ padding: "7px 16px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} /> Add Workplace
          </button>
        </div>

        {workplaces.length === 0 ? (
          <div style={{ padding: "40px 20px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
            No workplaces added yet.
          </div>
        ) : (
          <div>
            {workplaces.map((wp: any, i: number) => (
              <div key={wp.id} style={{ padding: "16px 20px", borderBottom: i < workplaces.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{wp.displayName}</span>
                    {wp.isFiling && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "var(--primary-50, rgba(59,130,246,0.1))", color: "var(--primary)", border: "1px solid var(--primary-20, rgba(59,130,246,0.2))" }}>Primary</span>
                    )}
                    {!wp.isActive && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "var(--danger-bg)", color: "var(--accent)" }}>Inactive</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 3 }}>
                    <MapPin size={11} /> {[wp.addressLine1, wp.addressLine2, wp.city, wp.state, wp.zipCode, wp.country].filter(Boolean).join(", ")}
                  </div>
                  {wp.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)", marginBottom: 2 }}>
                      <Phone size={11} /> {wp.phone}
                    </div>
                  )}
                  {wp.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                      <Mail size={11} /> {wp.email}
                    </div>
                  )}
                </div>
                <button onClick={() => router.push(`/admin/company-details/workplaces/${wp.id}/edit`)}
                  style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "6px 8px", color: "var(--muted-foreground)", flexShrink: 0 }}>
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
