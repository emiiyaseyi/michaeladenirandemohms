"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { WorkplaceFormBody, type WpForm } from "../../WorkplaceForm"

export default function EditWorkplacePage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [form, setForm] = useState<WpForm>({ addressLine1: "", addressLine2: "", city: "", state: "", country: "Nigeria", zipCode: "", phone: "", email: "", displayName: "" })
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/company-details/workplaces")
      .then(r => r.json())
      .then(d => {
        const wp = (d.workplaces ?? []).find((w: any) => w.id === id)
        if (!wp) { router.push("/admin/company-details/workplaces"); return }
        setForm({
          addressLine1: wp.addressLine1 ?? "",
          addressLine2: wp.addressLine2 ?? "",
          city: wp.city ?? "",
          state: wp.state ?? "",
          country: wp.country ?? "Nigeria",
          zipCode: wp.zipCode ?? "",
          phone: wp.phone ?? "",
          email: wp.email ?? "",
          displayName: wp.displayName ?? "",
        })
        setIsActive(wp.isActive ?? true)
        setLoading(false)
      })
  }, [id])

  const save = async (activeOverride?: boolean) => {
    if (!form.addressLine1.trim()) { setError("Address line 1 is required"); return }
    if (!form.phone.trim()) { setError("Phone is required"); return }
    if (!form.displayName.trim()) { setError("Display name is required"); return }
    // country is always Nigeria
    if (!form.state.trim()) { setError("State is required"); return }
    setSaving(true); setError("")
    const r = await fetch(`/api/company-details/workplaces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isActive: activeOverride ?? isActive }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? "Failed to save"); return }
    router.push("/admin/company-details/workplaces")
  }

  const toggleActive = () => {
    const next = !isActive
    setIsActive(next)
    save(next)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 10, color: "var(--muted-foreground)" }}>
      <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <button onClick={() => router.push("/admin/company-details/workplaces")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Workplaces
      </button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Edit workplace</h1>
        </div>
        <div style={{ padding: 24 }}>
          <WorkplaceFormBody
            form={form}
            setForm={setForm}
            saving={saving}
            error={error}
            onCancel={() => router.push("/admin/company-details/workplaces")}
            onSave={() => save()}
            isActive={isActive}
            onToggleActive={toggleActive}
          />
        </div>
      </div>
    </div>
  )
}
