# DSN HRMS — Platform User Guide

A complete guide to using the DSN HRMS platform. Pick your role, follow the walkthroughs, and you'll know everything you need.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Roles overview](#2-roles-overview)
3. [Getting started](#3-getting-started)
4. [Per-role walkthroughs](#4-per-role-walkthroughs)
5. [Major workflows](#5-major-workflows)
6. [Page reference](#6-page-reference)
7. [Permission reference](#7-permission-reference)
8. [Notifications & emails](#8-notifications--emails)
9. [Settings reference](#9-settings-reference)
10. [Mobile experience](#10-mobile-experience)
11. [Troubleshooting & FAQ](#11-troubleshooting--faq)
12. [Glossary](#12-glossary)

---

## 1. Introduction

**DSN HRMS** is the internal HR management platform for Data Science Nigeria. It handles the full employee lifecycle: hire-to-retire workflows, leave management, performance reviews, intern weekly reports, document distribution, disciplinary records, and reporting.

### Who uses it
- **HR Admins** — manage employees, approve leave, run performance cycles, generate reports
- **Project Leads (PLs)** — manage their team, approve leave for direct reports, review intern weekly reports, score team KPIs
- **Employees (Staff)** — apply for leave, submit KPIs, acknowledge documents, update profile
- **Interns** — submit weekly reports, receive feedback from their PL + additional reviewers

### System requirements
- Modern browser (Chrome, Edge, Firefox, Safari — latest 2 versions)
- Web access to the DSN HRMS URL
- DSN-issued work email (`@datasciencenigeria.ai`) — this is your login credential. Personal emails are NOT accepted as login (the admin-creation API enforces the DSN domain).
- For mobile use: any phone browser; sidebar collapses automatically below 900px

### Branding
- **Primary green** `#0B5C2E` for active states, headings, CTAs
- **Red accent** `#E3192A` for badges, alerts
- Sidebar: very dark green (`#071F10`)
- Off-white canvas with white cards

---

## 2. Roles overview

DSN HRMS has **three system roles**: SUPER_ADMIN, PROJECT_LEAD, STAFF.

A user can also be **elevated** by being assigned one or more **admin roles** which grant additional permissions. Elevation is orthogonal to system role — a PROJECT_LEAD or STAFF can carry an admin role and get access to admin-panel features.

### System roles

| Role | What they are | Where they live |
|---|---|---|
| **SUPER_ADMIN** | The root admin (currently `edodida@datasciencenigeria.ai`). Bypasses all permission checks. | `/admin` panel |
| **PROJECT_LEAD** | A team lead. Their own KPIs go through admin scoring. They review their team's KPIs, intern reports, and approve their team's leave requests. | `/project-lead` panel |
| **STAFF** | Regular employee. Self-service: profile, leave, KPIs, documents, surveys. | `/staff` panel |

### Admin roles (elevation)

A user with any admin role assigned becomes "elevated" — they get an "Admin Panel" switcher in their topbar dropdown and can access `/admin/*` pages that match their role's permissions.

| Admin role | Permissions bundle | Typical user |
|---|---|---|
| **`secondary-admin`** | Full admin panel access (everything except creating other admins) | Number 2 in HR |
| **`hr-admin`** | People, hiring, leave, documents, benefits, disciplinary, intern reports | HR Manager |
| **`time-leave-admin`** | Leave types, leave requests, absence tracking | Leave Officer |
| **`benefits-admin`** | Benefits plans + enrollments | Benefits Coordinator |
| **`it-admin`** | Documents, assets, audit log | IT Officer |
| **`assets-admin`** | Asset inventory + assignments | Asset Manager |
| **`performance-admin`** | Performance cycles, KPIs, groups, reviews | Performance Lead |
| **`auditor`** | Read-only: employees, audit log, reports | External Auditor |

> **Note:** `secondary-admin` and `hr-admin` both include intern-report permissions (`canViewInternReports`, `canReviewInternReports`, `canFillAttendance`).

### Sub-classifications

- **Intern STAFF** — an Employee whose `jobTitle` contains "intern". The JWT auto-sets `isIntern: true`. Interns get the **Weekly Report** page and don't see the **Intern Reviews** page (only non-interns review interns).
- **Elevated PROJECT_LEAD** — a PL with an additional admin role. Sees BOTH `/project-lead/*` panel AND `/admin/*` panel.
- **Elevated STAFF** — a regular employee with an admin role. Sees BOTH `/staff/*` and `/admin/*`.

---

## 3. Getting started

### Email policy (work email)

All newly-created employees (added via `/admin/people/employees/add`) **MUST** use a `@datasciencenigeria.ai` work-email address. The API enforces this server-side:

```
POST /api/employees
→ if email doesn't end with "@datasciencenigeria.ai" → 400
   "Employee email must be a @datasciencenigeria.ai address"
```

So in production, **every employee will have a `@datasciencenigeria.ai` work email** — no Gmail/Yahoo/Outlook personal addresses for the login credential.

> **Note on personal email:** the `personalEmail` field on the Employee record is separate — it's the employee's PRIVATE email (Gmail, Yahoo, etc.) used for non-work correspondence (e.g. password reset fallback). It is NOT the login credential.

> **About the seeded demo accounts** below (`@dsn-hrms.com`): they exist only for development/testing. They were inserted directly via Prisma `seed.ts`, which bypasses the API. Real new hires created through the admin UI must be `@datasciencenigeria.ai`.

### Login

1. Open the DSN HRMS URL → automatic redirect to `/login`
2. Enter your work email + password
3. Submit → routed to your role's home (`/admin`, `/project-lead`, or `/staff`)

The login page accepts any registered email format. You can only register via the admin-creation flow (which enforces the DSN domain) or via direct Prisma seeding.

**Demo accounts (for testing/training only — not real production accounts):**

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | `edodida@datasciencenigeria.ai` | `Admin@DSN2024!` |
| Elevated PL (hr-admin) | `lead1@dsn-hrms.com` | `dsn-demo` |
| Normal PL | `lead2@dsn-hrms.com` | `dsn-demo` |
| Elevated STAFF (hr-admin) | `staff1@dsn-hrms.com` | `dsn-demo` |
| Normal STAFF | `staff3@dsn-hrms.com` | `dsn-demo` |
| Intern STAFF | `intern@dsn-hrms.com` | `dsn-demo` |

### First-login forced password change

If your `mustChangePassword` flag is set (typical for newly-invited accounts), you're forced to `/first-login` and must change your password before any other page works.

Password requirements:
- At least 8 characters
- Mix of uppercase, lowercase, numbers, and symbols

### Onboarding via invite link

When HR adds you as a new employee, you receive an email. The wording depends on which mode HR used:

- **"Me" mode** — HR filled your profile in advance. Email subject: *"Your DSN HRMS account is ready"*.
- **"Invite" mode** — HR added the basics only; you complete the rest yourself. Email subject: *"You're invited to complete your DSN HRMS profile"*.

Both emails contain the same two ways to sign in for the first time:

**Path A — set-password link (works for 24 hours):**
1. Click the **Set your password →** button in the email.
2. Lands on a single password-set screen. Enter a password (8+ chars, mixed case + number + symbol) and submit.
3. You're auto-signed in and routed to your role dashboard. Your employee status flips from `NEEDS_ATTENTION` to `ACTIVE`.
4. **Invite-mode only:** a "Complete your profile" popup appears on first dashboard load and on each new login until completeness reaches 100%.

**Path B — direct login (fallback if the link expired):**
1. Open the login page directly. Enter your work email and the default password `Welcome@DSN1`.
2. The middleware redirects you to `/first-login` to set a new password.
3. After setting it, you're signed out, then sign in again with your new password.
4. Same status flip + reminder modal rules as Path A.

The link expires 24 hours after it's sent. After that, only Path B works.

### Self-service profile completion

After login, your dashboard shows a **profile completeness** percentage. Fill out missing fields via `Self Service → My Profile` to reach 100%. Mandatory fields: firstName, lastName, gender, DOB, marital status, personal email, phone, address, city, state, profile photo, NOK name, NOK phone.

---

## 4. Per-role walkthroughs

### 4.1 SUPER_ADMIN — Day in the life

**Login → `/admin` dashboard.**

The admin dashboard shows:
- **Hero greeting** with your name + role badge
- **Org stats** row: total employees, departments, active jobs, attrition trend
- **Recent employees** + **Pending leave** panels
- **Alerts** banner (overdue leave approvals, incomplete onboarding, etc.)
- **Recent activity feed**

**Top 5 most-used pages:**

1. **`/admin/people/employees`** — full employee list with search, filter, add/edit/delete, bulk upload
2. **`/admin/requests/leave`** — final approval queue for all leave requests across the org
3. **`/admin/reports/intern-reports`** — review all intern weekly reports, fill attendance ratings
4. **`/admin/settings/admins`** — assign admin roles to elevate users
5. **`/admin/audit-log`** — system-wide log of every significant action

**Common tasks:**
- Add a new employee: `/admin/people/employees/add` → fill form → send invite
- Create a department: `/admin/settings/departments` → New Department
- Run a performance cycle: `/admin/performance/period` → New Cycle → Activate
- View analytics: `/admin/analytics` → dashboards for headcount, attrition, leave, gender split

### 4.2 Elevated user (admin role)

You see TWO panels: your role's panel (`/staff` or `/project-lead`) AND `/admin/*` pages your admin role grants.

**Topbar** shows a "Switch to Admin Panel" button (and back). Your sidebar reflects whichever panel you're currently in.

**Permission rule:** SUPER_ADMIN bypasses all checks; any admin role uses its permission set; sub-page guards (`src/lib/server-auth.ts`) redirect you out of pages your role doesn't unlock.

### 4.3 PROJECT_LEAD — Day in the life

**Login → `/project-lead` dashboard.**

PL dashboard shows:
- **Team-at-a-glance** — your direct reports, on-leave today, recent hires
- **Pending leave approvals** — anything waiting for your approval
- **Upcoming intern reports** — interns who haven't submitted this week
- **My KPIs** — your own KPI status (you're an employee too — your KPIs go through admin scoring)

**Top 5 most-used pages:**

1. **`/project-lead/team`** — full team roster with export, filters
2. **`/project-lead/requests/leave`** — approve/reject leave for your direct reports
3. **`/project-lead/intern-reports`** — review weekly reports from interns on your team
4. **`/project-lead/performance/objectives`** — your own KPIs (you submit; admin approves + scores)
5. **`/project-lead/performance/reviews`** — score your team's KPIs

**Common tasks:**
- Approve a leave: `/project-lead/requests/leave` → click pending → Approve
- Review intern report: `/project-lead/intern-reports` → click report → fill productivity (0-3), L&D (0-3), reflections (0-3), comment → save
- Submit your KPI: `/project-lead/performance/objectives` → New KPI → fill → submit
- Schedule a 1:1: `/project-lead/performance/conversations` → New Conversation

### 4.4 STAFF — Day in the life

**Login → `/staff` dashboard.**

Staff dashboard shows:
- **Welcome card** with profile completeness
- **Leave balance** summary (annual, sick, etc.)
- **KPI snapshot** for the active cycle
- **Announcements** targeted at STAFF
- **Celebrations** card (birthdays, anniversaries this week)
- **Active projects** you're assigned to

**Top 5 most-used pages:**

1. **`/staff/self-service/profile`** — your own profile, photo, personal docs upload
2. **`/staff/requests/leave/apply`** — apply for leave
3. **`/staff/performance/objectives`** — view your approved KPIs + update progress/evidence
4. **`/staff/documents`** — see org documents assigned to you (read + acknowledge)
5. **`/staff/surveys`** — respond to active surveys

Announcements are not a separate page; they appear automatically as popups or notification bars on the dashboard. Admins create + target them via `/admin/announcements`.

**Common tasks:**
- Apply for leave: see Workflow 2 below
- Update profile: `/staff/self-service/edit` → edit any field → save (HR-managed fields like jobTitle locked)
- Acknowledge a document: `/staff/documents` → click doc → read → Acknowledge button
- Update KPI progress: `/staff/performance/objectives` → click KPI → Update → fill self-score + progress + upload evidence
- Change password: `/staff/self-service/change-password`

### 4.5 Intern STAFF — Day in the life

Same as STAFF except:
- **`/staff/intern-report`** appears in the sidebar (intern-only via `requiresIntern` flag)
- **`/staff/intern-reviews`** is hidden (only non-interns review interns)
- Dashboard may show a callout: "Submit your weekly report"

**Top task:** Submit weekly report — see Workflow 3 below.

---

## 5. Major workflows

### Workflow 1: Employee onboarding (Admin → New employee)

The admin picks one of two modes when adding an employee:

- **"Me" mode** — admin fills the full profile in advance.
- **"Invite" mode** — admin fills only the minimum: first name, last name, work email, hire date, department, job title, **gender, date of birth**. Everything else is left blank for the employee to complete on their own.

**Both modes do the same backend work:**

1. **HR Admin** → `/admin/people/employees/add` → pick mode → fill form → submit
2. `User` row created with `password = hash("Welcome@DSN1")` and `mustChangePassword = true`
3. `Employee` row created with `employeeStatus = NEEDS_ATTENTION`
4. `EmployeeInvite` token created with a 24-hour expiry
5. Email sent immediately:
   - Invite mode → `employee_invite` event (subject *"You're invited to complete your DSN HRMS profile"*)
   - Me mode → `employee_account_created` event (subject *"Your DSN HRMS account is ready"*)
   - Both emails include a `/onboard/[token]` Set-Password button and the default-password instructions as a fallback

**The new employee then sees one of two paths** (see Section 3 → *Onboarding via invite link*):

- **Path A — click the link.** Single set-password screen → auto-sign-in → role dashboard. `EmployeeInvite.usedAt` stamped; `Employee.employeeStatus` flips to `ACTIVE`.
- **Path B — direct login** with `Welcome@DSN1`. Redirected to `/first-login`, set new password, sign out, sign in again. Same status flip.

**After landing on the dashboard:**

- Invite-mode users see a **Complete your profile** modal on each new login until completeness reaches 100% (13 required fields). The detection check looks for the existence of an `EmployeeInvite` row — Me-mode users have one too but their profile is filled, so the modal isn't triggered.
- Me-mode users who had every field filled in advance see no popup.

### Workflow 2: Leave application + multi-stage approval

```
Staff applies  →  Notif/email to PL + HR
                  Notif to relief officer
        ↓
PL approves    →  Notif/email to HR
        ↓
HR approves    →  Notif/email to Staff (Approved)
                  Notif to relief officer (Relief Duty Confirmed)
        ↓
Auto-flip to ON_LEAVE on start date (via /api/leave/auto-status cron)
        ↓
Welcome-back email on return date (via /api/leave/auto-welcome cron)
```

**Detailed steps:**

1. **Staff** → `/staff/requests/leave/apply` → fill: leave type, start date, end date, reason, project lead = your PL, relief officer = a colleague → optionally upload supporting doc → Submit
2. LeaveRequest row created with status `PENDING_PROJECT_LEAD`
3. PL receives: notification + `leave_submitted_pl` email
4. HR admins receive: notification + `leave_submitted_hr` email
5. Relief officer receives: notification (relief assignment is info-only — no accept/decline)
6. **PL** → `/project-lead/requests/leave` → click pending → Approve/Reject
7. On approval: status → `PENDING_HR_ADMIN`. HR admins receive `leave_progressing` email
8. **HR Admin** → `/admin/requests/leave` → click → final Approve/Reject
9. On final approval: status → `APPROVED`. Staff receives `leave_approved` notif + email. Relief officer receives `relief_assigned` email with task details
10. **Auto-status:** when start date arrives, `/api/leave/auto-status` cron flips employee `employeeStatus` to `ON_LEAVE`. On end date + 1, back to `ACTIVE` + welcome-back email

**Cancelling a leave:** staff can cancel pending or approved leave from `/staff/requests/leave` → row menu → Cancel. Status flips to `CANCELLED`. Affected approvers + relief officers are notified.

### Workflow 3: Intern weekly report cycle

```
Intern submits           →  Notif/email to PL (primary) + extra reviewers
                            Email to all carries .xlsx attachment
        ↓
PL fills feedback        →  (3 ratings + comment)
Extra reviewers comment  →  (comment only)
        ↓
When ALL reviewers done  →  Notif/email to intern (Reviewed)
        ↓
Admin fills attendance   →  (0-3 rating; total score computed)
```

**Detailed steps:**

1. **Intern** → `/staff/intern-report` → fill:
   - Hours table (12 categories: main project, consulting, training, etc.)
   - 5 daily reflections (Monday-Friday)
   - Optional: pick extra reviewers (defaults to PL only; intern can add colleagues)
2. Submit → `InternWeeklyReport` row created
3. `InternReportReviewer` rows created: 1 primary (PL with `isPrimary=true`) + N extras
4. **Notifications + emails fired:**
   - To PL: `intern_report_submitted` with .xlsx attachment
   - To each extra reviewer: `intern_report_reviewer_assigned` with same attachment
5. **PL** → `/project-lead/intern-reports` → click report → fill: productivity rating (0-3), L&D rating (0-3), reflections rating (0-3), TL comment → save
6. **Extra reviewers** → `/staff/intern-reviews` → click report → leave comment → save (no ratings, only comments)
7. When ALL reviewer records have `reviewedAt != null` → report status flips to `REVIEWED`
8. Intern receives `intern_report_reviewed` notif + email
9. **HR Admin** (with `canFillAttendance`) → `/admin/reports/intern-reports` → click report → fill attendance rating (0-3) → save → total score auto-computed (productivity + L&D + reflections + attendance) — minus any late deduction

**Privacy note:** Interns viewing their own past reports see the daily reflections + hours, but NOT the rating numbers (TL ratings are private feedback to admins, shown to intern only as an aggregate "REVIEWED" status).

### Workflow 4: Document distribution + acknowledgement

1. **HR Admin** → `/admin/documents/new` → upload file (PDF/Word/JPG) → title, description, status PUBLISHED → assign to specific employees OR everyone
2. `Document` row + `DocAck` row per assigned employee (initial `ackedAt = null`)
3. **Each recipient** → `/staff/documents` → sees the doc → opens → reads → clicks **Acknowledge**
4. `DocAck.ackedAt` updated. Admin can see ack progress at `/admin/documents/[id]`

### Workflow 5: Performance cycle

```
Admin creates cycle  →  /admin/performance/period → New Cycle → set name, year, half, dates, KPI deadline → Activate
        ↓
Staff submits KPIs   →  /staff/performance (or /project-lead/performance/objectives for PL's own KPIs)
        ↓
Manager approves     →  PL approves their team's; admin approves PL's own
        ↓
Self-score + evidence (during review window) → /staff/performance/objectives → Update Progress modal → upload evidence
        ↓
Manager scores       →  PL scores team; admin scores PL
        ↓
Admin sets final     →  /admin/performance/objectives → Score modal → managerScore + finalScore
        ↓
Admin closes cycle   →  /admin/performance/reviews → Close Cycle button
        ↓
Staff sees results   →  /staff/performance/reviews → read-only final scores
```

### Workflow 6: Disciplinary record

1. **Manager / HR Admin** → `/admin/disciplinary/violations/new` → fill: employee, violation type, incident date, details, optional supporting doc → save
2. `Violation` row created. If the violation type has automatic triggers (e.g. "3 incidents → suspension"), check trigger logic.
3. Employee can be notified (depends on `expectingResponse` flag)
4. Subsequent action via `/admin/disciplinary/policies` (apply policy) or `/admin/disciplinary/suspensions/new`

### Workflow 7: Profile update request → admin approval

1. **Staff** → `/staff/self-service/edit` → change a HR-locked field (jobTitle, dept) → on save, ProfileUpdateRequest row created (NOT directly applied)
2. HR Admin receives notification + `profile_update_request` email
3. HR → `/admin/people/profile-requests` → review → Approve/Reject
4. On approve: Employee record updated, staff receives `profile_update_approved` notification + email
5. On reject: staff receives `profile_update_rejected` notification + email with reason

### Workflow 8: Personal document upload (employee → admin review)

1. **Staff** → `/staff/self-service/profile` → Documents tab → choose type (SSCE, First Degree, NYSC, Cert, Utility Bill, NIN Slip, Other) → upload PDF/image → save
2. `PersonalDocument` row created, status `PENDING`
3. All SUPER_ADMINs notified + `personal_doc_uploaded` email
4. HR Admin → review → Approve / Reject with reason
5. Staff notified: `personal_doc_approved` or `personal_doc_rejected` email

---

## 6. Page reference

### `/admin` (SUPER_ADMIN + elevated admins)

| Page | URL | Permission gate | Purpose |
|---|---|---|---|
| Dashboard | `/admin` | Any admin role | Org-wide stats, recent activity, alerts |
| Analytics | `/admin/analytics` | `canViewAnalytics` | Charts: headcount, attrition, gender split, leave trends |
| Announcements | `/admin/announcements` | `canViewAnnouncements` | Create + manage announcements, target by role |
| Audit Log | `/admin/audit-log` | `canViewAuditLog` | System-wide log of all significant actions |
| Benefits | `/admin/benefits` | `canViewBenefits` | Benefit plans + employee enrollments |
| Calendar | `/admin/calendar` | Any admin role | Org events, anniversaries, holidays |
| Company Details | `/admin/company-details` | SUPER_ADMIN | Company info, workplaces, compliance |
| Contractors | `/admin/contractors` | `canViewContractors` | Contractor records + payments |
| Disciplinary | `/admin/disciplinary/*` | `canViewDisciplinary` | Violations, policies, suspensions, triggers, types |
| Documents | `/admin/documents` | `canViewDocuments` | Upload + assign org documents |
| Faq | `/admin/faq` | Any admin role | Help page |
| Intern Reports | `/admin/reports/intern-reports` | `canViewInternReports` | Review all intern weekly reports |
| People | `/admin/people/*` | `canViewAllEmployees` | Employees, departments, managers, offers, etc. |
| Performance | `/admin/performance/*` | `canViewPerformance` | Cycles, objectives, reviews, conversations, groups |
| Preferences | `/admin/preferences` | SUPER_ADMIN | Account preferences |
| Recruitment | `/admin/recruitment/*` | `canViewJobs` | Job postings + applicants + ATS settings |
| Rent Documents | `/admin/rent-documents` | `canViewRentDocuments` | Employee rent agreements |
| Reports | `/admin/reports` | `canViewReports` | Generate XLSX/PDF reports |
| Requests | `/admin/requests/*` | `canViewAllLeave` | Leave + documents request queues |
| Settings | `/admin/settings/*` | `canManageSettings` | Admins, departments, leave types, holidays, workflows, customization |
| Surveys | `/admin/surveys` | `canManageSurveys` | Survey templates + responses |
| Time Tracking | `/admin/time-tracking/absence` | `canViewAbsences` | Absence batches |
| Trash | `/admin/trash` | `canViewAuditLog` | Restore deleted items |

### `/project-lead` (PROJECT_LEAD)

| Page | URL | Purpose |
|---|---|---|
| Dashboard | `/project-lead` | Team-at-a-glance |
| My Team | `/project-lead/team` | Direct reports roster |
| People | `/project-lead/people` | Org directory (read-only) |
| Intern Reports | `/project-lead/intern-reports` | Review your team's intern weekly reports |
| Requests | `/project-lead/requests/leave` | Approve/reject your team's leave |
| Performance | `/project-lead/performance/*` | Your own KPIs + score team KPIs + conversations + feedback |
| Documents | `/project-lead/documents` | Read assigned org documents |
| Surveys | `/project-lead/surveys` | Respond to surveys |
| Assets | `/project-lead/assets` | Your assigned assets |
| Disciplinary | `/project-lead/disciplinary` | Your team's disciplinary records |
| Self Service | `/project-lead/self-service/*` | Profile, edit, change password |

### `/staff` (STAFF, including interns)

| Page | URL | Purpose |
|---|---|---|
| Dashboard | `/staff` | Profile completeness, leave balance, KPIs, announcements |
| People | `/staff/people` | Public directory (no salary) |
| Performance | `/staff/performance/*` | Submit KPIs, view reviews, conversations, feedback |
| Requests | `/staff/requests` | Leave overview |
| Apply for Leave | `/staff/requests/leave/apply` | Submit leave request |
| Documents | `/staff/documents` | Read + acknowledge org documents |
| Benefits | `/staff/benefits` | Your enrolled benefits |
| Surveys | `/staff/surveys` | Respond to active surveys |
| Assets | `/staff/assets` | Your assigned assets |
| Disciplinary | `/staff/disciplinary` | Your disciplinary records (if any) |
| Intern Report | `/staff/intern-report` | **INTERN ONLY** — submit weekly report |
| Intern Reviews | `/staff/intern-reviews` | **NON-INTERN STAFF ONLY** — review intern reports you're assigned to |
| FAQ | `/staff/faq` | Help page |
| Self Service | `/staff/self-service/*` | Profile, edit, change password |

Announcements aren't a separate `/staff/announcements` route — they're injected into the dashboard layout as popups, notification bars, or scroll tickers (`AnnouncementRenderer`). Per-user dismissals are stored in `localStorage["dsn_seen_announcements:<userId>"]` so two people on the same browser don't inherit each other's dismissals.

---

## 7. Permission reference

Permissions are keys (camelCase) that admin roles grant. Each page/action checks the relevant key. SUPER_ADMIN bypasses all checks.

### People
| Key | Gates |
|---|---|
| `canViewAllEmployees` | `/admin/people/employees`, `GET /api/employees` (admin view) |
| `canCreateEmployee` | "Add Employee" button, `POST /api/employees` |
| `canEditEmployee` | Edit employee fields |
| `canDeleteEmployee` | Delete employee, `DELETE /api/employees/[id]` |
| `canApproveEmployee` | Approve profile updates |
| `canViewOffers` | Job offers list |
| `canManageOffers` | Create/edit/delete offers |
| `canViewOrgChart` | `/admin/people/org-chart` |
| `canViewCustomGroups`, `canManageCustomGroups` | Custom groups |
| `canViewPersonalDetails` | Personal info on employee detail |
| `canManageProfileRequests` | Approve/reject profile updates |
| `canViewPersonalDocuments` | Personal docs admin review |
| `canManageDepartments` | Department CRUD |
| `canViewJobTitles`, `canManageJobTitles` | Job titles list |

### Hiring
| Key | Gates |
|---|---|
| `canViewJobs` | Job postings list |
| `canCreateJob`, `canEditJob`, `canDeleteJob`, `canPostJob`, `canApproveJob` | Job CRUD |
| `canViewApplicants` | Applicants pipeline |
| `canManageHiringSettings` | Recruitment settings |

### Leave
| Key | Gates |
|---|---|
| `canViewAllLeave` | All-org leave queue |
| `canCreateLeave`, `canEditLeave`, `canDeleteLeave` | Leave CRUD |
| `canApproveLeave` | Approve/reject leave |
| `canViewLeaveTypes`, `canManageLeaveTypes` | Leave types config |

### Intern Reports
| Key | Gates |
|---|---|
| `canViewInternReports` | `/admin/reports/intern-reports` page |
| `canReviewInternReports` | PL panel + `/project-lead/intern-reports` |
| `canFillAttendance` | Attendance rating modal |

### Performance
| Key | Gates |
|---|---|
| `canViewPerformance` | Performance pages |
| `canManagePerformancePeriods` | Cycle CRUD |
| `canManageObjectives`, `canManageGroups`, `canManageReviews` | KPI / Groups / Reviews CRUD |
| `canViewFeedback`, `canManageConversations` | Feedback + conversations |

### Other modules
- `canViewBenefits`, `canManageBenefits`
- `canViewAbsences`, `canCreateAbsence`, `canEditAbsence`, `canDeleteAbsence`, `canReviewAbsence`
- `canViewDisciplinary`, `canManageViolations`, `canManagePolicies`, `canManageViolationTypes`, `canManageTriggers`, `canViewSuspensions`, `canManageSuspensions`
- `canViewAnnouncements`, `canCreateAnnouncement`, `canEditAnnouncement`, `canDeleteAnnouncement`, `canManageAnnouncementGroups`
- `canViewAssets`, `canCreateAsset`, `canEditAsset`, `canDeleteAsset`, `canManageAssetAssignments`
- `canViewContractors`, `canManageContractors`
- `canViewRentDocuments`, `canManageRentDocuments`
- `canViewReports`, `canDownloadReports`, `canViewAnalytics`
- `canViewAuditLog`
- `canViewSurveys`, `canCreateSurvey`, `canEditSurvey`, `canDeleteSurvey`
- `canViewDocuments`, `canManageDocuments`, `canRecallDocuments`, `canDeleteDocuments`, `canMakeOffers`, `canManageOfferTemplates`
- `canManageHRSettings`, `canManageDepartmentSettings`, `canManageLeaveTypeSettings`, `canManageHolidaySettings`, `canManageApprovalWorkflows`, `canManageCustomization`
- `canManageAdmins`, `canCreateCustomRole`, `canEditCustomRole`, `canDeleteCustomRole`

---

## 8. Notifications & emails

### Notifications (in-app bell icon)

The bell icon (top right of every page) shows unread count. Click to open the dropdown. Notifications are polled every 30 seconds. When a new notification arrives while your tab is active, a **soft chime** plays (toggle in topbar via 🔊/🔇 icon — persists in your browser).

**Types**: INFO (blue), SUCCESS (green), WARNING (orange), DANGER (red).

**Triggered events** (28 total — comprehensive list):

| Event | Recipient |
|---|---|
| Leave request submitted | PL + HR admins |
| Leave approved (PL stage) | HR admins |
| Leave approved (final) | Employee + relief officers |
| Leave rejected | Employee |
| Leave approval reminder (nudge) | Pending approvers |
| Auto-nudge (overdue) | Pending approvers |
| Relief duty confirmed | Relief officer |
| Welcome back (from leave) | Returned employee + team |
| Intern report submitted | PL + extra reviewers |
| Intern report reviewer assigned | Extra reviewer |
| Intern report reviewed | Intern |
| Intern attendance ready | Admins with `canFillAttendance` |
| Personal doc uploaded | All SUPER_ADMINs |
| Personal doc approved/rejected | Employee |
| Profile update request | All HR admins |
| Profile update approved/rejected | Employee |
| Admin access granted/removed | User |
| Role changed | Employee |
| Password reset requested | All HR admins |

### Emails

Email events use templates from `src/lib/email-events.ts` (30+ events). Templates are editable via `/admin/settings/customization` (Email Configuration section). Each event can be toggled on/off globally.

**No mail unless explicitly enabled:** `EmailSettings.enabled` defaults to `false` in seed, so no real emails leave the system until an admin flips it on via `/admin/settings/customization`. The previous `EMAIL_FORCE_TO` test-override has been removed — emails now go to the real recipient when enabled.

---

## 9. Settings reference

All under `/admin/settings/*` — gated by `canManageSettings` (or specific sub-permissions).

| Page | URL | Purpose |
|---|---|---|
| Admins | `/admin/settings/admins` | Assign admin roles to users |
| Departments | `/admin/settings/departments` | Create + organize departments under divisions |
| Leave Types | `/admin/settings/leave-types` | Configure leave types: name, default days, gender, doc required |
| Public Holidays | `/admin/settings/public-holidays` | Nigerian public holidays for the year |
| Approval Workflows | `/admin/settings/approval-workflows` | Custom approval chains (HR section only — Payroll removed) |
| Customization | `/admin/settings/customization` | Branding (stub), Theme (stub), Email Configuration |
| Roles & Permissions | `/admin/settings/roles-permissions` | View + create custom admin roles |
| Intern Reports | `/admin/settings/intern-reports` | Intern report deadline + late hours config |

---

## 10. Mobile experience

The platform is fully responsive from **360px phones to 4K monitors**.

### Mobile layout (≤899px)
- Sidebar collapses to a hamburger button in the top bar
- Tap hamburger → sidebar slides in from left with full nav
- Tap outside or any nav item → sidebar closes
- All multi-column grids (`grid-2col`, `grid-3col`) collapse to single column
- Tables horizontally scroll if wider than viewport
- Modals shrink to fit viewport with 16px margin

### Specific tablet breakpoints
- ≤440px: modal step labels hide (icons only)
- ≤640px: `grid-4col` collapses to 2 columns
- ≤899px: sidebar collapses to drawer

### 4K screens (≥2400px)
Main content centre-caps at 1800px max-width to avoid uncomfortable stretching.

---

## 11. Troubleshooting & FAQ

**Q: I can't log in / login form shows error.**
- Confirm your email is registered (HR creates users)
- Confirm `RESEND_API_KEY` is configured if expecting invite emails
- Reset password via `/forgot-password`

**Q: I'm told to change my password but I forgot the old one.**
- Contact HR — they can reset your password from `/admin/people/employees/[id]` → Reset Password

**Q: I applied for leave but my PL hasn't been notified.**
- Confirm `RESEND_API_KEY` is valid and `EmailSettings.enabled` is `true`
- Confirm the employee record has `projectLeadId` populated
- HR admin: check `/admin/audit-log` for the leave event

**Q: The intern report isn't sending emails to the extra reviewers.**
- Confirm `intern_report_reviewer_assigned` event is enabled at `/admin/settings/customization` → Email Configuration
- Confirm RESEND_API_KEY is set
- Check audit log + dev server logs

**Q: I'm an admin but I can't see `/admin/reports/intern-reports`.**
- Your admin role must include `canViewInternReports`. Currently included in `secondary-admin` and `hr-admin`.
- SUPER_ADMIN bypasses all checks.

**Q: The notification sound is annoying.**
- Click the 🔊 icon next to the bell in the top bar to mute. Setting persists in your browser.

**Q: I see a 307 redirect in DevTools when hitting a URL I should access.**
- A 307 means a sub-page layout guard sent you back. Either:
  - You're not the right role for that URL (e.g. STAFF trying `/admin/*`)
  - Your role doesn't have the required permission
- See Section 7 for which permission unlocks which URL.

**Q: I uploaded a personal document but the admin says they can't see it.**
- Personal docs are reviewed by SUPER_ADMINs at `/admin/people/personal-docs` (filtered by employee). Ensure they look at the correct employee record.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **DSN** | Data Science Nigeria — the organisation operating this HRMS |
| **HRMS** | Human Resource Management System — this platform |
| **System role** | One of SUPER_ADMIN, PROJECT_LEAD, STAFF — set on the User record |
| **Admin role** | An elevated permission bundle (e.g. `hr-admin`, `it-admin`) assigned via UserAdminRole |
| **Elevated** | A non-SUPER_ADMIN user who has at least one admin role assigned |
| **Intern** | A STAFF user whose `jobTitle` contains "intern" — auto-flagged `isIntern: true` |
| **PL** | Project Lead — a team manager. Has `PROJECT_LEAD` role |
| **Relief officer** | A colleague who covers your responsibilities while you're on leave |
| **KPI** | Key Performance Indicator — an objective an employee submits during a performance cycle |
| **Cycle** | Performance Cycle — a time-boxed window (typically a half-year) for KPI submission + review |
| **Primary reviewer** | The PL whose `InternReportReviewer.isPrimary = true` for an intern weekly report |
| **Extra reviewer** | Additional colleagues an intern picks to review their weekly report (comment-only, no ratings) |
| **Attendance rating** | A 0-3 score given by admins (`canFillAttendance`) after all reviewers finish |
| **Acknowledgement** | An employee marking that they've read an assigned org document |
| **EmployeeInvite** | A 24-hour token created when HR adds a new employee. Backs the `/onboard/[token]` set-password screen. The row stays in the DB after use as a permanent marker of "this user came in via invite" — used to decide whether to show the Complete-your-profile reminder modal. |
| **Audit log** | Append-only system log of significant actions (employee changes, leave decisions, role changes, etc.) |
| **JWT** | JSON Web Token — the session token NextAuth issues on login, carrying role + permissions + isIntern + isElevated |
| **Server-auth guard** | A server component layout that runs before client code; redirects unauthorized users |
| **API auth helper** | `requireAuth()` + `requirePermission()` in `src/lib/api-auth.ts` enforcing access in API routes |

---

*This guide reflects the platform as of May 2026. Update alongside major feature releases.*
