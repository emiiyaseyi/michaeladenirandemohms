import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireInternAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if (!(session.user as any).isIntern) redirect("/staff")
}

export async function requireNonInternStaff() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if ((session.user as any).isIntern) redirect("/staff")
}

export async function requireAdminPermission(key: string, fallback = "/admin") {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const user = session.user as any
  if (user.role === "SUPER_ADMIN") return
  if (!user.permissions?.[key]) redirect(fallback)
}

export async function requirePLPermission(key: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const user = session.user as any
  if (user.role === "SUPER_ADMIN") return
  if (!user.permissions?.[key]) redirect("/project-lead")
}
