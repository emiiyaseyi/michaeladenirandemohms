"use client"
import { useRouter } from "next/navigation"
import ContractorForm from "../_form"

export default function NewContractorPage() {
  const router = useRouter()
  return (
    <ContractorForm
      onSubmit={async (data) => {
        const r = await fetch("/api/contractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) {
          const d = await r.json()
          router.push(`/admin/contractors/${d.contractor.id}`)
        }
        return r.ok
      }}
    />
  )
}
