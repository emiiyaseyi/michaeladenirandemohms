"use client"
import { useRouter } from "next/navigation"
import ConversationSetupForm from "../_form"

export default function NewConversationSetupPage() {
  const router = useRouter()
  return (
    <ConversationSetupForm
      mode="create"
      onSubmit={async (data) => {
        const r = await fetch("/api/performance/conversations/setups", {
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
