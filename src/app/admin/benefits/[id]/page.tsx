"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Search, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Enrollment = {
  id: string
  employeeDeductionType: string
  employeeDeductionValue: number
  companyContributionType: string
  companyContributionValue: number
  effectiveDate: string
  employee: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: { name: string } }
}

type Benefit = {
  id: string; name: string; category: string; status: string; effectiveDate: string
  enrollments: Enrollment[]
}

function fmtDeduction(type: string, val: number) {
  if (type === "PERCENTAGE") return `${val}%`
  return `₦${val.toLocaleString("en-NG")}`
}

export default function BenefitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [benefit, setBenefit] = useState<Benefit | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/benefits/${id}`)
      .then(r => r.json())
      .then(d => { setBenefit(d.benefit ?? null); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!benefit) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Benefit not found.</div>
  )

  const filtered = benefit.enrollments.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${e.employee.firstName} ${e.employee.lastName}`.toLowerCase().includes(q) ||
      e.employee.department?.name.toLowerCase().includes(q)
  })

  return (
    <div>
      <button onClick={() => router.push("/admin/benefits")}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>
        <ArrowLeft size={14} /> Benefits
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{benefit.name}</h1>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            {benefit.category} · Effective {formatDate(benefit.effectiveDate)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push(`/admin/benefits/${id}/edit`)}
            style={{ padding: "9px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}
          >
            Edit benefit details
          </button>
          <button
            onClick={() => router.push(`/admin/benefits/${id}/enroll`)}
            style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" }}
          >
            Enroll employees
          </button>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative", width: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees"
              style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", outline: "none" }}
            />
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["SN", "Employee", "Employee Deduction", "Company Contribution", "Effective Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 60, textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--muted-foreground)" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="16" width="32" height="24" rx="3" />
                    <path d="M16 16V12a8 8 0 0 1 16 0v4" />
                  </svg>
                  <span style={{ fontSize: 13 }}>No data</span>
                </div>
              </td></tr>
            ) : filtered.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{i + 1}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.employee.firstName} {e.employee.lastName}</div>
                  {e.employee.department && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.employee.department.name}</div>}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{fmtDeduction(e.employeeDeductionType, e.employeeDeductionValue)}</td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{fmtDeduction(e.companyContributionType, e.companyContributionValue)}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{formatDate(e.effectiveDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
