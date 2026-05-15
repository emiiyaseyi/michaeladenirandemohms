import { requireInternAccess } from "@/lib/server-auth"

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireInternAccess()
  return <>{children}</>
}
