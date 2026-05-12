"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import ConversationSetupForm from "../../_form"

export default function EditConversationSetupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/performance/conversations/setups/${id}`)
      .then(r => r.json())
      .then(d => {
        const s = d.setup
        setInitial({
          employeeId: s.employeeId,
          conversationWith: s.conversationWith,
          scheduledDate: s.scheduledDate?.split("T")[0] ?? "",
          startTime: s.startTime,
          endTime: s.endTime,
          frequency: s.frequency,
          conversationType: s.conversationType,
        })
        setLoading(false)
      })
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <ConversationSetupForm
      mode="edit"
      initial={initial}
      onSubmit={async (data) => {
        const r = await fetch(`/api/performance/conversations/setups/${id}`, {
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
