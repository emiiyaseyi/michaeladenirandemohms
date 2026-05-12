"use client"
import { useRouter } from "next/navigation"

function DocTypeCard({ icon, title, description, onCreate }: {
  icon: React.ReactNode; title: string; description: string; onCreate: () => void
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "36px 32px", cursor: "default" }}>
      <div style={{ marginBottom: 20 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 28 }}>{description}</div>
      <button
        onClick={onCreate}
        style={{ padding: "10px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        Create
      </button>
    </div>
  )
}

function FolderDocIcon() {
  return (
    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="10" width="32" height="24" rx="3" fill="var(--primary-100)" />
        <rect x="4" y="14" width="32" height="20" rx="3" fill="var(--primary)" />
        <rect x="10" y="20" width="20" height="2.5" rx="1.25" fill="white" opacity="0.7" />
        <rect x="10" y="25" width="14" height="2.5" rx="1.25" fill="white" opacity="0.5" />
      </svg>
    </div>
  )
}

export default function NewDocumentPage() {
  const router = useRouter()
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 0" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginBottom: 32 }}>
        What type of document would you like to add?
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <DocTypeCard
          icon={<FolderDocIcon />}
          title="Offer Template"
          description="We'll walk you carefully through the process of creating a reusable offer letter."
          onCreate={() => router.push("/admin/documents/offer-template/new")}
        />
        <DocTypeCard
          icon={<FolderDocIcon />}
          title="Employee Document"
          description="Add a document for new employees during on-boarding or for your existing employees."
          onCreate={() => router.push("/admin/documents/create-employee")}
        />
      </div>
    </div>
  )
}
