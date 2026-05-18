"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import Card from "@/components/ui/Card"

interface ContractorFormData {
  name: string
  startDate: string
  country: string
  businessType: string
  state: string
  address: string
  companyRegNumber: string
  industry: string
  email: string
  phone: string
  paymentRoute: "LOCAL_BANK" | "INTERNATIONAL_BANK_TRANSFER"
  currency: string
  bankName: string
  accountNumber: string
}

interface Props {
  initial?: any
  onSubmit: (data: ContractorFormData) => Promise<boolean>
}

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD", "AUD"]
const BUSINESS_TYPES = ["Sole Proprietorship", "Partnership", "Limited Liability Company", "Corporation", "Non-Profit", "Other"]

export default function ContractorForm({ initial, onSubmit }: Props) {
  const router = useRouter()
  const isEdit = !!initial

  const [name, setName] = useState(initial?.name ?? "")
  const [startDate, setStartDate] = useState(initial?.startDate ? initial.startDate.split("T")[0] : "")
  const [country, setCountry] = useState(initial?.country ?? "")
  const [businessType, setBusinessType] = useState(initial?.businessType ?? "")
  const [state, setState] = useState(initial?.state ?? "")
  const [address, setAddress] = useState(initial?.address ?? "")
  const [companyRegNumber, setCompanyRegNumber] = useState(initial?.companyRegNumber ?? "")
  const [industry, setIndustry] = useState(initial?.industry ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [paymentRoute, setPaymentRoute] = useState<"LOCAL_BANK" | "INTERNATIONAL_BANK_TRANSFER">(initial?.paymentRoute ?? "LOCAL_BANK")
  const [currency, setCurrency] = useState(initial?.currency ?? "NGN")
  const [bankName, setBankName] = useState(initial?.bankName ?? "")
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "")
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fi: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 8,
    fontSize: 14, color: "var(--foreground)", background: "var(--card)", boxSizing: "border-box",
  }

  const label = (text: string, required?: boolean) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
      {text}{required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
    </div>
  )

  const card = (title: string, children: React.ReactNode) => (
    <Card title={title} style={{ marginBottom: 20 }}>
      {children}
    </Card>
  )

  const col2 = (a: React.ReactNode, b: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>{a}{b}</div>
  )

  const field = (labelText: string, input: React.ReactNode, required?: boolean) => (
    <div>
      {label(labelText, required)}
      {input}
    </div>
  )

  const submit = async () => {
    if (!name.trim()) { setError("Contractor name is required"); return }
    if (!confirmed) { setError("Please confirm that the information is accurate"); return }
    setSaving(true); setError("")
    const ok = await onSubmit({ name, startDate, country, businessType, state, address, companyRegNumber, industry, email, phone, paymentRoute, currency, bankName, accountNumber })
    setSaving(false)
    if (!ok) setError("Failed to save contractor")
  }

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Basic Details */}
      {card("Basic Details", (
        <>
          {col2(
            field("Contractor name", <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter contractor name" style={fi} />, true),
            field("Start date", <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fi} />, true)
          )}
          {col2(
            field("Country", <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Select country" style={fi} />),
            field("Business type", (
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ ...fi, appearance: "none" }}>
                <option value="">Select type</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ))
          )}
          {col2(
            field("State / Province", <input value={state} onChange={e => setState(e.target.value)} placeholder="Enter state or province" style={fi} />),
            field("Address", <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter address" style={fi} />)
          )}
          {col2(
            field("Company identification number", <input value={companyRegNumber} onChange={e => setCompanyRegNumber(e.target.value)} placeholder="Enter company reg. number" style={fi} />),
            field("Industry", <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology, Finance" style={fi} />)
          )}
        </>
      ))}

      {/* Contact Details */}
      {card("Contact details", (
        <>
          {col2(
            field("Contractor email", <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" style={fi} />),
            field("Phone number", <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" style={fi} />)
          )}
        </>
      ))}

      {/* Account Details */}
      {card("Account details", (
        <>
          {/* Warning banner */}
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: "var(--warning)", lineHeight: 1.5 }}>
              Make sure the bank account details are accurate. Incorrect details may result in failed payments.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            {label("Payment Route")}
            <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--foreground)", cursor: "pointer" }}>
                <input type="radio" checked={paymentRoute === "LOCAL_BANK"} onChange={() => setPaymentRoute("LOCAL_BANK")} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
                Local Bank
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--foreground)", cursor: "pointer" }}>
                <input type="radio" checked={paymentRoute === "INTERNATIONAL_BANK_TRANSFER"} onChange={() => setPaymentRoute("INTERNATIONAL_BANK_TRANSFER")} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
                International Bank Transfer
              </label>
            </div>
          </div>

          {col2(
            field("Default currency", (
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...fi, appearance: "none" }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ), true),
            field("Account number", <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Enter account number" style={fi} />)
          )}

          <div style={{ marginBottom: 0 }}>
            {label("Bank")}
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Enter bank name" style={fi} />
          </div>
        </>
      ))}

      {/* Confirmation + buttons */}
      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--accent-100)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)", marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--foreground)", cursor: "pointer" }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
          I confirm that the information provided is accurate and correct
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.back()} style={{ padding: "10px 24px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Back
          </button>
          <button onClick={submit} disabled={saving} style={{ padding: "10px 24px", background: saving ? "var(--primary-light)" : "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}
