import { NextRequest, NextResponse } from "next/server"

// Shared auth check for scheduled/cron-triggered routes. Always fails closed:
// if CRON_SECRET isn't configured, no request (including a literal "Bearer undefined")
// can pass.
export function requireCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
