/**
 * Detailed smoke test: dump gated URLs per role so we can explain WHY each role got denied.
 */
import "dotenv/config"
import fs from "fs"
import path from "path"

const BASE = "http://localhost:3020"

interface Account { variant: string; email: string; password: string }
const ACCOUNTS: Account[] = [
  { variant: "SUPER_ADMIN",        email: "hr@datasciencenigeria.ai",                password: "Admin@DSN2024!" },
  { variant: "secondary-admin",    email: "staff2@dsn-hrms.com",                     password: "dsn-demo" },
  { variant: "hr-admin (PL)",      email: "lead1@dsn-hrms.com",                      password: "dsn-demo" },
  { variant: "hr-admin (STAFF)",   email: "staff1@dsn-hrms.com",                     password: "dsn-demo" },
  { variant: "time-leave-admin",   email: "staff4@dsn-hrms.com",                     password: "dsn-demo" },
  { variant: "benefits-admin",     email: "relief1.test@datasciencenigeria.ai",      password: "Welcome@DSN1" },
  { variant: "it-admin",           email: "relief2.test@datasciencenigeria.ai",      password: "Welcome@DSN1" },
  { variant: "assets-admin",       email: "ada.obi@datasciencenigeria.ai",           password: "Welcome@DSN1" },
  { variant: "performance-admin",  email: "lead2@dsn-hrms.com",                      password: "dsn-demo" },
  { variant: "auditor",            email: "intern@dsn-hrms.com",                     password: "dsn-demo" },
  { variant: "Normal STAFF",       email: "staff3@dsn-hrms.com",                     password: "dsn-demo" },
  { variant: "Normal PL",          email: "projectlead.test@datasciencenigeria.ai",  password: "Welcome@DSN1" },
]

function collectRoutes(): string[] {
  const root = path.join(process.cwd(), "src/app/api")
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(fp)
      else if (entry.name === "route.ts") {
        const file = fs.readFileSync(fp, "utf8")
        if (/export\s+async\s+function\s+GET/.test(file)) out.push(fp)
      }
    }
  }
  walk(root)
  return out
    .map(p => p.replace(/\\/g, "/").replace(/^.*\/src\/app\/api/, "/api").replace("/route.ts", ""))
    .filter(p => !p.includes("["))
    .sort()
}

function pickCookies(res: Response): string {
  const list = (res.headers as any).getSetCookie?.() as string[] | undefined
    ?? (res.headers.get("set-cookie")?.split(",") ?? [])
  return list.map((c: string) => c.split(";")[0]).join("; ")
}

async function login(acc: Account): Promise<string | null> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const csrfCookie = pickCookies(csrfRes)
  const csrfData: any = await csrfRes.json()
  const body = new URLSearchParams({
    csrfToken: csrfData.csrfToken, email: acc.email, password: acc.password,
    json: "true", callbackUrl: `${BASE}/`,
  })
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookie },
    body: body.toString(), redirect: "manual",
  })
  const sess = pickCookies(res)
  if (!sess.includes("session-token")) return null
  return [csrfCookie, sess].filter(Boolean).join("; ")
}

async function probe(cookie: string, url: string): Promise<number> {
  try {
    const r = await fetch(`${BASE}${url}`, { headers: { Cookie: cookie }, redirect: "manual" })
    return r.status
  } catch { return 0 }
}

async function main() {
  const routes = collectRoutes()
  console.log(`Discovered ${routes.length} routes\n`)

  type Result = { variant: string; allowed: string[]; gated: { url: string; status: number }[]; failed: { url: string; status: number }[] }
  const results: Result[] = []

  for (const acc of ACCOUNTS) {
    const cookie = await login(acc)
    if (!cookie) { console.log(`✗ ${acc.variant}: LOGIN FAILED`); continue }
    const allowed: string[] = []
    const gated: { url: string; status: number }[] = []
    const failed: { url: string; status: number }[] = []
    for (const url of routes) {
      const s = await probe(cookie, url)
      if (s === 200) allowed.push(url)
      else if (s === 400 || s === 401 || s === 403) gated.push({ url, status: s })
      else failed.push({ url, status: s })
    }
    results.push({ variant: acc.variant, allowed, gated, failed })
    console.log(`✓ ${acc.variant}: ${allowed.length} allowed / ${gated.length} gated / ${failed.length} fail`)
  }

  // Summary table
  console.log("\n\n=== SUMMARY ===")
  console.log("| Variant            | Allowed | Gated | 5xx |")
  console.log("|--------------------|---------|-------|-----|")
  for (const r of results) {
    console.log(`| ${r.variant.padEnd(18)} | ${String(r.allowed.length).padEnd(7)} | ${String(r.gated.length).padEnd(5)} | ${r.failed.length} |`)
  }

  // Detailed gated dump per role
  console.log("\n\n=== GATED URLS PER ROLE (the 4xx denials) ===")
  for (const r of results) {
    console.log(`\n--- ${r.variant} (${r.gated.length} gated) ---`)
    // Group by status code
    const byStatus: Record<number, string[]> = {}
    for (const g of r.gated) {
      if (!byStatus[g.status]) byStatus[g.status] = []
      byStatus[g.status].push(g.url)
    }
    for (const [status, urls] of Object.entries(byStatus)) {
      console.log(`  ${status} (${urls.length}):`)
      for (const u of urls) console.log(`    ${u}`)
    }
  }

  // 5xx if any
  const anyFails = results.some(r => r.failed.length > 0)
  if (anyFails) {
    console.log("\n\n=== 5XX FAILURES ===")
    for (const r of results) {
      if (r.failed.length === 0) continue
      console.log(`\n${r.variant}:`)
      for (const f of r.failed) console.log(`  ${f.status}  ${f.url}`)
    }
  } else {
    console.log("\n\n✓ ZERO 5xx anywhere")
  }
}

main().catch(e => { console.error(e); process.exit(1) })
