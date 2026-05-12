"use client"
import { useRouter } from "next/navigation"
import PerformanceGroupForm from "../_form"

export default function NewPerformanceGroupPage() {
  const router = useRouter()
  return (
    <PerformanceGroupForm
      mode="create"
      onSubmit={async (data) => {
        const r = await fetch("/api/performance/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) router.push("/admin/performance/groups")
        return r.ok
      }}
    />
  )
}
