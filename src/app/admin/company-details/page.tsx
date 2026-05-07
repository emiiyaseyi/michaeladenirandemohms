"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Edit3, Building2, Mail, Phone, Loader2, MapPin, DollarSign, Shield, Users, Info, X, Check } from "lucide-react"
import Modal from "@/components/ui/Modal"
import Avatar from "@/components/ui/Avatar"

// ── Shared styles ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
}
const sectionHeader = (action?: React.ReactNode): React.ReactNode => null // unused, done inline
const fi: React.CSSProperties = {
  width: "100%", padding: "9px 13px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value || "—"}</span>
    </div>
  )
}

function InfoBanner({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, color: "#1E40AF", marginBottom: 20 }}>
      <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {text}
    </div>
  )
}

function RefModal({ open, onClose, title, notice, refNum, setRefNum, saving, onSave }: {
  open: boolean; onClose: () => void; title: string; notice: string;
  refNum: string; setRefNum: (v: string) => void; saving: boolean; onSave: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={520}>
      <div style={{ padding: 24 }}>
        <InfoBanner text={notice} />
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Reference Number <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input value={refNum} onChange={e => setRefNum(e.target.value)} style={fi} placeholder="Enter reference number" />
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onClose} style={{ padding: "8px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={onSave} disabled={saving} style={{ padding: "8px 22px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
        </button>
      </div>
    </Modal>
  )
}

const COMPANY_TYPES = [
  "Private Limited Company (LTD)",
  "Public Limited Company (PLC)",
  "Public Unlimited Company (PUC)",
  "Sole Proprietorship",
  "C Corporation",
  "Non-profit Organization",
]

export default function CompanyDetailsPage() {
  const router = useRouter()

  const [details, setDetails] = useState<any>(null)
  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [signatories, setSignatories] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Tax modal
  const [taxOpen, setTaxOpen] = useState(false)
  const [taxForm, setTaxForm] = useState({ companyType: "", tin: "", filingSchedule: "Monthly" })
  const [taxSaving, setTaxSaving] = useState(false)

  // Ref modals
  const [pensionOpen, setPensionOpen] = useState(false)
  const [pensionRef, setPensionRef] = useState("")
  const [pensionSaving, setPensionSaving] = useState(false)

  const [nhfOpen, setNhfOpen] = useState(false)
  const [nhfRef, setNhfRef] = useState("")
  const [nhfSaving, setNhfSaving] = useState(false)

  const [nsitfOpen, setNsitfOpen] = useState(false)
  const [nsitfRef, setNsitfRef] = useState("")
  const [nsitfSaving, setNsitfSaving] = useState(false)

  const [itfOpen, setItfOpen] = useState(false)
  const [itfRef, setItfRef] = useState("")
  const [itfSaving, setItfSaving] = useState(false)

  // Signatory modal
  const [sigOpen, setSigOpen] = useState(false)
  const [sigEmployee, setSigEmployee] = useState("")
  const [sigSearch, setSigSearch] = useState("")
  const [sigSaving, setSigSaving] = useState(false)
  const [sigDropdown, setSigDropdown] = useState(false)

  const [toast, setToast] = useState("")

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [dr, wr, cr, sr, er] = await Promise.all([
      fetch("/api/company-details").then(r => r.json()),
      fetch("/api/company-details/workplaces").then(r => r.json()),
      fetch("/api/company-details/compliance").then(r => r.json()),
      fetch("/api/company-details/signatories").then(r => r.json()),
      fetch("/api/employees?status=ACTIVE&limit=500").then(r => r.json()),
    ])
    setDetails(dr.details)
    setWorkplaces(wr.workplaces ?? [])
    setCompliance(cr)
    setSignatories(sr.signatories ?? [])
    setEmployees(er.employees ?? [])
    const tax = cr?.company_tax ?? {}
    setTaxForm({ companyType: tax.companyType ?? "", tin: tax.tin ?? "", filingSchedule: tax.filingSchedule ?? "Monthly" })
    setPensionRef(cr?.company_pension?.referenceNumber ?? "")
    setNhfRef(cr?.company_nhf?.referenceNumber ?? "")
    setNsitfRef(cr?.company_nsitf?.referenceNumber ?? "")
    setItfRef(cr?.company_itf?.referenceNumber ?? "")
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 2500)
  }

  async function saveTax() {
    setTaxSaving(true)
    await fetch("/api/company-details/compliance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "company_tax", ...taxForm }) })
    await loadAll()
    setTaxSaving(false)
    setTaxOpen(false)
    showToast("Tax info saved")
  }

  async function saveRef(type: string, ref: string, setSaving: (v: boolean) => void, setOpen: (v: boolean) => void) {
    setSaving(true)
    await fetch("/api/company-details/compliance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, referenceNumber: ref }) })
    await loadAll()
    setSaving(false)
    setOpen(false)
    showToast("Saved")
  }

  async function addSignatory() {
    if (!sigEmployee) return
    setSigSaving(true)
    const r = await fetch("/api/company-details/signatories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId: sigEmployee }) })
    const d = await r.json()
    setSigSaving(false)
    if (!r.ok) { alert(d.error); return }
    setSignatories(prev => [...prev, d.signatory])
    setSigOpen(false); setSigEmployee(""); setSigSearch("")
    showToast("Signatory added")
  }

  async function removeSignatory(id: string) {
    if (!confirm("Remove this signatory?")) return
    await fetch(`/api/company-details/signatories/${id}`, { method: "DELETE" })
    setSignatories(prev => prev.filter((s: any) => s.id !== id))
    showToast("Signatory removed")
  }

  const filing = workplaces.find((w: any) => w.isFiling)
  const mailing = workplaces.find((w: any) => w.isMailing)

  const filteredEmp = employees.filter((e: any) =>
    !signatories.some((s: any) => s.employeeId === e.id) &&
    (`${e.firstName} ${e.lastName}`).toLowerCase().includes(sigSearch.toLowerCase())
  )
  const selectedEmp = employees.find((e: any) => e.id === sigEmployee)

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

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 200, background: "#22c55e", color: "white", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <Check size={14} /> {toast}
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div style={{ background: "#16a34a", borderRadius: 8, padding: "0 36px", display: "flex", alignItems: "center", gap: 32, minHeight: 200, overflow: "hidden", position: "relative" }}>
        {/* Triangle decorations */}
        <div style={{ position: "absolute", top: -40, right: 120, width: 0, height: 0, borderLeft: "90px solid transparent", borderRight: "90px solid transparent", borderBottom: "160px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 10, right: 260, width: 0, height: 0, borderLeft: "55px solid transparent", borderRight: "55px solid transparent", borderBottom: "100px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, right: 60, width: 0, height: 0, borderLeft: "70px solid transparent", borderRight: "70px solid transparent", borderTop: "120px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: 420, width: 0, height: 0, borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderBottom: "70px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", height: 200, position: "relative", zIndex: 1 }}>
          <Image src="/company.png" alt="" width={180} height={170} style={{ objectFit: "contain", objectPosition: "bottom" }} />
        </div>
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{details?.companyName || "Your Company"}</h1>
        </div>
        <button
          onClick={() => router.push("/admin/company-details/edit")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "white", color: "#15803d", border: "none", flexShrink: 0, position: "relative", zIndex: 1 }}
        >
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
              {mailing && mailing.id !== filing?.id && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Mailing Address:</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{mailing.displayName}</div>
                  <div style={{ fontSize: 13 }}>{[mailing.addressLine1, mailing.city, mailing.state, mailing.zipCode, mailing.country].filter(Boolean).join(", ")}</div>
                </div>
              )}
              {mailing && mailing.id === filing?.id && (
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

      {/* ── Pay Schedule ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Pay Schedule</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Pay frequency</p>
          </div>
          <button onClick={() => router.push("/admin/calendar")} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Preview upcoming paydays
          </button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Dynamic</span>
        </div>
      </div>

      {/* ── Tax Setup ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Tax Setup</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Please make sure that your tax setup below is accurate.</p>
          </div>
          <button onClick={() => setTaxOpen(true)} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Edit</button>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
          <Row label="Tax Identification Number" value={compliance?.company_tax?.tin} />
          <Row label="Company Type" value={compliance?.company_tax?.companyType} />
          <Row label="Filing Schedule" value={compliance?.company_tax?.filingSchedule || "Monthly"} />
        </div>
      </div>

      {/* ── Pension Setup ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Pension Setup</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Please make sure that your pension setup below is accurate if you want us to remit pension for you</p>
          </div>
          <button onClick={() => setPensionOpen(true)} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Edit</button>
        </div>
        <div style={{ padding: 20 }}>
          <Row label="Reference Number" value={compliance?.company_pension?.referenceNumber} />
        </div>
      </div>

      {/* ── NHF Setup ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>NHF Setup</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Please make sure that your NHF setup below is accurate if you want us to remit NHF for you.</p>
          </div>
          <button onClick={() => setNhfOpen(true)} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Edit</button>
        </div>
        <div style={{ padding: 20 }}>
          <Row label="Reference Number" value={compliance?.company_nhf?.referenceNumber} />
        </div>
      </div>

      {/* ── NSITF Setup ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>NSITF Setup</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Please make sure that your NSITF setup below is accurate if you want us to remit NSITF for you.</p>
          </div>
          <button onClick={() => setNsitfOpen(true)} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Edit</button>
        </div>
        <div style={{ padding: 20 }}>
          <Row label="Reference Number" value={compliance?.company_nsitf?.referenceNumber} />
        </div>
      </div>

      {/* ── ITF Setup ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>ITF Setup</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Please make sure that your ITF setup below is accurate if you want us to remit ITF for you.</p>
          </div>
          <button onClick={() => setItfOpen(true)} style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>Edit</button>
        </div>
        <div style={{ padding: 20 }}>
          <Row label="Reference Number" value={compliance?.company_itf?.referenceNumber} />
        </div>
      </div>

      {/* ── Company Signatories ── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1, maxWidth: 600 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Company Signatories</h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.5 }}>The Company Signatories are responsible for electronically signing all documents created on this platform. When a new form is available to be e-signed, the Signatories are notified to electronically sign it online</p>
          </div>
          <button onClick={() => { setSigOpen(true); setSigEmployee(""); setSigSearch("") }}
            style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer", flexShrink: 0 }}>
            Add a new signatory
          </button>
        </div>
        {signatories.length > 0 && (
          <div>
            {signatories.map((s: any) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                <Avatar name={`${s.employee.firstName} ${s.employee.lastName}`} photo={s.employee.profilePhoto} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.employee.firstName} {s.employee.lastName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s.employee.jobTitle ?? "—"}</div>
                </div>
                <button onClick={() => removeSignatory(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 600, padding: "4px 8px" }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tax Modal ── */}
      <Modal open={taxOpen} onClose={() => setTaxOpen(false)} title="Edit Tax Info" width={520}>
        <div style={{ padding: 24 }}>
          <InfoBanner text="We won't file your tax unless you ask us to." />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Company Type <span style={{ color: "var(--accent)" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <select value={taxForm.companyType} onChange={e => setTaxForm(f => ({ ...f, companyType: e.target.value }))} style={{ ...fi, appearance: "none" }}>
                <option value="">Please select</option>
                {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tax Identification Number</label>
            <input value={taxForm.tin} onChange={e => setTaxForm(f => ({ ...f, tin: e.target.value }))} style={fi} placeholder="e.g. 20285389-0001" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2 }}>Filing Schedule</label>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{taxForm.filingSchedule || "Monthly"}</span>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setTaxOpen(false)} style={{ padding: "8px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveTax} disabled={taxSaving} style={{ padding: "8px 22px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", cursor: taxSaving ? "wait" : "pointer", opacity: taxSaving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {taxSaving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </Modal>

      {/* ── Pension Modal ── */}
      <RefModal open={pensionOpen} onClose={() => setPensionOpen(false)} title="Company Pension Reference Number"
        notice="We wont remit your pension unless you ask us to."
        refNum={pensionRef} setRefNum={setPensionRef} saving={pensionSaving}
        onSave={() => saveRef("company_pension", pensionRef, setPensionSaving, setPensionOpen)} />

      {/* ── NHF Modal ── */}
      <RefModal open={nhfOpen} onClose={() => setNhfOpen(false)} title="Company NHF Reference Number"
        notice="We won't remit your NHF unless you ask us to."
        refNum={nhfRef} setRefNum={setNhfRef} saving={nhfSaving}
        onSave={() => saveRef("company_nhf", nhfRef, setNhfSaving, setNhfOpen)} />

      {/* ── NSITF Modal ── */}
      <RefModal open={nsitfOpen} onClose={() => setNsitfOpen(false)} title="Company NSITF Reference Number"
        notice="We won't remit your NSITF unless you ask us to."
        refNum={nsitfRef} setRefNum={setNsitfRef} saving={nsitfSaving}
        onSave={() => saveRef("company_nsitf", nsitfRef, setNsitfSaving, setNsitfOpen)} />

      {/* ── ITF Modal ── */}
      <RefModal open={itfOpen} onClose={() => setItfOpen(false)} title="Company ITF Reference Number"
        notice="We won't remit your ITF unless you ask us to."
        refNum={itfRef} setRefNum={setItfRef} saving={itfSaving}
        onSave={() => saveRef("company_itf", itfRef, setItfSaving, setItfOpen)} />

      {/* ── Add Signatory Modal ── */}
      <Modal open={sigOpen} onClose={() => setSigOpen(false)} title="Add new Company Signatory" width={520}>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.6 }}>
            The company signatories are responsible for electronically signing all documents created on this platform. When a new form is available to be e-signed, the Signatories are notified to electronically sign it online.
          </p>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Company signatory <span style={{ color: "var(--accent)" }}>*</span></label>
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setSigDropdown(d => !d)}
              style={{ ...fi, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
              {selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : <span style={{ color: "var(--muted-foreground)" }}>Please select</span>}
            </div>
            {sigDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 260, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                  <input autoFocus value={sigSearch} onChange={e => setSigSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13 }} />
                </div>
                <div style={{ overflowY: "auto" }}>
                  {filteredEmp.map((e: any) => (
                    <div key={e.id} onClick={() => { setSigEmployee(e.id); setSigDropdown(false); setSigSearch("") }}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, background: e.id === sigEmployee ? "var(--muted)" : "transparent" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = e.id === sigEmployee ? "var(--muted)" : "transparent"}
                    >
                      {e.firstName} {e.lastName}
                    </div>
                  ))}
                  {filteredEmp.length === 0 && <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>No employees found</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setSigOpen(false)} style={{ padding: "8px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={addSignatory} disabled={!sigEmployee || sigSaving} style={{ padding: "8px 22px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", cursor: (!sigEmployee || sigSaving) ? "not-allowed" : "pointer", opacity: (!sigEmployee || sigSaving) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {sigSaving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
