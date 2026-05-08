import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getRoleHome } from "@/lib/rbac"

export default async function ProjectLeadLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  redirect(getRoleHome(role))
}
