import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, caps, forbidden } from "@/lib/api-auth"

const KEYS = ["company_tax", "company_pension", "company_nhf", "company_nsitf", "company_itf"] as const
type ComplianceKey = typeof KEYS[number]

const DEFAULTS: Record<ComplianceKey, object> = {
  company_tax: { companyType: "", tin: "", filingSchedule: "Monthly" },
  company_pension: { referenceNumber: "" },
  company_nhf: { referenceNumber: "" },
  company_nsitf: { referenceNumber: "" },
  company_itf: { referenceNumber: "" },
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const settings = await prisma.systemSetting.findMany({ where: { key: { in: [...KEYS] } } })
  const result: Record<string, any> = {}
  for (const key of KEYS) {
    const found = settings.find(s => s.key === key)
    result[key] = found ? found.value : DEFAULTS[key]
  }
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  if (!caps(user.role).canManageSettings) return forbidden()

  const body = await req.json()
  const { type, ...data } = body

  if (!KEYS.includes(type as ComplianceKey)) {
    return NextResponse.json({ error: "Invalid compliance type" }, { status: 400 })
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: type },
    update: { value: data },
    create: { key: type, value: data },
  })

  return NextResponse.json({ setting })
}
