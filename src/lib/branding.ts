import { prisma } from "@/lib/prisma"

export type Branding = {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  employeeEmailDomain: string
}

export const DEFAULT_BRANDING: Branding = {
  companyName: "Michael Demo HRMS",
  logoUrl: null,
  primaryColor: "#0B5C2E",
  employeeEmailDomain: "michaeldemohrms.example",
}

const KEY = "branding"

export async function getBranding(): Promise<Branding> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } })
  const value = (setting?.value as Partial<Branding>) ?? {}
  return { ...DEFAULT_BRANDING, ...value }
}

export async function saveBranding(patch: Partial<Branding>): Promise<Branding> {
  const current = await getBranding()
  const next: Branding = { ...current, ...patch }
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: next as any },
    create: { key: KEY, value: next as any },
  })
  return next
}

export function deriveHoverColor(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.max(0, (n >> 16) - 24)
  const g = Math.max(0, ((n >> 8) & 0xff) - 24)
  const b = Math.max(0, (n & 0xff) - 24)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
