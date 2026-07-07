# Michael Demo HRMS

Human Resource Management System - built with Next.js 16, Prisma, and PostgreSQL.

## Screenshots

| Login | Dashboard | Employees |
|---|---|---|
| ![Login page](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Employees list](docs/screenshots/employees.png) |

## Developed by

**Michael Adeniran**
Nigeria 🇳🇬

🔗 [linkedin.com/in/michaeladeniran](https://linkedin.com/in/michaeladeniran)
✉️ michaeladeniransnr@gmail.com

## Reference

- **Feature & code audit:** https://claude.ai/code/artifact/5d4e31a1-b278-4e41-8266-e2c405ae59a6?via=auto_preview — a living status report of what's built, partial, and buggy across the app. This link is redeployed in place as fixes land (same URL, new content) — never delete this entry, and log each redeploy below with a version, date, and time.

  | Version | Date/time | Summary |
  |---|---|---|
  | v1 | 2026-07-06 (initial) | First audit: 22 feature areas reviewed, 2 critical auth-bypass bugs, several permission-wiring gaps, and a handful of correctness/dead-code findings. |
  | v2 | 2026-07-06 14:40 WAT | All "Fix first" items from v1 resolved and verified live (SUPER_ADMIN + STAFF test accounts). Also found and fixed a separate SUPER_ADMIN permission-lockout bug across 7 routes, discovered while wiring the v1 fixes. Remaining open item: file uploads off by default (`UPLOADS_ENABLED`) — a deployment config choice, not a bug. |

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Git
- Vercel

## First-time setup guide

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd dsn-hrms
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/dsn_hrms"
NEXTAUTH_SECRET="your-random-secret"        # generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

Apply the schema and seed initial data:

```bash
npx prisma db push
npx prisma db seed
npm run db:seed:test   # optional: add local demo/test users and sample employee data
npx prisma generate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## After pulling updates from Git

Whenever a team member pulls changes that include schema or seed updates, run:

```bash
git pull
npm install                             # in case new packages were added
npx prisma db push                      # apply any schema changes
npx prisma db push --force-reset        # this drops all tables and recreates them from your current schema.
npx prisma db push --accept-data-loss   # apply schema changes that DROP tables/columns (data in dropped objects is lost - data in untouched tables is kept)
npx prisma db seed                      # re-seed if seed data was updated (optional)
npm run db:seed:test                   # optional: seed local dev/test demo data
npx prisma generate                     # regenerate the Prisma client
npm run dev
```

> **Note:** If a pull includes destructive schema changes (dropped columns, renamed fields), use the `--accept-data-loss` variant - it's less aggressive than `--force-reset` because it keeps data in tables you haven't touched


---

## Tech stack

| Layer      | Technology                     |
|------------|--------------------------------|
| Framework  | Next.js 16.2 (App Router)      |
| Database   | PostgreSQL                     |
| ORM        | Prisma v6                      |
| Auth       | NextAuth.js                    |
| Styling    | Inline styles                  |

## Project structure

```
src/
  app/
    (dashboard)/     # All authenticated pages
    api/             # API route handlers
  components/        # Reusable UI components
  lib/               # Prisma client, RBAC, auth helpers
prisma/
  schema.prisma      # Database schema
  seed.ts            # Seed data
public/
  uploads/           # File uploads (gitignored)
```

## File uploads

Uploaded files are stored in `public/uploads/` which is gitignored. Each team member's uploads are local to their machine. In production, replace with a cloud storage provider (S3, Cloudinary, etc.). Uploads are disabled unless `UPLOADS_ENABLED="true"` is set in the environment.

## Scheduled jobs (cron)

This app deploys on Netlify, which doesn't run these routes on a schedule by itself. Six endpoints are designed to be hit periodically by an external scheduler (e.g. a Netlify Scheduled Function, GitHub Actions cron, or a service like cron-job.org), each requiring an `Authorization: Bearer <CRON_SECRET>` header matching the `CRON_SECRET` env var:

| Endpoint | Suggested schedule |
|---|---|
| `POST /api/cron/bus-allocate` | Daily, early morning on bus days |
| `GET /api/cron/birthdays` | Daily, morning |
| `GET /api/cron/intern-deductions` | Weekly, Monday morning |
| `GET /api/cron/intern-conversion-check` | Weekly, Monday morning |
| `GET /api/leave/auto-status` | Daily, early morning |
| `GET /api/leave/auto-welcome` | Daily, morning |
| `POST /api/leave/auto-nudge` | Hourly, weekdays 8am–6pm |

Without a scheduler configured, none of these fire on their own — bus seat allocation, intern deduction tracking, and leave status/nudge automation will not run.
