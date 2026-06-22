# DSN HRMS

Human Resource Management System for Data Science Nigeria — built with Next.js 16, Prisma, and PostgreSQL

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
npx prisma db push --accept-data-loss   # apply schema changes that DROP tables/columns (data in dropped objects is lost — data in untouched tables is kept)
npx prisma db seed                      # re-seed if seed data was updated (optional)
npm run db:seed:test                   # optional: seed local dev/test demo data
npx prisma generate                     # regenerate the Prisma client
npm run dev
```

> **Note:** If a pull includes destructive schema changes (dropped columns, renamed fields), use the `--accept-data-loss` variant — it's less aggressive than `--force-reset` because it keeps data in tables you haven't touched


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

Uploaded files are stored in `public/uploads/` which is gitignored. Each team member's uploads are local to their machine. In production, replace with a cloud storage provider (S3, Cloudinary, etc.).
