import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ALL_ROLES, type SystemRole } from "@/lib/rbac"
import { cookies } from "next/headers"

const COOKIE = "dsn_active_role"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = session.user as any
  const primaryRole: SystemRole = u.role
  const additionalRoles: SystemRole[] = u.additionalRoles ?? []
  const allRoles = Array.from(new Set([primaryRole, ...additionalRoles]))

  const { role } = await req.json()
  if (!role || !ALL_ROLES.includes(role as SystemRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }
  if (!allRoles.includes(role as SystemRole)) {
    return NextResponse.json({ error: "You don't have this role" }, { status: 403 })
  }

  const jar = await cookies()
  if (role === primaryRole) {
    // Switching back to primary — clear override
    jar.delete(COOKIE)
  } else {
    jar.set(COOKIE, role, {
      httpOnly: true, sameSite: "lax", path: "/",
      maxAge: 60 * 60 * 24, // 24h
    })
  }

  return NextResponse.json({ ok: true, activeRole: role })
}

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const jar = await cookies()
  jar.delete(COOKIE)
  return NextResponse.json({ ok: true })
}
