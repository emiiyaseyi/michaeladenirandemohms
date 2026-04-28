"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import Avatar from "@/components/ui/Avatar"
import {
  Receipt, Upload, CheckCircle, Clock, Edit3, Eye, Send,
  Calendar, Download, Plus, Trash2, Search, X, ChevronDown,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type PayslipStatus = "DRAFT" | "PENDING" | "RELEASED"

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeId: string
  jobTitle: string | null
  grossSalary: number | null
  department: { name: string } | null
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
  status: PayslipStatus
  notes: string | null
  releasedAt: string | null
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    jobTitle: string | null
    profilePhoto: string | null
    bankName: string | null
    bankAccountNo: string | null
    bankAccountName: string | null
    pensionPin: string | null
    tin: string | null
    nhfNo: string | null
    department: { name: string } | null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n)

const STATUS_STYLE: Record<PayslipStatus, { bg: string; color: string; label: string }> = {
  DRAFT:    { bg: "var(--muted)", color: "var(--muted-foreground)", label: "Draft" },
  PENDING:  { bg: "#FFF7E6", color: "#B45309", label: "Pending Release" },
  RELEASED: { bg: "var(--success-bg, #E6F4EA)", color: "var(--success, #1A7336)", label: "Released" },
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)",
  boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--muted-foreground)" }

const numInp: React.CSSProperties = { ...inp, textAlign: "right" as const }

type Tab = "all" | "DRAFT" | "PENDING" | "RELEASED"

// ─── Print helper ─────────────────────────────────────────────────────────────

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
  @media print { button { display: none } body { padding: 20px } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="org">DSN HRMS</div>
    <div class="org-sub">Data Science Nigeria</div>
  </div>
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

<div class="net-row">
  <div class="lbl">Net Pay</div>
  <div class="amt">${fmtN(p.netPay)}</div>
</div>

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayslipsPage() {
  const [payslips, setPayslips]     = useState<Payslip[]>([])
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>("all")
  const [searchQ, setSearchQ]       = useState("")

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [viewEntry, setViewEntry]   = useState<Payslip | null>(null)
  const [editEntry, setEditEntry]   = useState<Payslip | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [releasing, setReleasing]   = useState(false)

  // Filter state
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(0) // 0 = all

  // Create form
  const emptyForm = {
    employeeId: "", month: new Date().getMonth() + 1, year: currentYear,
    grossSalary: 0, basicSalary: 0,
    housing: 0, transport: 0, meal: 0, otherAllowances: 0,
    payeTax: 0, pension: 0, nhf: 0, healthInsurance: 0, otherDeductions: 0,
    notes: "", status: "DRAFT" as PayslipStatus,
  }
  const [form, setForm] = useState(emptyForm)
  const [empSearch, setEmpSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTab !== "all") params.set("status", activeTab)
    if (filterMonth) params.set("month", String(filterMonth))
    params.set("year", String(filterYear))
    const res = await fetch(`/api/payslips?${params}`)
    const data = await res.json()
    setPayslips(data.payslips ?? [])
    setEmployees(data.employees ?? [])
    setLoading(false)
  }, [activeTab, filterYear, filterMonth])

  useEffect(() => { load() }, [load])

  const filtered = payslips.filter(p => {
    if (!searchQ) return true
    const q = searchQ.toLowerCase()
    return (
      `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase().includes(q) ||
      p.employee.employeeId.toLowerCase().includes(q) ||
      (p.employee.department?.name ?? "").toLowerCase().includes(q)
    )
  })

  const stats = {
    total: payslips.length,
    released: payslips.filter(p => p.status === "RELEASED").length,
    pending: payslips.filter(p => p.status === "PENDING").length,
    draft: payslips.filter(p => p.status === "DRAFT").length,
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "DRAFT", label: "Draft", count: stats.draft },
    { key: "PENDING", label: "Pending Release", count: stats.pending },
    { key: "RELEASED", label: "Released", count: stats.released },
  ]

  // Auto-fill when employee is selected in create form
  const selectedEmp = employees.find(e => e.id === form.employeeId)
  useEffect(() => {
    if (selectedEmp?.grossSalary) {
      const g = selectedEmp.grossSalary
      const basic = Math.round(g * 0.5)
      const housing = Math.round(g * 0.2)
      const transport = Math.round(g * 0.1)
      const meal = Math.round(g * 0.05)
      const otherAllowances = g - basic - housing - transport - meal
      const pension = Math.round(g * 0.08)
      const nhf = Math.round(g * 0.025)
      const payeTax = Math.round((g - pension - nhf) * 0.07)
      setForm(f => ({
        ...f, grossSalary: g, basicSalary: basic,
        housing, transport, meal, otherAllowances: Math.max(0, otherAllowances),
        pension, nhf, payeTax,
      }))
    }
  }, [selectedEmp])

  async function save() {
    setSaving(true)
    try {
      const url = editEntry ? `/api/payslips/${editEntry.id}` : "/api/payslips"
      const method = editEntry ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setCreateOpen(false)
        setEditEntry(null)
        setForm(emptyForm)
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: PayslipStatus) {
    await fetch(`/api/payslips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  async function releaseAll() {
    setReleasing(true)
    try {
      await fetch("/api/payslips/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: filterMonth || undefined, year: filterYear }),
      })
      await load()
    } finally {
      setReleasing(false)
    }
  }

  async function del() {
    if (!deleteId) return
    await fetch(`/api/payslips/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    await load()
  }

  function openEdit(p: Payslip) {
    setForm({
      employeeId: p.employee.id,
      month: p.month, year: p.year,
      grossSalary: p.grossSalary, basicSalary: p.basicSalary,
      housing: p.housing, transport: p.transport, meal: p.meal, otherAllowances: p.otherAllowances,
      payeTax: p.payeTax, pension: p.pension, nhf: p.nhf, healthInsurance: p.healthInsurance,
      otherDeductions: p.otherDeductions,
      notes: p.notes ?? "", status: p.status,
    })
    setEditEntry(p)
    setCreateOpen(true)
  }

  const formEarnings = form.basicSalary + form.housing + form.transport + form.meal + form.otherAllowances
  const formDeductions = form.payeTax + form.pension + form.nhf + form.healthInsurance + form.otherDeductions
  const formNetPay = formEarnings - formDeductions

  const filteredEmps = employees.filter(e =>
    !empSearch || `${e.firstName} ${e.lastName} ${e.employeeId}`.toLowerCase().includes(empSearch.toLowerCase())
  )

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Payslip Management</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>Manage and distribute employee payslips</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {stats.pending > 0 && (
            <Button
              variant="secondary"
              onClick={releaseAll}
              disabled={releasing}
              style={{ borderColor: "var(--success, #1A7336)", color: "var(--success, #1A7336)" }}
            >
              <Send size={14} /> {releasing ? "Releasing…" : `Release All (${stats.pending})`}
            </Button>
          )}
          <Button onClick={() => { setForm(emptyForm); setEditEntry(null); setCreateOpen(true) }}>
            <Plus size={14} /> New Payslip
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: stats.total, icon: Receipt, color: "var(--primary)" },
          { label: "Released", value: stats.released, icon: CheckCircle, color: "var(--success, #1A7336)" },
          { label: "Pending Release", value: stats.pending, icon: Clock, color: "#B45309" },
          { label: "Draft", value: stats.draft, icon: Edit3, color: "var(--muted-foreground)" },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{s.label}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Table ── */}
      <Card>
        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: activeTab === t.key ? 700 : 400,
                  border: "1px solid", borderRadius: 6, cursor: "pointer", transition: "all 0.12s",
                  background: activeTab === t.key ? "var(--primary)" : "transparent",
                  borderColor: activeTab === t.key ? "var(--primary)" : "var(--border)",
                  color: activeTab === t.key ? "white" : "var(--muted-foreground)",
                }}
              >
                {t.label}
                {t.key !== "all" && t.count > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, background: activeTab === t.key ? "rgba(255,255,255,0.2)" : "var(--muted)", color: activeTab === t.key ? "white" : "var(--muted-foreground)", borderRadius: 99, padding: "0 5px" }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {/* Year filter */}
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }}>
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {/* Month filter */}
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }}>
            <option value={0}>All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 6, padding: "6px 10px", border: "1px solid var(--border)" }}>
            <Search size={13} style={{ color: "var(--muted-foreground)" }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search employee…"
              style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--foreground)", outline: "none", width: 140 }} />
            {searchQ && <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}><X size={12} /></button>}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Employee", "Dept", "Period", "Gross", "Deductions", "Net Pay", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", position: "sticky", right: 0, background: "var(--card)", zIndex: 2, boxShadow: "-2px 0 6px rgba(0,0,0,0.06)", minWidth: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No payslips found.</td></tr>
              ) : filtered.map(p => {
                const st = STATUS_STYLE[p.status]
                const totalDed = p.payeTax + p.pension + p.nhf + p.healthInsurance + p.otherDeductions
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar name={`${p.employee.firstName} ${p.employee.lastName}`} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.employee.firstName} {p.employee.lastName}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{p.employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted-foreground)" }}>{p.employee.department?.name ?? "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{MONTHS[p.month - 1]} {p.year}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtN(p.grossSalary)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#DC2626" }}>{totalDed > 0 ? `–${fmtN(totalDed)}` : "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>{fmtN(p.netPay)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{st.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", position: "sticky", right: 0, background: "var(--card)", boxShadow: "-2px 0 6px rgba(0,0,0,0.06)", zIndex: 1 }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => setViewEntry(p)}
                          title="View payslip"
                          style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => printPayslip(p)}
                          title="Download / Print"
                          style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <Download size={13} />
                        </button>
                        {p.status !== "RELEASED" && (
                          <button onClick={() => openEdit(p)}
                            title="Edit"
                            style={{ background: "var(--muted)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                            <Edit3 size={13} />
                          </button>
                        )}
                        {p.status === "DRAFT" && (
                          <button onClick={() => updateStatus(p.id, "PENDING")}
                            title="Submit for release"
                            style={{ background: "#EEF2FF", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4F46E5", fontWeight: 600 }}>
                            <Send size={12} />
                          </button>
                        )}
                        {p.status === "PENDING" && (
                          <button onClick={() => updateStatus(p.id, "RELEASED")}
                            title="Release to employee"
                            style={{ background: "var(--success-bg, #E6F4EA)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--success, #1A7336)", fontWeight: 600 }}>
                            <CheckCircle size={12} />
                          </button>
                        )}
                        {p.status !== "RELEASED" && (
                          <button onClick={() => setDeleteId(p.id)}
                            title="Delete"
                            style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#DC2626" }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditEntry(null) }}
        title={editEntry ? "Edit Payslip" : "Create Payslip"} width={680}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>

          {/* Employee selector */}
          {!editEntry && (
            <div>
              <label style={labelStyle}>Employee *</label>
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", border: `1px solid ${form.employeeId ? "var(--primary)" : "var(--border)"}` }}>
                  <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employee name or ID…"
                    style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--foreground)", outline: "none", flex: 1 }} />
                </div>
                {empSearch && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                    {filteredEmps.slice(0, 10).map(e => (
                      <button key={e.id}
                        onClick={() => { setForm(f => ({ ...f, employeeId: e.id })); setEmpSearch(`${e.firstName} ${e.lastName} (${e.employeeId})`) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)", textAlign: "left" }}
                        onMouseEnter={e2 => { (e2.currentTarget as HTMLElement).style.background = "var(--muted)" }}
                        onMouseLeave={e2 => { (e2.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <Avatar name={`${e.firstName} ${e.lastName}`} size={28} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{e.employeeId} · {e.department?.name ?? ""}</div>
                        </div>
                        {e.grossSalary && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{fmtN(e.grossSalary)}</span>}
                      </button>
                    ))}
                    {filteredEmps.length === 0 && <div style={{ padding: 14, fontSize: 12, color: "var(--muted-foreground)" }}>No employees found</div>}
                  </div>
                )}
              </div>
              {form.employeeId && selectedEmp && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--primary-50, #EBF3FF)", borderRadius: 8, border: "1px solid var(--primary)" }}>
                  <Avatar name={`${selectedEmp.firstName} ${selectedEmp.lastName}`} size={28} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{selectedEmp.firstName} {selectedEmp.lastName}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{selectedEmp.department?.name ?? ""} · {selectedEmp.jobTitle ?? ""}</div>
                  </div>
                  <button onClick={() => { setForm(f => ({ ...f, employeeId: "" })); setEmpSearch("") }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={14} /></button>
                </div>
              )}
            </div>
          )}

          {/* Month / Year */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            <div>
              <label style={labelStyle}>Month *</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} style={{ ...inp, cursor: "pointer" }}>
                {FULL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Year *</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} style={{ ...inp, cursor: "pointer" }}>
                {[currentYear + 1, currentYear, currentYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Gross Salary */}
          <div>
            <label style={labelStyle}>Gross Salary (₦) *</label>
            <input type="number" value={form.grossSalary || ""} onChange={e => setForm(f => ({ ...f, grossSalary: Number(e.target.value) }))} style={numInp} placeholder="0.00" />
          </div>

          {/* Earnings breakdown */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--primary)", marginBottom: 14 }}>Earnings Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              {[
                { key: "basicSalary", label: "Basic Salary *" },
                { key: "housing", label: "Housing Allowance" },
                { key: "transport", label: "Transport Allowance" },
                { key: "meal", label: "Meal Allowance" },
                { key: "otherAllowances", label: "Other Allowances" },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type="number" value={(form as any)[f.key] || ""} onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))} style={numInp} placeholder="0.00" />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <div style={{ width: "100%", background: "var(--muted)", borderRadius: 8, padding: "9px 12px", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>TOTAL EARNINGS</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--success, #1A7336)" }}>{fmtN(formEarnings)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Deductions breakdown */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#DC2626", marginBottom: 14 }}>Deductions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              {[
                { key: "payeTax", label: "PAYE Tax" },
                { key: "pension", label: "Pension (8%)" },
                { key: "nhf", label: "NHF Contribution" },
                { key: "healthInsurance", label: "Health Insurance" },
                { key: "otherDeductions", label: "Other Deductions" },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type="number" value={(form as any)[f.key] || ""} onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))} style={numInp} placeholder="0.00" />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <div style={{ width: "100%", background: "var(--muted)", borderRadius: 8, padding: "9px 12px", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>TOTAL DEDUCTIONS</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#DC2626" }}>–{fmtN(formDeductions)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div style={{ background: "var(--primary)", borderRadius: 10, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Net Pay</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{fmtN(formNetPay)}</div>
          </div>

          {/* Notes & status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            <div>
              <label style={labelStyle}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="Optional" />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PayslipStatus }))} style={{ ...inp, cursor: "pointer" }}>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending Release</option>
                <option value="RELEASED">Released</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditEntry(null) }}>Cancel</Button>
          <Button onClick={save} disabled={saving || (!editEntry && !form.employeeId) || !form.basicSalary}>
            {saving ? "Saving…" : editEntry ? "Save Changes" : "Create Payslip"}
          </Button>
        </div>
      </Modal>

      {/* ── View Payslip Modal ── */}
      {viewEntry && (
        <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title="Payslip Preview" width={560}>
          <div style={{ padding: 24 }}>
            {/* Employee header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <Avatar name={`${viewEntry.employee.firstName} ${viewEntry.employee.lastName}`} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{viewEntry.employee.firstName} {viewEntry.employee.lastName}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {viewEntry.employee.employeeId} · {viewEntry.employee.department?.name ?? "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{FULL_MONTHS[viewEntry.month - 1]} {viewEntry.year}</div>
                <span style={{ fontSize: 11, fontWeight: 700, background: STATUS_STYLE[viewEntry.status].bg, color: STATUS_STYLE[viewEntry.status].color, borderRadius: 999, padding: "2px 9px", marginTop: 4, display: "inline-block" }}>
                  {STATUS_STYLE[viewEntry.status].label}
                </span>
              </div>
            </div>

            {/* Earnings / Deductions columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "var(--muted)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--success, #1A7336)", marginBottom: 10 }}>Earnings</div>
                {[
                  ["Basic Salary", viewEntry.basicSalary],
                  ["Housing", viewEntry.housing],
                  ["Transport", viewEntry.transport],
                  ["Meal", viewEntry.meal],
                  ["Other", viewEntry.otherAllowances],
                ].filter(([,v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{fmtN(Number(v))}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "var(--success, #1A7336)" }}>
                  <span>Total</span><span>{fmtN(viewEntry.basicSalary + viewEntry.housing + viewEntry.transport + viewEntry.meal + viewEntry.otherAllowances)}</span>
                </div>
              </div>
              <div style={{ background: "var(--muted)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#DC2626", marginBottom: 10 }}>Deductions</div>
                {[
                  ["PAYE Tax", viewEntry.payeTax],
                  ["Pension", viewEntry.pension],
                  ["NHF", viewEntry.nhf],
                  ["Health Ins.", viewEntry.healthInsurance],
                  ["Other", viewEntry.otherDeductions],
                ].filter(([,v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span style={{ fontWeight: 600, color: "#DC2626" }}>–{fmtN(Number(v))}</span>
                  </div>
                ))}
                {viewEntry.payeTax + viewEntry.pension + viewEntry.nhf + viewEntry.healthInsurance + viewEntry.otherDeductions === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No deductions</div>
                )}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#DC2626" }}>
                  <span>Total</span><span>–{fmtN(viewEntry.payeTax + viewEntry.pension + viewEntry.nhf + viewEntry.healthInsurance + viewEntry.otherDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div style={{ background: "var(--primary)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: viewEntry.employee.bankName ? 16 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Net Pay</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{fmtN(viewEntry.netPay)}</div>
            </div>

            {/* Bank details */}
            {(viewEntry.employee.bankName || viewEntry.employee.bankAccountNo) && (
              <div style={{ background: "var(--muted)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 8 }}>Payment Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
                  {viewEntry.employee.bankName && <div><div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Bank</div><div style={{ fontSize: 12, fontWeight: 600 }}>{viewEntry.employee.bankName}</div></div>}
                  {viewEntry.employee.bankAccountNo && <div><div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Account No.</div><div style={{ fontSize: 12, fontWeight: 600 }}>{viewEntry.employee.bankAccountNo}</div></div>}
                  {viewEntry.employee.bankAccountName && <div><div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Account Name</div><div style={{ fontSize: 12, fontWeight: 600 }}>{viewEntry.employee.bankAccountName}</div></div>}
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" onClick={() => setViewEntry(null)}>Close</Button>
            <Button onClick={() => printPayslip(viewEntry)}><Download size={14} /> Download PDF</Button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Payslip?" width={400}>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>This payslip will be permanently deleted. This action cannot be undone.</p>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button style={{ background: "#DC2626", borderColor: "#DC2626" }} onClick={del}><Trash2 size={14} /> Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
