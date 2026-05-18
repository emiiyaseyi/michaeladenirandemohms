import { requireNonInternStaff } from "@/lib/server-auth"

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireNonInternStaff()
  return <>{children}</>
}
