"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown } from "lucide-react"

const SMART_VARS = [
  "Employee First Name", "Employee Last Name", "Employee Full Name",
  "Company Name", "Job Title", "Start Date", "Salary Amount",
  "Offer Sent Date", "Employer Signature", "Employer Signatory Name",
  "Employer Signatory Title", "Employee Signature", "Offer Accepted Date",
  "Employee Start Date",
]

export default function EditOfferTemplatePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [step, setStep] = useState(2)
  const [name, setName] = useState("")
  const [signature, setSignature] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSmartMenu, setShowSmartMenu] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInited = useRef(false)

  useEffect(() => {
    fetch(`/api/offer-templates/${id}`)
      .then(r => r.json())
      .then(d => {
        setName(d.template?.name ?? "")
        setSignature(d.template?.signatureText ?? "")
        setLoading(false)
        setTimeout(() => {
          if (editorRef.current && !editorInited.current) {
            editorRef.current.innerHTML = d.template?.content ?? "<p>insert text....</p>"
            editorInited.current = true
          }
        }, 50)
      })
  }, [id])

  const saveAndProceed = async () => {
    const content = editorRef.current?.innerHTML ?? ""
    setSaving(true)
    await fetch(`/api/offer-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    })
    setSaving(false)
    setStep(3)
    setTimeout(() => document.getElementById("sig-section")?.scrollIntoView({ behavior: "smooth" }), 80)
  }

  const complete = async (finishLater: boolean) => {
    const content = editorRef.current?.innerHTML ?? ""
    setSaving(true)
    await fetch(`/api/offer-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, signatureText: signature, status: finishLater ? "DRAFT" : "PUBLISHED" }),
    })
    setSaving(false)
    router.push("/admin/documents")
  }

  const exec = (cmd: string) => { editorRef.current?.focus(); document.execCommand(cmd, false) }

  const insertVar = (v: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const span = document.createElement("span")
      span.className = "smart-var"; span.contentEditable = "false"; span.textContent = v
      range.deleteContents(); range.insertNode(span)
      const after = document.createTextNode(" "); span.after(after)
      range.setStartAfter(after); range.collapse(true)
      sel.removeAllRanges(); sel.addRange(range)
    }
    setShowSmartMenu(false)
  }

  const handlePreview = () => {
    const content = editorRef.current?.innerHTML ?? ""
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title><style>body{font-family:serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7;font-size:15px}.smart-var{background:#E8EAF6;border-radius:4px;padding:1px 6px;color:#3949AB}</style></head><body>${content}</body></html>`
    window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank")
  }

  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: "10px 24px", border: primary ? "none" : "1px solid var(--border)",
    background: primary ? "var(--primary)" : "var(--card)", color: primary ? "white" : "var(--foreground)",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  })

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        .smart-var{background:#E8EAF6;border-radius:4px;padding:1px 6px;color:#3949AB;font-weight:500;font-size:14px;white-space:nowrap;cursor:default}
        [contenteditable]:focus{outline:none}
        [contenteditable] p{margin:0 0 8px}
      `}</style>

      {/* Editor section */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Customize offer template</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Customize your template below to create fields for each new hire.</div>
        </div>
        <div style={{ padding: "20px 28px" }}>
          <div style={{ background: "var(--primary)", borderRadius: 10, padding: "16px 20px", marginBottom: 20, color: "white", fontSize: 14, lineHeight: 1.65 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20 }}>&#9432;</span>
              <div>
                Use the <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>Smart text</span> drop-down to insert fields that update for each new hire.
                <br /><span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>Smart text</span> fields will be populated when you send out the offer letter.
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
                <button onMouseDown={e => { e.preventDefault(); setShowSmartMenu(m => !m) }} style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--foreground)" }}>
                  Insert Smart Text <ChevronDown size={11} />
                </button>
                {showSmartMenu && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: 200, maxHeight: 280, overflowY: "auto" }}>
                    {SMART_VARS.map(v => <button key={v} onMouseDown={e => { e.preventDefault(); insertVar(v) }} style={{ display: "block", width: "100%", padding: "8px 14px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--foreground)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>{v}</button>)}
                  </div>
                )}
              </div>
              {[{ l: "B", c: "bold" }, { l: "I", c: "italic" }, { l: "U", c: "underline" }, { l: "S", c: "strikeThrough" }].map(({ l, c }) => (
                <button key={c} onMouseDown={e => { e.preventDefault(); exec(c) }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", width: 28, color: "var(--foreground)" }}>{l}</button>
              ))}
              <button onMouseDown={e => { e.preventDefault(); exec("insertOrderedList") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>1.</button>
              <button onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>•</button>
              <button onMouseDown={e => { e.preventDefault(); exec("undo") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>↩</button>
              <button onMouseDown={e => { e.preventDefault(); exec("redo") }} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--card)", cursor: "pointer", color: "var(--foreground)" }}>↪</button>
            </div>
            <div ref={editorRef} contentEditable suppressContentEditableWarning style={{ padding: "16px 20px", minHeight: 320, fontSize: 14, lineHeight: 1.7, color: "var(--foreground)", outline: "none", background: "var(--card)" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            {step === 2 ? (
              <button onClick={saveAndProceed} disabled={saving} style={btn(true)}>{saving ? "Saving…" : "Next"}</button>
            ) : (
              <button onClick={() => setStep(2)} style={btn()}>Edit content</button>
            )}
          </div>
        </div>
      </div>

      {/* Signature section */}
      <div id="sig-section" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, opacity: step < 3 ? 0.4 : 1, pointerEvents: step < 3 ? "none" : "all" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Signature</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 4 }}>Please ask the company signatory to sign this template. This is typically your CEO, Owner, or HR Admin.</div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>Type your full name below to sign</div>
          <input
            value={signature}
            onChange={e => setSignature(e.target.value)}
            style={{ width: "100%", padding: "10px 20px", border: "1.5px solid var(--foreground)", borderRadius: 4, fontSize: 32, fontFamily: "'Dancing Script', cursive", color: "#1a237e", background: "var(--card)", boxSizing: "border-box" }}
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
