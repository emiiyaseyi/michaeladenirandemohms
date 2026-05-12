"use client"
import { useRouter } from "next/navigation"
import PromptForm from "../_form"

export default function NewPromptPage() {
  const router = useRouter()
  return (
    <PromptForm
      mode="create"
      onSubmit={async (data) => {
        const r = await fetch("/api/performance/conversations/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (r.ok) router.push("/admin/performance/conversations")
        return r.ok
      }}
    />
  )
}
