import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  // Only show users who have admin role grants AND no Employee record.
  // Once hired, they get an Employee record and disappear from this list — they're now in /admin/people/employees.
  const admins = await prisma.user.findMany({
    where: { adminRoles: { some: {} }, employee: null, role: { not: "SUPER_ADMIN" } },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      employee: { select: { id: true, phone: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ admins })
}

// POST removed — external admin creation now happens exclusively via
// /admin/settings/admins (single create + bulk upload) so we can attach
// system role bundles atomically and send the welcome email.
