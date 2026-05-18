import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEY = "approval_workflow"

const DEFAULT_WORKFLOW = {
  sections: [
    {
      id: "hr",
      name: "HR",
      categories: [
        { id: "people", name: "People", description: "Approval workflow for HR-related employee requests e.g document requests", chain: [] },
        { id: "time_leave", name: "Time Tracking and Leave", description: "Approval workflow for employee hours and leave requests", chain: ["Head of Department", "Manager", "HR Admin"] },
      ],
    },
    {
      id: "payroll",
      name: "Payroll",
      categories: [
        { id: "payrolls_regular", name: "Payrolls and Regular Payment Schedules", description: "Approval workflow for regular and custom payroll", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
        { id: "expense_claims", name: "Expense Claims", description: "Approval workflow for employee expense claims", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
        { id: "payroll_changes", name: "Payroll Changes", description: "Approval workflow for payroll changes e.g bonuses, deductions and payables", chain: ["Payroll Admin", "Primary Admin", "Secondary Admin"] },
        { id: "custom_payment", name: "Custom Payment Schedules", description: "Approval workflow for custom payment schedules", chain: [] },
      ],
    },
  ],
}

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  // Try both the new key and old key for backwards compat
  let setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  if (!setting) {
    setting = await prisma.systemSetting.findUnique({ where: { key: "leave_approval_workflow" } })
  }
  const value = setting ? (setting.value as any) : null
  const workflow = value?.sections ? value : DEFAULT_WORKFLOW
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
