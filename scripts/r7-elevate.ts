import "dotenv/config"
import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const MAP: Record<string, string> = {
  "secondary-admin":   "staff2@dsn-hrms.com",
  "time-leave-admin":  "staff4@dsn-hrms.com",
  "benefits-admin":    "relief1.test@datasciencenigeria.ai",
  "it-admin":          "relief2.test@datasciencenigeria.ai",
  "assets-admin":      "ada.obi@datasciencenigeria.ai",
  "performance-admin": "lead2@dsn-hrms.com",
  "auditor":           "intern@dsn-hrms.com",
  "hr-admin":          "lead1@dsn-hrms.com",
}
async function main() {
  for (const [slug, email] of Object.entries(MAP)) {
    const user = await p.user.findUnique({ where: { email } })
    const role = await p.adminRole.findUnique({ where: { slug } })
    if (!user || !role) { console.error(`✗ ${email} → ${slug}: missing`); continue }
    await p.userAdminRole.upsert({
      where: { userId_adminRoleId: { userId: user.id, adminRoleId: role.id } },
      create: { userId: user.id, adminRoleId: role.id },
      update: {},
    })
    console.log(`✓ ${email} ← ${slug}`)
  }
}
main().finally(() => p.$disconnect())
