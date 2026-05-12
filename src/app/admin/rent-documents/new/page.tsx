"use client"
import { useRouter } from "next/navigation"
import RentDocumentForm from "../_form"

export default function NewRentDocumentPage() {
  const router = useRouter()

  const handleSubmit = async (fd: FormData): Promise<boolean> => {
    const r = await fetch("/api/rent-documents", { method: "POST", body: fd })
    if (!r.ok) return false
    router.push("/admin/rent-documents")
    return true
  }

  return <RentDocumentForm mode="create" onSubmit={handleSubmit} />
}
