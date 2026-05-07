"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import PerformanceGroupForm from "../../_form"

export default function EditPerformanceGroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/performance/groups/${id}`)
      .then(r => r.json())
      .then(d => {
        const g = d.group
        setInitial({
          name: g.name,
          description: g.description ?? "",
          memberIds: (g.members ?? []).map((m: any) => m.employee.id),
        })
        setLoading(false)
      })
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <PerformanceGroupForm
      mode="edit"
      initial={initial}
      onSubmit={async (data) => {
        const r = await fetch(`/api/performance/groups/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) router.push(`/admin/performance/groups/${id}`)
        return r.ok
      }}
    />
  )
}
