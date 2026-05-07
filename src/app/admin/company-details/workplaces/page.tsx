"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit2, MapPin, Phone, Loader2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { Info } from "lucide-react"

export default function ManageWorkplacesPage() {
  const router = useRouter()
  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Switch modal
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switchFiling, setSwitchFiling] = useState("")
  const [switchMailing, setSwitchMailing] = useState("")
  const [switchSearch1, setSwitchSearch1] = useState("")
  const [switchSearch2, setSwitchSearch2] = useState("")
  const [switchDropdown1, setSwitchDropdown1] = useState(false)
  const [switchDropdown2, setSwitchDropdown2] = useState(false)
  const [switchSaving, setSwitchSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch("/api/company-details/workplaces")
    const d = await r.json()
    const wps: any[] = d.workplaces ?? []
    setWorkplaces(wps)
    const fil = wps.find(w => w.isFiling)
    const mail = wps.find(w => w.isMailing)
    setSwitchFiling(fil?.id ?? "")
    setSwitchMailing(mail?.id ?? "")
    setLoading(false)
  }

  async function saveSwitch() {
    if (!switchFiling || !switchMailing) return
    setSwitchSaving(true)
    await fetch("/api/company-details/workplaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filingId: switchFiling, mailingId: switchMailing }),
    })
    await load()
    setSwitchSaving(false)
    setSwitchOpen(false)
  }

  const filing = workplaces.find(w => w.isFiling)
  const otherWps = workplaces.filter(w => !w.isFiling && !w.isMailing)
  // include mailing-only if different from filing
  const mailingOnly = workplaces.filter(w => w.isMailing && !w.isFiling)
  const allOther = [...otherWps, ...mailingOnly]

  const fSel = workplaces.find(w => w.id === switchFiling)
  const mSel = workplaces.find(w => w.id === switchMailing)
  const filteredF = workplaces.filter(w => `${w.displayName}`.toLowerCase().includes(switchSearch1.toLowerCase()))
  const filteredM = workplaces.filter(w => `${w.displayName}`.toLowerCase().includes(switchSearch2.toLowerCase()))

  const fi: React.CSSProperties = {
    width: "100%", padding: "9px 13px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none",
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

      {/* Workplaces — Filing & Mailing */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Workplaces</h2>
          {workplaces.length > 1 && (
            <button onClick={() => { setSwitchOpen(true); setSwitchSearch1(""); setSwitchSearch2("") }}
              style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
              Switch filing &amp; Mailing addresses
            </button>
          )}
        </div>
        {filing ? (
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>
                Filing {filing.isMailing ? "& Mailing " : ""}Address
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{filing.displayName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>
                <MapPin size={12} /> {[filing.addressLine1, filing.city, filing.state, filing.zipCode, filing.country].filter(Boolean).join(", ")}
              </div>
              {filing.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                  <Phone size={12} /> {filing.phone}
                </div>
              )}
            </div>
            <button onClick={() => router.push(`/admin/company-details/workplaces/${filing.id}/edit`)}
              style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "6px 8px", color: "var(--muted-foreground)" }}>
              <Edit2 size={14} />
            </button>
          </div>
        ) : (
          <div style={{ padding: "24px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>No filing address set.</div>
        )}
      </div>

      {/* Other Workplaces */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Other Workplaces</h2>
          <button onClick={() => router.push("/admin/company-details/workplaces/add")}
            style={{ padding: "7px 16px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus size={13} /> Add Workplace</span>
          </button>
        </div>
        {allOther.length === 0 ? (
          <div style={{ padding: "24px 20px", fontSize: 13, color: "var(--muted-foreground)" }}>No other workplaces added yet.</div>
        ) : (
          <div>
            {allOther.map((wp: any) => (
              <div key={wp.id} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{wp.displayName}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    <MapPin size={12} /> {[wp.addressLine1, wp.city, wp.state, wp.zipCode, wp.country].filter(Boolean).join(", ")}
                  </div>
                  {wp.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                      <Phone size={12} /> {wp.phone}
                    </div>
                  )}
                  {!wp.isActive && <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginTop: 4, display: "block" }}>Inactive</span>}
                </div>
                <button onClick={() => router.push(`/admin/company-details/workplaces/${wp.id}/edit`)}
                  style={{ background: "var(--muted)", border: "none", cursor: "pointer", borderRadius: 6, padding: "6px 8px", color: "var(--muted-foreground)" }}>
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Switch Filing & Mailing Modal */}
      <Modal open={switchOpen} onClose={() => setSwitchOpen(false)} title="Select Filing & Mailing Addresses" width={540}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.7 }}>
            <p><strong>Filing Address:</strong> This is your primary physical place of business. It can't be a P.O. Box. The filing address should match the address you have on file with your State Tax Authority.</p>
            <p style={{ marginTop: 8 }}><strong>Mailing Address:</strong> This is where you'd like to receive mail. It's usually the same as your filing address.</p>
            <p style={{ marginTop: 8, fontWeight: 600 }}>Please Note: Before updating your address, you must notify your State Tax Authority of any address change.</p>
          </div>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Filing address <span style={{ color: "var(--accent)" }}>*</span></label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div onClick={() => { setSwitchDropdown1(d => !d); setSwitchDropdown2(false) }}
              style={{ ...fi, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
              {fSel ? fSel.displayName : <span style={{ color: "var(--muted-foreground)" }}>Select</span>}
            </div>
            {switchDropdown1 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                  <input autoFocus value={switchSearch1} onChange={e => setSwitchSearch1(e.target.value)} placeholder="Search..." style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13 }} />
                </div>
                <div style={{ overflowY: "auto" }}>
                  {filteredF.map(w => (
                    <div key={w.id} onClick={() => { setSwitchFiling(w.id); setSwitchDropdown1(false); setSwitchSearch1("") }}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: w.id === switchFiling ? 700 : 400, background: w.id === switchFiling ? "var(--muted)" : "transparent" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = w.id === switchFiling ? "var(--muted)" : "transparent"}>
                      {w.displayName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Mailing address <span style={{ color: "var(--accent)" }}>*</span></label>
          <div style={{ position: "relative" }}>
            <div onClick={() => { setSwitchDropdown2(d => !d); setSwitchDropdown1(false) }}
              style={{ ...fi, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
              {mSel ? mSel.displayName : <span style={{ color: "var(--muted-foreground)" }}>Select</span>}
            </div>
            {switchDropdown2 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                  <input autoFocus value={switchSearch2} onChange={e => setSwitchSearch2(e.target.value)} placeholder="Search..." style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13 }} />
                </div>
                <div style={{ overflowY: "auto" }}>
                  {filteredM.map(w => (
                    <div key={w.id} onClick={() => { setSwitchMailing(w.id); setSwitchDropdown2(false); setSwitchSearch2("") }}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: w.id === switchMailing ? 700 : 400, background: w.id === switchMailing ? "var(--muted)" : "transparent" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = "var(--muted)"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = w.id === switchMailing ? "var(--muted)" : "transparent"}>
                      {w.displayName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setSwitchOpen(false)} style={{ padding: "8px 18px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveSwitch} disabled={!switchFiling || !switchMailing || switchSaving}
            style={{ padding: "8px 22px", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", cursor: switchSaving ? "wait" : "pointer", opacity: switchSaving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {switchSaving ? <><Loader2 size={13} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Save"}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
