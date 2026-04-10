"use client"
import { useState } from "react"
import Card from "@/components/ui/Card"
import { HelpCircle, ChevronDown, ChevronUp, Search } from "lucide-react"

const FAQS = [
  { cat: "Leave", q: "How do I apply for leave?", a: "Navigate to Self Service → Leave and click 'Apply for Leave'. Select your leave type, dates, and assign relief officers." },
  { cat: "Leave", q: "How are leave days calculated?", a: "Leave days are calculated as working days only — weekends (Saturday and Sunday) and public holidays are automatically excluded." },
  { cat: "Leave", q: "Can I cancel an approved leave?", a: "Yes, you can cancel a pending or approved leave request from the Leave section, as long as no relief officer has accepted. Once a relief officer accepts, only an Admin can override." },
  { cat: "Leave", q: "What is a relief officer?", a: "A relief officer is a colleague who covers your responsibilities during your leave. You nominate them when applying, and they must accept or decline within 12 hours." },
  { cat: "Profile", q: "How do I update my profile?", a: "Go to Self Service → My Profile or Dashboard → Edit Profile. You can update personal info, contact, address, next of kin, and bank details." },
  { cat: "Profile", q: "Why can't I change my name or role?", a: "Name, employee ID, job title, and system role are managed by HR and can only be updated by an Admin or HR Admin." },
  { cat: "Profile", q: "How is profile completeness calculated?", a: "Profile completeness is based on 15 required fields: personal info, contact, address, next of kin, and bank details." },
  { cat: "Payroll", q: "When is salary paid?", a: "Salaries are processed on the last working day of each month. Contact HR or your Finance team if there are any discrepancies." },
  { cat: "Payroll", q: "How do I update my bank details?", a: "Update your bank details under Self Service → My Profile → Bank Details. Bank detail changes are reviewed by HR before taking effect." },
  { cat: "General", q: "How do I contact HR?", a: "You can raise a Grievance via Self Service → Grievance, or send an email directly to hr@datasciencenigeria.org." },
  { cat: "General", q: "What is the default password for new accounts?", a: "New accounts are created with the password Welcome@DSN1. You are strongly advised to change this immediately after first login." },
]

const CATS = ["All", ...Array.from(new Set(FAQS.map(f => f.cat)))]

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [cat, setCat] = useState("All")
  const [search, setSearch] = useState("")

  const filtered = FAQS.filter(f => {
    const matchCat = cat === "All" || f.cat === cat
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Frequently Asked Questions</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Find answers to common questions about the HRMS</p>
      </div>

      <Card style={{ padding: "14px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…" style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, color: "var(--foreground)" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${cat === c ? "var(--primary)" : "var(--border)"}`, background: cat === c ? "var(--primary)" : "transparent", color: cat === c ? "white" : "var(--muted-foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
              {c}
            </button>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
            <HelpCircle size={28} style={{ marginBottom: 8, opacity: 0.4, display: "block", margin: "0 auto 8px" }} />
            No matching questions found.
          </div>
        ) : filtered.map((faq, i) => (
          <Card key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", whiteSpace: "nowrap", marginTop: 2 }}>{faq.cat}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{faq.q}</span>
              </div>
              {open === i ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
            </button>
            {open === i && (
              <div style={{ padding: "0 20px 16px 20px", paddingLeft: 58, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, borderTop: "1px solid var(--border)" }}>
                <div style={{ paddingTop: 12 }}>{faq.a}</div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
