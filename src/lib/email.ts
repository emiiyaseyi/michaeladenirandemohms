import { Resend } from "resend"
import { prisma } from "./prisma"
import { EMAIL_EVENTS } from "./email-events"

const BASE_LAYOUT = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#111827;padding:20px 32px;">
  <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">{{FROM_NAME}}</span>
</td></tr>
<tr><td style="padding:32px;">{{CONTENT}}</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
  This is an automated message from {{FROM_NAME}}. Please do not reply to this email.
</td></tr>
</table>
</td></tr></table>
</body></html>`

function replaceVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "")
}

interface SendEmailOpts {
  eventKey: string
  toUserId?: string
  toUserIds?: string[]
  to?: string | string[]
  cc?: string[]
  attachments?: Array<{ filename: string; content: Buffer }>
  variables: Record<string, string>
}

export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) { console.error(`[email] SKIP ${opts.eventKey}: no RESEND_API_KEY`); return }

    const settings = await prisma.emailSettings.findUnique({ where: { id: "singleton" } })
    if (!settings?.enabled) { console.error(`[email] SKIP ${opts.eventKey}: email system disabled`); return }

    const toggles = (settings.eventToggles ?? {}) as Record<string, boolean>
    if (toggles[opts.eventKey] === false) { console.error(`[email] SKIP ${opts.eventKey}: event toggled off`); return }

    const template = await prisma.emailTemplate.findUnique({ where: { eventKey: opts.eventKey } })
    // Fall back to default body/subject from EMAIL_EVENTS if no DB template exists
    const eventDef = EMAIL_EVENTS[opts.eventKey]
    if (!template?.isActive && !eventDef) { console.error(`[email] SKIP ${opts.eventKey}: no active template`); return }
    const effectiveSubject = template?.isActive ? template.subject : (eventDef?.defaultSubject ?? opts.eventKey)
    const effectiveBody = template?.isActive ? template.body : (eventDef?.defaultBody ?? "")

    // Resolve recipients
    let recipients: string[] = []
    if (opts.to) {
      recipients = Array.isArray(opts.to) ? opts.to : [opts.to]
    } else if (opts.toUserIds?.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: opts.toUserIds }, isActive: true },
        select: { email: true, name: true },
      })
      recipients = users.map(u => u.email).filter((e): e is string => !!e)
    } else if (opts.toUserId) {
      const u = await prisma.user.findUnique({
        where: { id: opts.toUserId },
        select: { email: true, name: true },
      })
      if (u?.email) recipients = [u.email]
    }

    if (recipients.length === 0) { console.error(`[email] SKIP ${opts.eventKey}: no recipients resolved`); return }

    // ─── Seed-account protection ────────────────────────────────────────────
    // Strip out recipients whose User row is marked isSeeded=true. These are
    // dev/demo accounts (seed.ts + seed-test.ts) with fake addresses that would
    // bounce in production. Real users created via the UI default to false.
    // Flip the flag (or delete the account) when a real user takes over.
    const knownUsers = await prisma.user.findMany({
      where: { email: { in: recipients } },
      select: { email: true, isSeeded: true },
    })
    const seededEmails = new Set(knownUsers.filter(u => u.isSeeded).map(u => u.email!.toLowerCase()))
    if (seededEmails.size > 0) {
      const dropped = recipients.filter(r => seededEmails.has(r.toLowerCase()))
      recipients = recipients.filter(r => !seededEmails.has(r.toLowerCase()))
      console.warn(`[email] BLOCKED ${opts.eventKey} for seeded recipient(s): ${dropped.join(", ")}`)
    }
    if (recipients.length === 0) { console.warn(`[email] SKIP ${opts.eventKey}: all recipients were seeded accounts`); return }

    // ─── CEO / ED permanent block ────────────────────────────────────────────
    // These two accounts are permanently blocked from receiving system emails
    // until this list is manually removed from the code.
    const CEO_ED_BLOCKED = new Set(["david@michaeldemohrms.example", "rachel@michaeldemohrms.example"])
    const blockedCeoed = recipients.filter(r => CEO_ED_BLOCKED.has(r.toLowerCase()))
    if (blockedCeoed.length > 0) {
      recipients = recipients.filter(r => !CEO_ED_BLOCKED.has(r.toLowerCase()))
      console.warn(`[email] BLOCKED ${opts.eventKey} for CEO/ED: ${blockedCeoed.join(", ")}`)
    }
    if (recipients.length === 0) { console.warn(`[email] SKIP ${opts.eventKey}: only CEO/ED recipients`); return }

    const vars = { ...opts.variables }

    const subject = replaceVars(effectiveSubject, vars)
    const content = replaceVars(effectiveBody, vars)
    const html = BASE_LAYOUT
      .replace(/\{\{FROM_NAME\}\}/g, settings.fromName)
      .replace("{{CONTENT}}", content)

    // Sender address: env var is the source of truth. DB fallback only kicks
    // in if EMAIL_FROM_ADDRESS isn't set (mostly for local-dev convenience).
    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? settings.fromEmail
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: `${settings.fromName} <${fromAddress}>`,
      to: recipients,
      cc: opts.cc?.length ? opts.cc : undefined,
      subject,
      html,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    } as any)
    if (result.error) console.error(`[email] RESEND ERROR ${opts.eventKey}:`, result.error)
  } catch (e) {
    console.error(`[email] EXCEPTION ${opts.eventKey}:`, e)
  }
}

// Convenience: send to multiple userIds individually (respects per-recipient name)
export async function sendEmailToMany(
  userIds: string[],
  opts: Omit<SendEmailOpts, "toUserId" | "toUserIds" | "to">
): Promise<void> {
  if (userIds.length === 0) return
  await sendEmail({ ...opts, toUserIds: userIds })
}
