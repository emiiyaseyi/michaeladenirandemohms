"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ContractorForm from "../../_form"

export default function EditContractorPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [initial, setInitial] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then(r => r.json())
      .then(d => { setInitial(d.contractor); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <ContractorForm
      initial={initial}
      onSubmit={async (data) => {
        const r = await fetch(`/api/contractors/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) router.push(`/admin/contractors/${id}`)
        return r.ok
      }}
    />
  )
}
