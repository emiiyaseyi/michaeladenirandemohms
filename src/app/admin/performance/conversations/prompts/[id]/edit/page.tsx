"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import PromptForm from "../../_form"

export default function EditPromptPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/performance/conversations/prompts/${id}`)
      .then(r => r.json())
      .then(d => { setInitial(d.prompt); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <PromptForm
      mode="edit"
      initial={initial}
      onSubmit={async (data) => {
        const r = await fetch(`/api/performance/conversations/prompts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) router.push("/admin/performance/conversations")
        return r.ok
      }}
    />
  )
}
