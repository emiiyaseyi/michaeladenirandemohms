"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Building2, Inbox } from "lucide-react"

function formatDate(s: string | null | undefined) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--foreground)" }}>{value || "—"}</div>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: active ? "var(--success-bg)" : "var(--muted)", color: active ? "var(--success)" : "var(--muted-foreground)" }}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const cfg: Record<string, { bg: string; color: string }> = {
    PAID:    { bg: "var(--success-bg)",  color: "var(--success)" },
    PENDING: { bg: "var(--warning-bg)",  color: "var(--warning)" },
    FAILED:  { bg: "var(--danger-bg)",   color: "var(--danger)" },
  }
  const c = cfg[s] ?? cfg.PENDING
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  )
}

export default function ViewContractorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contractor, setContractor] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/contractors/${id}`).then(r => r.json()),
      fetch(`/api/contractors/${id}/payments`).then(r => r.json()),
    ]).then(([cd, pd]) => {
      setContractor(cd.contractor)
      setPayments(pd.payments ?? [])
      setLoading(false)
    })
  }, [id])

  const remove = async () => {
    if (!confirm("Delete this contractor? This cannot be undone.")) return
    await fetch(`/api/contractors/${id}`, { method: "DELETE" })
    router.push("/admin/contractors")
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>
  if (!contractor) return <div style={{ padding: 40, textAlign: "center", color: "var(--danger)" }}>Contractor not found</div>

  const th: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--muted)", borderBottom: "1px solid var(--border)" }
  const td: React.CSSProperties = { padding: "14px 16px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--foreground)" }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={26} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)" }}>{contractor.name}</div>
              <div style={{ marginTop: 4 }}><StatusBadge active={contractor.isActive} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push(`/admin/contractors/${id}/edit`)}
              style={{ padding: "9px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Edit
            </button>
            <button
              onClick={remove}
              style={{ padding: "9px 20px", background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--accent-100)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Overview + Contact 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Overview */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Overview</div>
          <div style={{ padding: "20px 24px" }}>
            <InfoRow label="Country" value={contractor.country} />
            <InfoRow label="Address" value={contractor.address} />
            <InfoRow label="Business Type" value={contractor.businessType} />
            <InfoRow label="Company Registration Number" value={contractor.companyRegNumber} />
            <InfoRow label="Payment Method" value={contractor.paymentRoute === "LOCAL_BANK" ? "Local Bank" : contractor.paymentRoute === "INTERNATIONAL_BANK_TRANSFER" ? "International Bank Transfer" : contractor.paymentRoute} />
            <InfoRow label="Start Date" value={formatDate(contractor.startDate)} />
          </div>
        </div>

        {/* Contact + Account */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Contact Information</div>
            <div style={{ padding: "20px 24px" }}>
              <InfoRow label="Email" value={contractor.email} />
              <InfoRow label="Phone" value={contractor.phone} />
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Account Information</div>
            <div style={{ padding: "20px 24px" }}>
              <InfoRow label="Default Currency" value={contractor.currency} />
              <InfoRow label="Bank" value={contractor.bankName} />
              <InfoRow label="Account Number" value={contractor.accountNumber} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Payment History</div>
        {payments.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Inbox size={32} strokeWidth={1} style={{ color: "var(--border-strong)", display: "block", margin: "0 auto 10px" }} />
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No data</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Contractor</th>
                  <th style={th}>Description</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Bank</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={td}>{contractor.name}</td>
                    <td style={td}>{p.description ?? "—"}</td>
                    <td style={td}>{contractor.currency} {p.amount.toLocaleString()}</td>
                    <td style={td}>{p.bank ?? "—"}</td>
                    <td style={td}><PaymentStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
