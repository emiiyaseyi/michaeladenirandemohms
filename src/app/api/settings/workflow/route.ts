import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEY = "approval_workflow"

const DEFAULT_WORKFLOW = {
  categories: [
    {
      id: "leave", name: "Leave", description: "Leave request approval chain", isSystem: true,
      chain: [
        { role: "STAFF", label: "Relief Officer", deadlineHours: 24 },
        { role: "PROJECT_LEAD",   label: "Project Lead",   deadlineHours: 24 },
        { role: "PROJECT_LEAD",      label: "Project Lead",      deadlineHours: 48 },
        { role: "PROJECT_LEAD",        label: "Manager",        deadlineHours: 48 },
        { role: "ADMIN",       label: "HR Admin",       deadlineHours: 72 },
      ],
    },
    {
      id: "performance", name: "Performance Reviews", description: "Appraisal sign-off chain", isSystem: true,
      chain: [
        { role: "PROJECT_LEAD",  label: "Manager",  deadlineHours: 72 },
        { role: "ADMIN", label: "HR Admin", deadlineHours: 72 },
      ],
    },
    {
      id: "profile_changes", name: "Employee Profile Changes", description: "Profile update requests", isSystem: true,
      chain: [
        { role: "ADMIN", label: "HR Admin", deadlineHours: 48 },
      ],
    },
  ],
}

export async function GET() {
  // Try both the new key and old key for backwards compat
  let setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  if (!setting) {
    setting = await prisma.systemSetting.findUnique({ where: { key: "leave_approval_workflow" } })
  }
  const value = setting ? (setting.value as any) : DEFAULT_WORKFLOW
  // Normalise: if old format (has .stages but no .categories), return defaults
  const workflow = value.categories ? value : DEFAULT_WORKFLOW
  return NextResponse.json({ workflow })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()

  const setting = await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: body },
    create: { key: KEY, value: body },
  })

  return NextResponse.json({ workflow: setting.value })
}
