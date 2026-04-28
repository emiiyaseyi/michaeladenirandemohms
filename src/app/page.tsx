import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getRoleHome } from "@/lib/rbac"

export default async function Home() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role ?? "STAFF"
  redirect(getRoleHome(role))
}
