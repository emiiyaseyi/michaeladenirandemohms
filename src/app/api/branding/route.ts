import { NextResponse } from "next/server"
import { getBranding } from "@/lib/branding"

export async function GET() {
  const { companyName, logoUrl, primaryColor } = await getBranding()
  return NextResponse.json({ companyName, logoUrl, primaryColor })
}
