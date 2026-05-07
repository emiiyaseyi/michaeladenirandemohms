"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"

const SMART_VARS = [
  "Employee First Name", "Employee Last Name", "Employee Full Name",
  "Company Name", "Job Title", "Start Date", "Salary Amount",
  "Offer Sent Date", "Employer Signature", "Employer Signatory Name",
  "Employer Signatory Title", "Employee Signature", "Offer Accepted Date",
  "Employee Start Date",
]

const DEFAULT_TEMPLATE = `<p style="text-align:center"><span class="smart-var" contenteditable="false">Offer Sent Date</span></p><p>Dear <span class="smart-var" contenteditable="false">Employee First Name</span>,</p><p><span class="smart-var" contenteditable="false">Company Name</span> (the "Company"), is pleased to offer you employment with the Company on the terms described below. This offer of employment is conditioned on your satisfactory completion of certain requirements, as more fully explained in this letter. Your employment is subject to the terms and conditions set forth in this letter.</p><ul><li><strong>Position:</strong> You will start in a <span class="smart-var" contenteditable="false">Full-time/Part-time</span> position of <span class="smart-var" contenteditable="false">Job Title</span>. In this capacity you will perform duties and responsibilities that are associated with your title.</li><li><strong>Compensation and Employee Benefits:</strong> In consideration of your services, you will be paid <span class="smart-var" contenteditable="false">Salary Amount</span> per Year, payable in accordance with the standard payroll practices of the Company and subject to all applicable withholding and deductions.</li><li><strong>Employment Relationship:</strong> Employment with the Company is for no specific period of time. Your employment with the Company will be "at will."</li></ul><p>Very truly yours,</p><p><span class="smart-var" contenteditable="false">Employer Signature</span><br/>(Signature)</p><p>Name: <span class="smart-var" contenteditable="false">Employer Signatory Name</span></p><p>Title: <span class="smart-var" contenteditable="false">Employer Signatory Title</span></p><p>&nbsp;</p><p>ACCEPTED AND AGREED:</p><p><span class="smart-var" contenteditable="false">Employee Full Name</span><br/>(PRINT EMPLOYEE NAME)</p><p><span class="smart-var" contenteditable="false">Employee Signature</span><br/>(Signature)</p><p>Acceptance Date: <span class="smart-var" contenteditable="false">Offer Accepted Date</span></p><p>Anticipated Start Date: <span class="smart-var" contenteditable="false">Employee Start Date</span></p>`

export default function NewOfferTemplatePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [useDefault, setUseDefault] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState("")
  const [showSmartMenu, setShowSmartMenu] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInited = useRef(false)

  useEffect(() => {
    if (step === 2 && editorRef.current && !editorInited.current) {
      editorRef.current.innerHTML = useDefault ? DEFAULT_TEMPLATE : "<p>insert text....</p>"
      editorInited.current = true
    }
  }, [step, useDefault])

  const step1Next = async () => {
    if (!name.trim()) { setError("Template name is required"); return }
    setSaving(true); setError("")
    const r = await fetch("/api/offer-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), content: "", isDefault: false }),
    })
    setSaving(false)
    if (!r.ok) { setError("Failed to create template"); return }
    const d = await r.json()
    setTemplateId(d.template.id)
    setStep(2)
    setTimeout(() => document.getElementById("step2-section")?.scrollIntoView({ behavior: "smooth" }), 80)
  }

  const step2Next = async () => {
    const content = editorRef.current?.innerHTML ?? ""
    setSaving(true)
    await fetch(`/api/offer-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setSaving(false)
    setStep(3)
    setTimeout(() => document.getElementById("step3-section")?.scrollIntoView({ behavior: "smooth" }), 80)
  }

  const complete = async (finishLater: boolean) => {
    const content = editorRef.current?.innerHTML ?? ""
    setSaving(true)
    await fetch(`/api/offer-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, signatureText: signature, status: finishLater ? "DRAFT" : "PUBLISHED" }),
    })
    setSaving(false)
    router.push("/admin/documents")
  }

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const insertVar = (v: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const span = document.createElement("span")
      span.className = "smart-var"
      span.contentEditable = "false"
      span.textContent = v
      range.deleteContents()
      range.insertNode(span)
      const after = document.createTextNode(" ")
      span.after(after)
      range.setStartAfter(after)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    setShowSmartMenu(false)
  }

  const handlePreview = () => {
    const content = editorRef.current?.innerHTML ?? ""
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title><style>body{font-family:serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7;font-size:15px}.smart-var{background:#E8EAF6;border-radius:4px;padding:1px 6px;color:#3949AB;font-style:normal}</style></head><body>${content}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    window.open(URL.createObjectURL(blob), "_blank")
  }

  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }
  const dimmed: React.CSSProperties = { opacity: 0.4, pointerEvents: "none" }
  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: "10px 24px", border: primary ? "none" : "1px solid var(--border)",
    background: primary ? "var(--primary)" : "var(--card)", color: primary ? "white" : "var(--foreground)",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  })

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        .smart-var{background:#E8EAF6;border-radius:4px;padding:1px 6px;color:#3949AB;font-weight:500;font-size:14px;white-space:nowrap;cursor:default}
        [contenteditable]:focus{outline:none}
        [contenteditable] p{margin:0 0 8px}
      `}</style>

      {/* Step 1 */}
      <div style={card}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Offer template</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Once it has a name, you can either copy and paste your own text or start with a default and make edits</div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ color: "var(--danger)" }}>*</span> Template name
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError("") }}
            disabled={step > 1}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${error ? "var(--danger)" : "var(--border)"}`, borderRadius: 8, fontSize: 14, color: "var(--foreground)", background: step > 1 ? "var(--muted)" : "var(--card)", boxSizing: "border-box" }}
          />
          {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</div>}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 10 }}>Do you have your own templates?</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: step > 1 ? "default" : "pointer", marginBottom: 8, fontSize: 14, color: "var(--foreground)" }}>
              <input type="radio" checked={!useDefault} onChange={() => setUseDefault(false)} disabled={step > 1} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
              Yes, I have my own offer letter template
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: step > 1 ? "default" : "pointer", fontSize: 14, color: "var(--foreground)" }}>
              <input type="radio" checked={useDefault} onChange={() => setUseDefault(true)} disabled={step > 1} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
              No, I want to use the default template
            </label>
          </div>

          {step === 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button onClick={step1Next} disabled={saving} style={btn(true)}>{saving ? "Creating…" : "Next"}</button>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Editor */}
      <div id="step2-section" style={{ ...card, ...(step < 2 ? dimmed : {}) }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Customize offer template</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Customize your template below to create fields for each new hire.</div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          <div style={{ background: "var(--primary)", borderRadius: 10, padding: "16px 20px", marginBottom: 20, color: "white", fontSize: 14, lineHeight: 1.65 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>&#9432;</span>
              <div>
                Customize your template below. Then, highlight the sections that change for each candidate (like title or compensation) and use the{" "}
                <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>Smart text</span>{" "}
                drop-down to create fields that you can quickly update for each new hire.
                <br /><br />
                <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>Smart text</span>{" "}
                fields will be populated later when you send out the offer letter.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Offer Template</span>
            <button onClick={handlePreview} style={btn(true)}>Preview</button>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", padding: "8px 12px", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", marginRight: 6 }}>
                <button
                  onMouseDown={e => { e.preventDefault(); setShowSmartMenu(m => !m) }}
                  style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--foreground)" }}
                >
                  Insert Smart Text <ChevronDown size={11} />
                </button>
                {showSmartMenu && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: 200, maxHeight: 280, overflowY: "auto" }}>
                    {SMART_VARS.map(v => (
                      <button key={v} onMouseDown={e => { e.preventDefault(); insertVar(v) }} style={{ display: "block", width: "100%", padding: "8px 14px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {[
                { l: "B", c: "bold", s: { fontWeight: 800 } },
                { l: "I", c: "italic", s: { fontStyle: "italic" } },
                { l: "U", c: "underline", s: { textDecoration: "underline" } },
                { l: "S", c: "strikeThrough", s: { textDecoration: "line-through" } },
              ].map(({ l, c, s }) => (
                <button key={c} onMouseDown={e => { e.preventDefault(); exec(c) }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", width: 28, color: "var(--foreground)", ...s }}>{l}</button>
              ))}

              <button onMouseDown={e => { e.preventDefault(); exec("insertOrderedList") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>1.</button>
              <button onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>•</button>
              <button onMouseDown={e => { e.preventDefault(); exec("outdent") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>⇤</button>
              <button onMouseDown={e => { e.preventDefault(); exec("indent") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>⇥</button>
              <button onMouseDown={e => { e.preventDefault(); exec("undo") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>↩</button>
              <button onMouseDown={e => { e.preventDefault(); exec("redo") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>↪</button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              style={{ padding: "16px 20px", minHeight: 320, fontSize: 14, lineHeight: 1.7, color: "var(--foreground)", outline: "none", background: "var(--card)" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(1)} style={btn()}>Previous</button>
            <button onClick={step2Next} disabled={saving} style={btn(true)}>{saving ? "Saving…" : "Next"}</button>
          </div>
        </div>
      </div>

      {/* Step 3: Signature */}
      <div id="step3-section" style={{ ...card, ...(step < 3 ? dimmed : {}) }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Signature</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Please ask the company signatory to sign this template. This is typically your CEO, Owner, or HR Admin.</div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>Type your full name below to sign</div>
          <input
            value={signature}
            onChange={e => setSignature(e.target.value)}
            style={{
              width: "100%", padding: "10px 20px", border: "1.5px solid var(--foreground)", borderRadius: 4,
              fontSize: 32, fontFamily: "'Dancing Script', cursive", color: "#1a237e",
              background: "var(--card)", boxSizing: "border-box",
            }}
          />
          <div style={{ borderBottom: "1px dashed var(--border-strong)", marginTop: 4, marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setStep(2)} style={btn()}>Previous</button>
            <button onClick={() => complete(true)} style={{ ...btn(), color: "var(--muted-foreground)" }}>Finish later</button>
            <button onClick={() => complete(false)} disabled={saving} style={btn(true)}>{saving ? "Saving…" : "Complete"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
