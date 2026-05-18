"use client"
import { useState } from "react"
import Card from "@/components/ui/Card"
import { HelpCircle, ChevronDown, ChevronUp, Search } from "lucide-react"

const FAQS = [
  { cat: "Leave", q: "How do I apply for leave?", a: "Open Requests → Leave from the sidebar and click 'Apply for Leave'. Select your leave type, dates, project lead, and relief officer." },
  { cat: "Leave", q: "How are leave days calculated?", a: "Leave days are calculated as working days only — weekends (Saturday and Sunday) and public holidays are automatically excluded." },
  { cat: "Leave", q: "Can I cancel an approved leave?", a: "Yes. Open Requests → Leave, find the request and use the row menu to cancel. Pending and approved requests can both be cancelled; admins can cancel on behalf of any employee." },
  { cat: "Leave", q: "What is a relief officer?", a: "A relief officer is a colleague who covers your responsibilities during your leave. You nominate them when applying. They are notified once your leave is fully approved." },
  { cat: "Profile", q: "How do I update my profile?", a: "Click 'Personal' at the bottom of the sidebar to open your profile, then click 'Edit'. You can update personal info, contact, address, and next of kin. Locked fields (name, job title, department) require an admin." },
  { cat: "Profile", q: "Why can't I change my name or role?", a: "Name, employee ID, job title, and system role are managed by HR. Submitting a change for a locked field creates a profile-update request that HR must approve." },
  { cat: "Profile", q: "How is profile completeness calculated?", a: "Completeness is the percentage of 13 required fields you've filled: first name, last name, gender, date of birth, marital status, personal email, phone, address, city, state, profile photo, next-of-kin name, next-of-kin phone." },
  { cat: "Profile", q: "I see a 'Complete your profile' popup — why?", a: "You were added through the Invite flow, which leaves most fields blank for you to fill in yourself. The popup appears on each new login until completeness reaches 100%. Click 'Complete my profile' to jump straight to the edit page." },
  { cat: "Account", q: "How do I get my login credentials?", a: "When HR adds you, you receive an email. It contains a 'Set your password' link that expires 24 hours after it's sent. If the link expires, sign in at the login page using your work email and the default password 'Welcome@DSN1' — you'll be prompted to set a new password on first login." },
  { cat: "Account", q: "My set-password link expired. What now?", a: "Go to the login page directly, enter your work email and the default password 'Welcome@DSN1'. You'll be redirected to a screen that asks you to set a new password. Once set, log back in with the new password." },
  { cat: "Account", q: "How do I change my password?", a: "Click 'Change Password' at the bottom of the sidebar. Enter your current password, then your new one (8+ characters, including uppercase, number, and symbol)." },
  { cat: "Announcements", q: "Why don't I see an announcement my colleague saw?", a: "Once you close an announcement, it stays dismissed for you in that browser. Other people sharing the same computer have their own dismiss list and will still see it. New announcements from HR appear automatically." },
  { cat: "General", q: "How do I contact HR?", a: "Send an email to hr@datasciencenigeria.ai." },
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
    <div>
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
