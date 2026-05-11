"use client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import LeavePage from "@/components/pages/LeavePage"

export default function Page() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/staff/requests"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Requests
        </Link>
      </div>
      <LeavePage />
    </div>
  )
}
