"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { WorkplaceFormBody, emptyWpForm, type WpForm } from "../WorkplaceForm"

export default function AddWorkplacePage() {
  const router = useRouter()
  const [form, setForm] = useState<WpForm>(emptyWpForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const save = async () => {
    if (!form.addressLine1.trim()) { setError("Address line 1 is required"); return }
    if (!form.phone.trim()) { setError("Phone is required"); return }
    if (!form.displayName.trim()) { setError("Display name is required"); return }
    // country is always Nigeria
    if (!form.state.trim()) { setError("State is required"); return }
    setSaving(true); setError("")
    const r = await fetch("/api/company-details/workplaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push("/admin/company-details/workplaces")
  }

  return (
    <div>
      <button onClick={() => router.push("/admin/company-details/workplaces")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Workplaces
      </button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Add workplace</h1>
        </div>
        <div style={{ padding: 24 }}>
          <WorkplaceFormBody
            form={form}
            setForm={setForm}
            saving={saving}
            error={error}
            onCancel={() => router.push("/admin/company-details/workplaces")}
            onSave={save}
          />
        </div>
      </div>
    </div>
  )
}
