import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, forbidden } from "@/lib/api-auth"
import { Resend } from "resend"

export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error
  if (user.role !== "SUPER_ADMIN") return forbidden()

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY is not set in environment" }, { status: 400 })

  const settings = await prisma.emailSettings.findUnique({ where: { id: "singleton" } })
  if (!settings?.fromEmail || !settings?.fromName) {
    return NextResponse.json({ error: "Configure From Name and From Email before sending a test" }, { status: 400 })
  }

  const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } })
  if (!userRecord?.email) return NextResponse.json({ error: "Could not find your email address" }, { status: 400 })

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: [userRecord.email],
      subject: `Test Email from ${settings.fromName}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
<tr><td style="background:#111827;padding:20px 32px;"><span style="font-size:18px;font-weight:800;color:#fff;">${settings.fromName}</span></td></tr>
<tr><td style="padding:32px;">
<h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">Email Configuration Working ✓</h2>
<p style="font-size:14px;color:#374151;margin:0 0 12px;">This test email confirms your Resend API key and email settings are configured correctly.</p>
<p style="font-size:13px;color:#6b7280;margin:0;">Sent to: <strong>${userRecord.email}</strong></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">DSN HRMS — Email Test</td></tr>
</table></td></tr></table></body></html>`,
    })
    return NextResponse.json({ ok: true, sentTo: userRecord.email })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to send test email" }, { status: 500 })
  }
}
