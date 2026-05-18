import { requireAdminPermission } from "@/lib/server-auth"

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission("canManageSurveys")
  return <>{children}</>
}
