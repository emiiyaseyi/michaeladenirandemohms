"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, Gift } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Enrollment = {
  id: string
  employeeDeductionType: string
  employeeDeductionValue: number
  companyContributionType: string
  companyContributionValue: number
  effectiveDate: string
  benefit: { id: string; name: string; category: string; status: string }
}

function fmtDeduction(type: string, val: number) {
  if (type === "PERCENTAGE") return `${val}% of gross`
  return `₦${val.toLocaleString("en-NG")}`
}

export default function StaffBenefitsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  // Interns don't have access to benefits
  useEffect(() => {
    if ((session?.user as any)?.isIntern) {
      router.replace("/staff")
    }
  }, [session, router])

  useEffect(() => {
    fetch("/api/self-service/benefits")
      .then(r => r.json())
      .then(d => { setEnrollments(d.enrollments ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Benefits</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Your enrolled benefits and company contributions.</p>
      </div>

      {enrollments.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gift size={24} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No benefits enrolled</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 320 }}>
              You haven't been enrolled in any benefits yet.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {enrollments.map(e => (
            <div key={e.id} style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "16px 20px", background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{e.benefit.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>{e.benefit.category}</div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: e.benefit.status === "ACTIVE" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                  color: "white",
                }}>
                  {e.benefit.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </div>

              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Your Deduction
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                      {fmtDeduction(e.employeeDeductionType, e.employeeDeductionValue)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>per year</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Company Contribution
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>
                      {fmtDeduction(e.companyContributionType, e.companyContributionValue)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>per year</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Effective date</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(e.effectiveDate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
