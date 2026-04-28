"use client"
import { useState, useEffect } from "react"
import Card from "@/components/ui/Card"
import { Receipt, Download, Loader2, AlertCircle, ChevronDown, X } from "lucide-react"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n)

function printPayslip(p: Payslip) {
  const totalEarnings = p.basicSalary + p.housing + p.transport + p.meal + p.otherAllowances
  const totalDeductions = p.payeTax + p.pension + p.nhf + p.healthInsurance + p.otherDeductions
  const win = window.open("", "_blank", "width=700,height=900")
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head>
<title>Payslip – ${p.employee.firstName} ${p.employee.lastName} – ${FULL_MONTHS[p.month - 1]} ${p.year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 40px; max-width: 700px; margin: 0 auto }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #0B5C2E }
  .org { font-size: 22px; font-weight: 900; color: #0B5C2E; letter-spacing: -0.5px }
  .org-sub { font-size: 11px; color: #666; margin-top: 2px }
  .badge { background: #E6F4EA; color: #0B5C2E; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #c3e6cb }
  .period { font-size: 13px; font-weight: 700; color: #0B5C2E; text-align: right }
  .emp-card { background: #f8f9fa; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr }
  .emp-card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 3px }
  .emp-card .val { font-size: 13px; font-weight: 600; color: #111 }
  .emp-card .item { margin-bottom: 10px }
  h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0B5C2E; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px }
  td { font-size: 13px; padding: 8px 0; border-bottom: 1px solid #f0f0f0 }
  td:last-child { text-align: right; font-weight: 600 }
  .sub-total td { font-weight: 700; color: #0B5C2E; font-size: 13px; border-bottom: 2px solid #0B5C2E; border-top: 1px solid #d1d5db }
  .net-row { background: #0B5C2E; border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px }
  .net-row .lbl { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.06em }
  .net-row .amt { font-size: 22px; font-weight: 900; color: white }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px }
  .bank { background: #f8f9fa; border-radius: 8px; padding: 14px 16px; margin-top: 20px }
  .bank .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 3px }
  .bank .val { font-size: 13px; font-weight: 600 }
  .bank-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; display: flex; justify-content: space-between }
  @media print { body { padding: 20px } }
</style>
</head><body>
<div class="header">
  <div><div class="org">DSN HRMS</div><div class="org-sub">Data Science Nigeria</div></div>
  <div style="text-align:right">
    <div class="period">${FULL_MONTHS[p.month - 1]} ${p.year}</div>
    <div style="margin-top:6px"><span class="badge">PAYSLIP</span></div>
  </div>
</div>
<div class="emp-card">
  <div>
    <div class="item"><div class="lbl">Employee Name</div><div class="val">${p.employee.firstName} ${p.employee.lastName}</div></div>
    <div class="item"><div class="lbl">Employee ID</div><div class="val">${p.employee.employeeId}</div></div>
    <div class="item"><div class="lbl">Department</div><div class="val">${p.employee.department?.name ?? "—"}</div></div>
  </div>
  <div>
    <div class="item"><div class="lbl">Job Title</div><div class="val">${p.employee.jobTitle ?? "—"}</div></div>
    ${p.employee.tin ? `<div class="item"><div class="lbl">Tax ID (TIN)</div><div class="val">${p.employee.tin}</div></div>` : ""}
    ${p.employee.pensionPin ? `<div class="item"><div class="lbl">Pension PIN</div><div class="val">${p.employee.pensionPin}</div></div>` : ""}
  </div>
</div>
<div class="two-col">
  <div>
    <h3>Earnings</h3>
    <table>
      <tr><td>Basic Salary</td><td>${fmtN(p.basicSalary)}</td></tr>
      ${p.housing ? `<tr><td>Housing Allowance</td><td>${fmtN(p.housing)}</td></tr>` : ""}
      ${p.transport ? `<tr><td>Transport Allowance</td><td>${fmtN(p.transport)}</td></tr>` : ""}
      ${p.meal ? `<tr><td>Meal Allowance</td><td>${fmtN(p.meal)}</td></tr>` : ""}
      ${p.otherAllowances ? `<tr><td>Other Allowances</td><td>${fmtN(p.otherAllowances)}</td></tr>` : ""}
      <tr class="sub-total"><td>Total Earnings</td><td>${fmtN(totalEarnings)}</td></tr>
    </table>
  </div>
  <div>
    <h3>Deductions</h3>
    <table>
      ${p.payeTax ? `<tr><td>PAYE Tax</td><td>${fmtN(p.payeTax)}</td></tr>` : ""}
      ${p.pension ? `<tr><td>Pension (Employee)</td><td>${fmtN(p.pension)}</td></tr>` : ""}
      ${p.nhf ? `<tr><td>NHF Contribution</td><td>${fmtN(p.nhf)}</td></tr>` : ""}
      ${p.healthInsurance ? `<tr><td>Health Insurance</td><td>${fmtN(p.healthInsurance)}</td></tr>` : ""}
      ${p.otherDeductions ? `<tr><td>Other Deductions</td><td>${fmtN(p.otherDeductions)}</td></tr>` : ""}
      ${!p.payeTax && !p.pension && !p.nhf && !p.healthInsurance && !p.otherDeductions ? `<tr><td colspan="2" style="color:#999;font-size:12px">No deductions</td></tr>` : ""}
      <tr class="sub-total"><td>Total Deductions</td><td>${fmtN(totalDeductions)}</td></tr>
    </table>
  </div>
</div>
<div class="net-row"><div class="lbl">Net Pay</div><div class="amt">${fmtN(p.netPay)}</div></div>
${(p.employee.bankName || p.employee.bankAccountNo) ? `
<div class="bank">
  <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin-bottom:10px">Payment Details</div>
  <div class="bank-grid">
    ${p.employee.bankName ? `<div><div class="lbl">Bank</div><div class="val">${p.employee.bankName}</div></div>` : ""}
    ${p.employee.bankAccountNo ? `<div><div class="lbl">Account No.</div><div class="val">${p.employee.bankAccountNo}</div></div>` : ""}
    ${p.employee.bankAccountName ? `<div><div class="lbl">Account Name</div><div class="val">${p.employee.bankAccountName}</div></div>` : ""}
  </div>
</div>` : ""}
${p.notes ? `<div style="margin-top:16px;font-size:12px;color:#555;background:#f8f9fa;border-radius:8px;padding:10px 14px"><strong>Notes:</strong> ${p.notes}</div>` : ""}
<div class="footer">
  <span>Generated by DSN HRMS on ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</span>
  <span>This is a computer-generated payslip and does not require a signature.</span>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`)
  win.document.close()
}

interface Payslip {
  id: string
  month: number
  year: number
  grossSalary: number
  basicSalary: number
  housing: number
  transport: number
  meal: number
  otherAllowances: number
  payeTax: number
  pension: number
  nhf: number
  healthInsurance: number
  otherDeductions: number
  netPay: number
  status: "DRAFT" | "PENDING" | "RELEASED"
  notes: string | null
  releasedAt: string | null
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    jobTitle: string | null
    bankName: string | null
    bankAccountNo: string | null
    bankAccountName: string | null
    pensionPin: string | null
    tin: string | null
    nhfNo: string | null
    department: { name: string } | null
  }
}

function PayslipDetailModal({ ps, onClose, onPrint }: { ps: Payslip; onClose: () => void; onPrint: (p: Payslip) => void }) {
  const emp = ps.employee
  const earnings = ps.basicSalary + ps.housing + ps.transport + ps.meal + ps.otherAllowances
  const deductions = ps.payeTax + ps.pension + ps.nhf + ps.healthInsurance + ps.otherDeductions

  const row = (label: string, value: number, muted = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: muted ? "var(--muted-foreground)" : "var(--foreground)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: muted ? 400 : 600, color: muted ? "var(--muted-foreground)" : "var(--foreground)" }}>{fmtN(value)}</span>
    </div>
  )

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Payslip — {FULL_MONTHS[ps.month - 1]} {ps.year}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{emp.firstName} {emp.lastName} · {emp.employeeId}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Employee info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            {[
              ["Department", emp.department?.name],
              ["Job Title", emp.jobTitle],
              ["Bank", emp.bankName],
              ["Account No.", emp.bankAccountNo],
              ["Pension PIN", emp.pensionPin],
              ["TIN", emp.tin],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Earnings */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 4 }}>Earnings</div>
            {row("Basic Salary", ps.basicSalary)}
            {ps.housing > 0 && row("Housing Allowance", ps.housing, true)}
            {ps.transport > 0 && row("Transport Allowance", ps.transport, true)}
            {ps.meal > 0 && row("Meal Allowance", ps.meal, true)}
            {ps.otherAllowances > 0 && row("Other Allowances", ps.otherAllowances, true)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid var(--border)", marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Earnings</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--success)" }}>{fmtN(earnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 4 }}>Deductions</div>
            {ps.payeTax > 0 && row("PAYE Tax", ps.payeTax, true)}
            {ps.pension > 0 && row("Pension", ps.pension, true)}
            {ps.nhf > 0 && row("NHF", ps.nhf, true)}
            {ps.healthInsurance > 0 && row("Health Insurance", ps.healthInsurance, true)}
            {ps.otherDeductions > 0 && row("Other Deductions", ps.otherDeductions, true)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid var(--border)", marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Deductions</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#EF4444" }}>{fmtN(deductions)}</span>
            </div>
          </div>

          {/* Net Pay */}
          <div style={{ background: "var(--primary)", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: 14 }}>Net Pay</span>
            <span style={{ color: "white", fontWeight: 900, fontSize: 22 }}>{fmtN(ps.netPay)}</span>
          </div>

          {ps.notes && (
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>
              <strong>Note:</strong> {ps.notes}
            </div>
          )}

          {/* Print/download */}
          <button
            onClick={() => { onClose(); setTimeout(() => onPrint(ps), 100) }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white" }}
          >
            <Download size={14} /> Download / Print
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SSPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Payslip | null>(null)
  const [filterYear, setFilterYear] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterYear) params.set("year", filterYear)
    fetch(`/api/payslips?${params}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setPayslips(d.payslips ?? []); setLoading(false) })
      .catch(() => { setError("Failed to load payslips"); setLoading(false) })
  }, [filterYear])

  const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a)
  const filtered = filterYear ? payslips.filter(p => p.year === Number(filterYear)) : payslips

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>My Payslips</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>View and download your released payslips</p>
        </div>
        {years.length > 0 && (
          <div style={{ position: "relative" }}>
            <select
              value={filterYear}
              onChange={e => { setFilterYear(e.target.value); setLoading(true) }}
              style={{ padding: "8px 32px 8px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", cursor: "pointer", appearance: "none" }}
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted-foreground)" }} />
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "var(--muted-foreground)" }}>
          <Loader2 size={20} style={{ animation: "spin .8s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading payslips…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60, textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
          <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{error}</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
            <Receipt size={36} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>No payslips yet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Your released payslips will appear here once HR processes your salary.</div>
          </div>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(ps => {
            const earnings = ps.basicSalary + ps.housing + ps.transport + ps.meal + ps.otherAllowances
            return (
              <Card key={ps.id}>
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Receipt size={20} style={{ color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setSelected(ps)}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{FULL_MONTHS[ps.month - 1]} {ps.year}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      Gross: {fmtN(ps.grossSalary)} · Net: <strong style={{ color: "var(--foreground)" }}>{fmtN(ps.netPay)}</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "var(--success-bg, #E6F4EA)", color: "var(--success, #1A7336)", flexShrink: 0 }}>
                    Released
                  </div>
                  <button
                    onClick={() => printPayslip(ps)}
                    title="Download / Print"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--muted-foreground)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--background)" }}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {selected && <PayslipDetailModal ps={selected} onClose={() => setSelected(null)} onPrint={printPayslip} />}
    </div>
  )
}
