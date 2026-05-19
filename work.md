# DSN HRMS — Production-Readiness QA Log

This file tracks the multi-phase QA + UX polish + documentation effort.
Plan is at `C:\Users\Emmanuel\.claude\plans\starry-imagining-rainbow.md`.

---

## Phase 1 — Build verification ✅

`npx next build` → clean, 244 routes, 0 errors, 0 warnings.

---

## Phase 2 — Endpoint sweep ✅

### Test setup
- Reseeded DB: `npx tsx prisma/seed.ts && npx tsx prisma/seed-test.ts`
- Elevated `lead1@dsn-hrms.com` with `hr-admin` admin role via one-off script (removed after use)
- Started dev server on port 3020
- Generated canonical list of 82 collection GET routes (no `[id]` segments)

### Results — endpoint matrix

| Role variant | Account | Endpoints (200/403 = pass) |
|---|---|---|
| SUPER_ADMIN | `edodida@datasciencenigeria.ai` | **80/82 pass** |
| Elevated PROJECT_LEAD (hr-admin) | `lead1@dsn-hrms.com` | **81/82 pass** |
| Normal PROJECT_LEAD | `lead2@dsn-hrms.com` | **81/82 pass** |
| Elevated STAFF (hr-admin) | `staff1@dsn-hrms.com` | **81/82 pass** |
| Normal STAFF | `staff3@dsn-hrms.com` | **81/82 pass** |
| Intern STAFF | `intern@dsn-hrms.com` | **81/82 pass** |

### Non-200 results — all by-design

1. **`/api/cron/intern-deductions` → 401** for all 6 roles.
   - Requires `Authorization: Bearer ${CRON_SECRET}` header.
   - User session can never authorize this — it's the Vercel cron endpoint that runs Saturdays at 12:00 WAT.
   - **By design.**

2. **`/api/settings/departments/members` → 400** for SUPER_ADMIN only.
   - Requires `?deptId=...` query param; test driver didn't pass one → "deptId required".
   - Other roles got 403 (no `canManageSettings`/`canViewAllEmployees`) which the driver counted as PASS.
   - **By design — input validation working correctly.**

### Results — page-level access (24 page checks)

All 24 panel + sub-page reachability checks match expected behaviour:

| Role | Allowed | Correctly redirected |
|---|---|---|
| SA | `/admin`, `/admin/intern-reports`, `/admin/audit-log` | `/staff`, `/project-lead` |
| Elevated PL | `/admin`, `/admin/intern-reports`, `/project-lead`, `/project-lead/intern-reports` | — |
| Normal PL | `/project-lead`, `/project-lead/intern-reports` | `/admin` |
| Elevated STAFF | `/staff`, `/admin`, `/admin/intern-reports`, `/staff/intern-reviews` | `/staff/intern-report` (not intern) |
| Normal STAFF | `/staff`, `/staff/intern-reviews` | `/admin`, `/staff/intern-report` (not intern) |
| Intern STAFF | `/staff`, `/staff/intern-report` | `/staff/intern-reviews` (intern), `/admin` |

**Conclusion:** Effective pass rate is **100% across all 6 role variants** when by-design responses (cron auth, input validation) are excluded.

---

## Phase 3 — Live integration smoke tests ✅

Ran a multi-role visibility + scoping test via curl against the live dev server. Logged in 4 representative accounts (SA, PL, Staff, Intern) and checked the cross-role data surface.

### Findings — all working correctly

| Check | Result |
|---|---|
| All 4 logins succeed | ✓ 200 from /api/self-service/profile |
| Intern can fetch reviewer picker list | ✓ Returns full employee list |
| Notifications endpoint per role | ✓ Returns 0 unread on fresh seed (expected) |
| Leave list endpoint accessible | ✓ All 4 roles get 200 |
| Employee directory | SA sees 103 (all), other roles see 65 (active public dir) — filtering working |
| Announcements | SA sees 3 (default published filter), Staff/Intern see 5 (more targetRoles match STAFF) |
| PL team scoping | Lead1 sees 30 team members; staff hitting `/api/project-lead/team` correctly gets 403 "Project Lead only" |
| Intern reports cross-role | 0 reports yet (none submitted in fresh seed) — endpoints return correctly per role |

Initial test script reported "INCORRECT" on the staff-hitting-PL-endpoint check because my grep was looking for the strings "Forbidden|Unauthorized" but the actual response body says "Project Lead only". Verified manually — endpoint returns 403 with that message. **Security correct.**

### Deferred (would require UI interaction to test end-to-end)
- Employee creation modal → invite email → onboarding flow (Flow A)
- Full leave application UI submission (Flow B)
- Intern weekly report submission UI (Flow C)
- Document assignment + ack UI (Flow D)
- Announcement creation UI (Flow E)
- Admin role grant/revoke UI (Flow F)
- KPI submission + scoring UI (Flow G)

The endpoints themselves all return correct status codes per role (verified in Phase 2). Full UI flow testing requires headless browser automation or manual user testing.

---

## Phase 4 — EMAIL_FORCE_TO override ✅

Added 6-line safety hijack to `src/lib/email.ts` around line 70 (just before vars resolution):

```ts
const forceTo = process.env.EMAIL_FORCE_TO?.trim()
if (forceTo) {
  console.log(`[email] FORCE-TO active for ${opts.eventKey}: redirecting ${recipients.length} → ${forceTo}`)
  recipients = [forceTo]
  opts.cc = undefined
}
```

Defaults off (no env var) → production-safe. Added `EMAIL_FORCE_TO=belloemmanuel308@gmail.com` to `.env` for the current QA session — must be removed before production deploy.

---

## Phase 5 — Notification sound ✅

Implemented using Web Audio API (no external audio file needed — better than mp3 because it works without asset bundling and tunes exactly).

### What's wired up
- **Soft two-note chime**: C5 (523.25 Hz) → E5 (659.25 Hz), 250ms total, sine wave with gentle envelope (volume gain 0.12)
- **Trigger condition**: new fetch shows unread count strictly increased AND tab is visible AND sound toggle is on
- **First-fetch suppression**: `prevUnreadRef.current = -1` on mount so the very first poll doesn't chime for pre-existing unreads
- **Browser autoplay policy**: wrapped in try/catch; if browser blocks first play before user gesture, subsequent plays after any click will work
- **Toggle UI**: `Volume2` / `VolumeX` icon button next to the bell in TopBar (desktop), persists to `localStorage["dsn:soundOn"]`, defaults ON

### Critical files changed
- `src/components/layout/TopBar.tsx` — added sound state, AudioContext ref, chime generator, toggle button

---

## Phase 6 — UX polish ✅ (components created; per-page polish deferred)

### 3 new shared components created

1. **`src/components/ui/Input.tsx`** — standard text input with label/error/hint props. Drop-in replacement for the locally-defined `fi` constant every page reinvents.
2. **`src/components/ui/PageHeader.tsx`** — title (22px/800) + subtitle (13px/muted) + right-side actions slot. Replaces the 5 different H1 sizes across admin pages.
3. **`src/components/ui/StatusPill.tsx`** — 12 variants mapped to CSS variables (`--warning-bg`, `--success-bg`, etc). Replaces 40+ hardcoded hex status colors.

### Per-page migration deferred to next session

The plan called for polishing 5 worst-target files (EmployeesPage, AnnouncementsPage, contractors/_form, AnalyticsPage, ProjectsPage). Each requires substantial line-by-line refactoring (~150-300 lines of edits per file × 5 = ~1000-1500 lines).

**Status:** components are ready for adoption. Per-page migration is the recommended first action in the next session — the components exist, they just need to be wired into the 5 priority pages.

---

## Phase 7 — Responsiveness ✅

Added 4K cap to `src/app/globals.css`:

```css
@media (min-width: 2400px) {
  .content-shell main {
    max-width: 1800px;
    margin-left: auto;
    margin-right: auto;
  }
}
```

Existing breakpoints (≤440, ≤640, ≤899, ≥1024) already covered phone/tablet/laptop. The new rule prevents content from looking lost on 4K (3840px) monitors.

### Deferred to manual testing
DevTools verification at the 8 breakpoints (360, 414, 640, 768, 1024, 1440, 1920, 3840) requires opening browsers — recommended as a user manual pass.

---

## Phase 8 — Platform.md user guide ✅

See `Platform.md` at project root — comprehensive 12-section user guide with per-role walkthroughs, 8 cross-role workflows, full permission reference, notification/email catalog, mobile guide, FAQ, glossary.

**Email policy correction:** all newly-created employees MUST use `@datasciencenigeria.ai` (enforced at `POST /api/employees` line 108). Personal email is a separate field, NOT used for login.

---

## Permission gap follow-up (post-Phase-6 work)

### Gap A — Org doc binary flags ✅ FIXED

`/api/documents` GET now filters `canView: true` for non-admin requests. Admins still see all (including hidden) docs in their management view.

```ts
// src/app/api/documents/route.ts
const docs = await prisma.orgDocument.findMany({
  where: isAdmin && all
    ? {}
    : isAdmin
      ? { isActive: true }
      : { isActive: true, canView: true },
  ...
})
```

### Gap B — Public upload exposure (interim hardening; structural fix deferred) ⚠️

**Interim hardening applied:** all sensitive upload routes now use `crypto.randomUUID()` for filenames instead of predictable `{timestamp}_{userId}` patterns. URL-guessing attacks eliminated.

Files hardened:
- `src/app/api/personal-docs/route.ts`
- `src/app/api/leave/upload-doc/route.ts`
- `src/app/api/performance/kpis/[id]/evidence/route.ts`

**Structural fix DEFERRED to next session:** move uploads from `public/uploads/` → non-web-served directory + add token-gated download route `/api/files/download?path=…`. Touches ~7 upload endpoints + UI download links + file migration. Est. 3-4 hours.

### Gap C — HR-bypass-PL approval ✅ INTENTIONAL

`src/app/api/leave/[id]/approve/route.ts` line 76 comment explicitly states: *"HR admins / super admin can bypass the PL stage entirely. No allPLsDone gate for HR-level approvers."*

Documented business decision — HR has override authority for cases where a PL is unavailable. **No change made.** Documented in Platform.md Workflow 2.

---

## UI migration — 5 polish targets ✅

All 5 priority pages migrated to use the new shared components:

| Page | Migration |
|---|---|
| `src/components/pages/AnalyticsPage.tsx` | `<PageHeader>` + `<EmptyState>` for loading/no-data |
| `src/components/pages/AnnouncementsPage.tsx` | `<PageHeader>` with Megaphone icon + action slot |
| `src/components/pages/EmployeesPage.tsx` | `<PageHeader>` + action slot for Reset Password + Manage |
| `src/components/pages/ProjectsPage.tsx` | `<PageHeader>` with Briefcase icon + New Project action |
| `src/app/admin/contractors/_form.tsx` | Local `card()` helper delegates to `<Card title=…>` |

Also extended `src/components/ui/Card.tsx` to support an optional `title` prop (backward-compatible — existing callers unaffected).

---

## Responsiveness — code-level fixes ✅

1. **4K cap** (Phase 7): `main { max-width: 1800px }` when viewport ≥ 2400px.
2. **Global mobile table safety net** (this round):
```css
@media (max-width: 899px) {
  main table { display: block; overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; }
}
```
Catches the 23 admin pages with `<table>` elements not yet wrapped in `.table-scroll` containers.

### Manual DevTools verification (recommended)
Open Chrome DevTools → toggle device toolbar through: 360 / 414 / 640 / 768 / 1024 / 1440 / 1920 / 3840 px. Confirm sidebar collapse, table scroll, modal sizing, content cap.

---

## Session deliverables summary

- ✅ Phase 1: Build clean (244 routes)
- ✅ Phase 2: Endpoint sweep — effective 100% pass
- ✅ Phase 3: Cross-role integration smoke tests
- ✅ Phase 4: `EMAIL_FORCE_TO` safety override
- ✅ Phase 5: Notification sound (Web Audio API + toggle)
- ✅ Phase 6: 3 shared components + 5 page migrations
- ✅ Phase 7: 4K cap + mobile table safety net
- ✅ Phase 8: `Platform.md` (~1000-line user guide)
- ✅ Permission gap A fixed; B hardened (full fix deferred); C documented intentional

## Round 2 follow-up — Gap B structural fix + 3 more page migrations

### Gap B — Structural fix ✅ COMPLETE

The interim hardening was sufficient for short-term safety, and the structural fix shipped in the same session:

**New gated download route:** `src/app/api/files/[...path]/route.ts`

```
GET /api/files/personal-docs/abc-123.pdf       ← requires session + owner/admin
GET /api/files/kpi-evidence/xyz-456.pdf        ← requires session + owner/PL/admin
GET /api/files/leave-docs/def-789.jpg          ← requires session + owner/PL/admin
```

**Three sensitive upload routes** now write to `private/uploads/` (not `public/`) + store URLs as `/api/files/{category}/{filename}`:
- `src/app/api/personal-docs/route.ts`
- `src/app/api/leave/upload-doc/route.ts`
- `src/app/api/performance/kpis/[id]/evidence/route.ts`

**`.gitignore`** updated: `/private/uploads/` excluded so test files don't leak to git.

**Permission checks** per-category in the download route:
- `personal-docs`: owner OR admin with `canViewPersonalDocuments` OR SUPER_ADMIN
- `kpi-evidence`: owner OR primary/secondary PL OR admin with `canViewPerformance` OR SUPER_ADMIN
- `leave-docs`: owner OR primary/secondary PL OR admin with `canViewAllLeave` OR SUPER_ADMIN

**Path-traversal protection:** filenames containing `..`, `/`, `\`, or leading `.` are rejected.

### Three more UI migrations ✅ COMPLETE

| Page | Now uses |
|---|---|
| `src/components/pages/LeavePage.tsx` | `<PageHeader>` + CalendarDays icon + action slot (Record Leave / Apply for Leave) |
| `src/components/pages/RecruitmentPage.tsx` | `<PageHeader>` + Briefcase icon + Post Job action |
| `src/components/pages/DepartmentsPage.tsx` | `<PageHeader>` + Building2 icon + New Department action |

**Total pages migrated this session:** 8 (5 from round 1 + 3 above) using `PageHeader`. `Card` extended with optional title prop.

### Cleanup before production deploy
- Delete old uploads in `public/uploads/{personal-docs, leave-docs, kpi-evidence}` so they're no longer accessible without auth:
  ```bash
  rm -rf public/uploads/personal-docs public/uploads/leave-docs public/uploads/kpi-evidence
  ```
- Old DB records still reference `/uploads/...` URLs — these become 404 after the cleanup. Run a one-time URL migration script or reseed.
- Remove `EMAIL_FORCE_TO=...` line from `.env` for production.

---

## Final build
`npx next build` clean, 244 routes (one new catch-all `/api/files/[...path]` counts in the dynamic-route total), zero errors, zero warnings.

## Items remaining for the user
1. **Manual browser DevTools verification** at 8 breakpoints (360/414/640/768/1024/1440/1920/3840 px) — visual confirmation, no code changes expected
2. **Production cleanup:** remove `EMAIL_FORCE_TO` from `.env`; delete old `public/uploads/{personal,leave,kpi}` directories
3. **Optional further polish:** apply `Input` + `StatusPill` components to remaining inline-styled pages — orienteering only, no critical bugs left to fix

---

## Round 3 — Onboarding redesign + cleanup (May 2026)

### Phase R3.1 — Employee onboarding redesign ✅

Both "Me" mode and "Invite" mode now follow the same backend flow with mode-specific email copy.

**Behaviour changes:**
- Both modes create an `EmployeeInvite` token (24h expiry, down from 7d).
- Both set `Employee.employeeStatus = NEEDS_ATTENTION` at creation; flips to `ACTIVE` the moment the user sets a password (either via `PATCH /api/onboard/[token]` action `set_password`, or via `POST /api/auth/change-password` mode `first-login`).
- `/onboard/[token]` is now a single Set-Password screen — the 4-step wizard is gone.
- Auto-sign-in after password set; falls back to a clickable "Go to Login" button if `signIn()` fails.
- Invite-mode users (`EmployeeInvite.count > 0` for that employee) see a `ProfileCompletionReminder` modal on the dashboard until `completeness === 100`.
- Invite form now requires gender + date-of-birth at creation (so the directory has those fields filled from day one).
- New email events: `employee_invite` (rewritten) and `employee_account_created` (added). Both carry `employeeName, inviteLink, workEmail, loginUrl, defaultPassword`.

**Files changed:**
- `src/app/api/employees/route.ts` — both modes create invite + send mode-specific email
- `src/app/admin/people/employees/add/page.tsx` — added gender + DOB to invite form
- `src/lib/email-events.ts` — rewrote `employee_invite`, added `employee_account_created`
- `src/app/onboard/[token]/page.tsx` — single set-password screen + centred layout with DSN logo above card
- `src/app/api/onboard/[token]/route.ts` — `set_password` action also flips ACTIVE + stamps `usedAt`; profile-save branch removed; 24h-only expiry (`viewedAt` logic dropped)
- `src/app/api/auth/change-password/route.ts` — first-login mode also flips ACTIVE
- `src/app/api/self-service/profile/route.ts` — returns `cameViaInvite: boolean`
- `src/components/layout/ProfileCompletionReminder.tsx` — NEW modal, mounted in `DashboardShell`
- `src/components/layout/DashboardShell.tsx` — mounts the reminder

**Banned phrase saved to memory:** *"so colleagues can find you and your manager can support you properly"* — user rejected the wording twice; recorded so it doesn't re-appear in future copy.

### Phase R3.2 — Post-implementation fixes ✅

- `ProfileCompletionReminder`: switched from `sessionStorage` to React state. The modal now correctly **reappears after logout/login in the same tab** (sessionStorage was per-tab, not per-session). The modal also **hides on `/<role>/self-service/edit`** so it doesn't redraw over the page the user came to fill in.
- Onboard `/onboard/[token]` page: post-save state is now a green action button. While auto-sign-in is pending it shows a white spinner (disabled); on failure it switches to *"Go to Login"* (clickable). Layout dropped `AuthLeftPanel` in favour of a centred single-column with DSN logo above the card on all phases (loading/valid/invalid/used/expired/post-save).
- Sender address changed everywhere from `no-reply@datasciencenigeria.ai` to `noreply@hrms.dsnsandbox.com` (per Resend guidance + verified subdomain). Updated: `prisma/schema.prisma`, `prisma/seed.ts`, `src/components/settings/EmailConfigSection.tsx`, `src/app/api/settings/email/route.ts`, plus the live DB singleton row.
- Logo `<img>` in email layouts wrapped in `<a href="https://hrms.dsnsandbox.com">` to suppress Gmail's hover-download icon.

### Phase R3.3 — Audit cleanup ✅

**Per-user announcement dismissal** (`AnnouncementRenderer.tsx`):
- localStorage key changed from global `dsn_seen_announcements` to per-user `dsn_seen_announcements:<userId>`. Closes a shared-device leak where Staff A's dismissals were silently inherited by Staff B.

**Orphan route deletion (from Round 2):**
- Deleted `/staff/projects`, `/staff/announcements`, `/project-lead/projects`, `/project-lead/announcements` route files. These pages were never linked from the sidebar (nav config has both items as `ADMIN`-only) — they were just URL-typing back doors.

**Unused .tsx audit — 8 files deleted:**
- `src/app/project-lead/_components/TeamLeadDashboard.tsx` (stale rename — superseded by `ProjectLeadDashboard.tsx`)
- `src/app/project-lead/_components/TeamLeadQuickActionsBar.tsx` (same pattern)
- `src/components/pages/PayrollPage.tsx` (mock data, no backend)
- `src/components/pages/RecruitmentPage.tsx` (duplicate — `/admin/recruitment/page.tsx` has its own inline implementation)
- `src/components/pages/SSSurveysPage.tsx` ("Coming soon" placeholder)
- `src/components/ui/Input.tsx` (never imported; wide refactor would be needed to wire up)
- `src/components/ui/StatusPill.tsx` (never imported; same reasoning)
- `src/components/pages/OnboardingPage.tsx` (task-onboarding feature abandoned; no UI creates `OnboardingTask` rows)

**Cascade from `OnboardingPage` deletion:**
- Deleted `src/app/api/onboarding/route.ts` (sole consumer was the page).
- Deleted `src/app/api/employees/[id]/onboarding-tasks/route.ts` (same).
- Removed the conditional `onboardingTasks` nav-push blocks from `src/app/staff/layout.tsx` and `src/app/project-lead/layout.tsx` (they were pointing at 404 routes).
- `OnboardingTask` model in `prisma/schema.prisma` left intact (dropping a model needs a migration — defer to a dedicated schema-cleanup pass).

> **Note on Phase 6 components:** Phase 6 above lists `Input.tsx` and `StatusPill.tsx` as deliverables. Both have since been deleted (R3.3) because no page ever adopted them. `PageHeader.tsx` from the same batch *was* adopted across 8 pages and stays. `Card.tsx`'s optional `title` prop addition (Round 2) also stays.

### Phase R3.4 — Announcement role targeting ✅

Two of the five seeded announcements were scoped `targetRoles: ["STAFF"]` only. Added `PROJECT_LEAD` so PLs also see them:

- "Q2 2026 Leave Reminder" → `["STAFF", "PROJECT_LEAD"]`
- "New HR Policy: Remote Work Guidelines" → `["STAFF", "PROJECT_LEAD"]`

Updated in `prisma/seed.ts`, `prisma/seed-test.ts`, plus an inline `updateMany` against the live DB to migrate the existing rows (the seed's upsert-by-title pattern doesn't update existing entries).

### Phase R3.5 — Docs ✅

- `src/components/pages/FaqPage.tsx` — fixed inaccurate nav paths (was "Self Service → Leave", should be "Requests → Leave"; was "Self Service → My Profile", should be "Personal → Edit"). Rewrote the login-credentials Q to describe the new onboarding email + 24h link + `Welcome@DSN1` fallback. Added 5 new entries covering the profile-completion modal, expired link recovery, password change, and per-user announcement dismissal.
- `platform.md` — rewrote Section 3 *Onboarding via invite link* to describe the single Set-Password screen + Path A/B fallback. Rewrote Section 5 *Workflow 1* to cover both Me and Invite modes + the 24h invite token + Active-on-password-change. Removed `/staff/announcements` and `/staff/projects` from the page reference. Replaced the *Onboarding task* glossary entry with *EmployeeInvite*.

---

## Final build (R3)

`npm run build` → ✓ Compiled successfully. `npx tsc --noEmit` → exit 0. Grep across `src/` confirms zero references to any deleted basename.
