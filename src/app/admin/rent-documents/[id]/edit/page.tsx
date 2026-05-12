"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RentDocumentForm from "../../_form"

export default function EditRentDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [doc, setDoc] = useState<any>(null)
  const [id, setId] = useState("")

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetch(`/api/rent-documents/${p.id}`)
        .then(r => r.json())
        .then(d => setDoc(d.doc))
    })
  }, [params])

  const handleSubmit = async (fd: FormData): Promise<boolean> => {
    const r = await fetch(`/api/rent-documents/${id}`, { method: "PATCH", body: fd })
    if (!r.ok) return false
    router.push("/admin/rent-documents")
    return true
  }

  if (!doc) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</div>

  return (
    <RentDocumentForm
      mode="edit"
      initial={{
        employeeId: doc.employeeId,
        amount: String(doc.amount),
        rentStart: doc.rentStart?.slice(0, 10) ?? "",
        rentEnd: doc.rentEnd?.slice(0, 10) ?? "",
        propertyAddress: doc.propertyAddress ?? "",
        landlordName: doc.landlordName ?? "",
        landlordPhone: doc.landlordPhone ?? "",
        landlordEmail: doc.landlordEmail ?? "",
        rentReceiptUrl: doc.rentReceiptUrl ?? undefined,
        tenancyAgreementUrl: doc.tenancyAgreementUrl ?? undefined,
        id: doc.id,
      }}
      onSubmit={handleSubmit}
    />
  )
}
