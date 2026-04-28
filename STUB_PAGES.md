# Stub Pages — No Logic / No API

All pages below show "Coming soon" or are empty shells. Grouped by feature so one implementation covers all roles.

---

## ADMIN ONLY

### Company & Settings
| Page | Path | API Needed |
|------|------|-----------|
| Company Details | `admin/company-details` | GET/PATCH `/api/company` |
| Settings → Admins | `admin/settings/admins` | GET/POST `/api/settings/admins` |
| Settings → HR & Payroll | `admin/settings/hr-payroll` | GET/PATCH `/api/settings/hr-payroll` |
| Settings → Plan & Billing | `admin/settings/plan-billing` | External billing provider |
| Settings → Customization | `admin/settings/customization` | GET/PATCH `/api/settings/customization` |
| Settings → Approval Workflows | `admin/settings/approval-workflows` | GET/POST `/api/settings/workflows` |
| Settings → Single Sign-On | `admin/settings/single-sign-on` | SSO provider integration |
| Settings → Roles & Permissions | `admin/settings/roles-permissions` | GET/PATCH `/api/settings/roles` |

### People
| Page | Path | API Needed |
|------|------|-----------|
| Needs Attention | `admin/people/needs-attention` | GET `/api/employees?flag=attention` |
| Managers | `admin/people/managers` | GET `/api/employees?role=manager` |
| Custom Groups | `admin/people/custom-groups` | GET/POST/DELETE `/api/custom-groups` |
| Offers | `admin/people/offers` | GET/POST `/api/offers` |
| Exits | `admin/people/exits` | GET `/api/employees?status=exited` |
| External Admins | `admin/people/external-admins` | GET/POST `/api/external-admins` |
| Confirmation | `admin/people/confirmation` | GET `/api/employees?confirmation=pending` |
| Job Titles | `admin/people/job-titles` | GET/POST/DELETE `/api/job-titles` |

### Hiring / Recruitment
| Page | Path | API Needed |
|------|------|-----------|
| Jobs | `admin/recruitment/jobs` | GET/POST `/api/recruitment/jobs` |
| Applicants | `admin/recruitment/applicants` | GET `/api/recruitment/applicants` |
| Recruitment Settings | `admin/recruitment/settings` | GET/PATCH `/api/recruitment/settings` |

### Requests (Admin view)
| Page | Path | API Needed |
|------|------|-----------|
| Loans | `admin/requests/loans` | GET/PATCH `/api/requests/loans` |
| Salary Advances | `admin/requests/salary-advances` | GET/PATCH `/api/requests/salary-advances` |
| Exits | `admin/requests/exits` | GET/PATCH `/api/requests/exits` |
| Redeployments | `admin/requests/redeployments` | GET/PATCH `/api/requests/redeployments` |
| Documents | `admin/requests/documents` | GET/PATCH `/api/requests/documents` |

### Payroll
| Page | Path | API Needed |
|------|------|-----------|
| Overview | `admin/payroll/overview` | GET `/api/payroll/summary` |
| Changes | `admin/payroll/changes` | GET `/api/payroll/changes` |
| Records | `admin/payroll/records` | GET `/api/payroll/records` |
| Skip Employees | `admin/payroll/skip-employees` | GET/POST `/api/payroll/skip` |
| History | `admin/payroll/history` | GET `/api/payroll/history` |
| Configuration | `admin/payroll/configuration` | GET/PATCH `/api/payroll/config` |

### Pay Schedules
| Page | Path | API Needed |
|------|------|-----------|
| Regular | `admin/pay-schedules/regular` | GET/PATCH `/api/pay-schedules/regular` |
| Custom | `admin/pay-schedules/custom` | GET/POST `/api/pay-schedules/custom` |
| Reversals | `admin/pay-schedules/reversals` | GET/POST `/api/pay-schedules/reversals` |

### Wallets (Admin)
| Page | Path | API Needed |
|------|------|-----------|
| Overview | `admin/wallets/overview` | GET `/api/wallets/summary` |
| Transfers | `admin/wallets/transfers` | GET/POST `/api/wallets/transfers` |
| Transactions | `admin/wallets/transactions` | GET `/api/wallets/transactions` |
| Integration | `admin/wallets/integration` | Third-party wallet provider |

### Earned Wage Access (Admin)
| Page | Path | API Needed |
|------|------|-----------|
| Analytics | `admin/earned-wage-access/analytics` | GET `/api/ewa/analytics` |
| Employees | `admin/earned-wage-access/employees` | GET `/api/ewa/employees` |
| Withdrawals | `admin/earned-wage-access/withdrawals` | GET `/api/ewa/withdrawals` |
| Payment | `admin/earned-wage-access/payment` | GET/POST `/api/ewa/payment` |
| Policy Management | `admin/earned-wage-access/policy-management` | GET/PATCH `/api/ewa/policy` |

### Performance (Admin sub-pages)
| Page | Path | API Needed |
|------|------|-----------|
| Setup | `admin/performance/setup` | GET/PATCH `/api/performance/setup` |
| Period | `admin/performance/period` | GET/POST `/api/performance/periods` |
| Groups | `admin/performance/groups` | GET/POST `/api/performance/groups` |
| Ratings | `admin/performance/ratings` | GET/PATCH `/api/performance/ratings` |

### Disciplinary (Admin)
| Page | Path | API Needed |
|------|------|-----------|
| Suspensions | `admin/disciplinary/suspensions` | GET/POST `/api/disciplinary/suspensions` |
| Violations | `admin/disciplinary/violations` | GET/POST `/api/disciplinary/violations` |
| Policies | `admin/disciplinary/policies` | GET/POST `/api/disciplinary/policies` |
| Triggers | `admin/disciplinary/triggers` | GET/POST `/api/disciplinary/triggers` |
| Violation Types | `admin/disciplinary/violation-types` | GET/POST `/api/disciplinary/violation-types` |

### Other Admin
| Page | Path | API Needed |
|------|------|-----------|
| Benefits | `admin/benefits` | GET/POST `/api/benefits` |
| Contractors | `admin/contractors` | GET/POST `/api/contractors` |
| Surveys | `admin/surveys` | GET/POST `/api/surveys` |
| Tasks | `admin/tasks` | GET/POST `/api/tasks` |
| Time Tracking → Absence | `admin/time-tracking/absence` | GET `/api/time-tracking/absence` |
| Assets → Overview | `admin/assets/overview` | GET `/api/assets` |
| Assets → Assignments | `admin/assets/assignments` | GET/POST `/api/assets/assignments` |
| Reports → Payroll Reports | `admin/reports/payroll-reports` | GET `/api/reports/payroll` |
| Reports → Employee Reports | `admin/reports/employee-reports` | GET `/api/reports/employees` |
| Reports → Custom Reports | `admin/reports/custom-reports` | GET/POST `/api/reports/custom` |
| Announcements → Groups | `admin/announcements/groups` | GET/POST `/api/announcements/groups` |
| Audit Log | `admin/audit-log` | GET `/api/audit-log` |
| Rent Documents | `admin/rent-documents` | GET/POST `/api/rent-documents` |
| Calendar | `admin/calendar` | GET `/api/calendar/events` |

---

## ALL ROLES (same feature, each role has its own page)

### Performance sub-pages
These 4 pages exist for admin, team-lead, and staff. All are stubs.

| Page | Admin | Team Lead | Staff | API Needed |
|------|-------|-----------|-------|-----------|
| Objectives | ✗ | ✗ | ✗ | GET/POST `/api/performance/objectives` |
| Reviews | ✗ | ✗ | ✗ | GET `/api/performance/reviews` |
| Conversations | ✗ | ✗ | ✗ | GET/POST `/api/performance/conversations` |
| Feedback | ✗ | ✗ | ✗ | GET/POST `/api/performance/feedback` |

### Tasks
| Role | Path | API Needed |
|------|------|-----------|
| Admin | `admin/tasks` | GET/POST `/api/tasks` |
| Team Lead | `team-lead/tasks` | GET/POST `/api/tasks` |
| Staff | `staff/tasks` | GET/POST `/api/tasks` |

### Calendar
| Role | Path | API Needed |
|------|------|-----------|
| Admin | `admin/calendar` | GET `/api/calendar/events` |
| Team Lead | `team-lead/calendar` | GET `/api/calendar/events` |
| Staff | `staff/calendar` | GET `/api/calendar/events` |

### Announcements → Groups
| Role | Path | API Needed |
|------|------|-----------|
| Admin | `admin/announcements/groups` | GET/POST `/api/announcements/groups` |
| Team Lead | `team-lead/announcements/groups` | GET/POST `/api/announcements/groups` |
| Staff | `staff/announcements/groups` | GET/POST `/api/announcements/groups` |

### Self Service — Exit, Grievance, Requisitions
These show "Coming soon" for all roles.

| Page | API Needed |
|------|-----------|
| Exit | POST `/api/self-service/exit` — initiate resignation, offboarding checklist |
| Grievance | GET/POST `/api/self-service/grievances` — submit & track complaints |
| Requisitions | GET/POST `/api/self-service/requisitions` — asset/staffing requests |

---

## TEAM LEAD + STAFF (shared feature, separate pages)

### People
| Page | Team Lead | Staff | API Needed |
|------|-----------|-------|-----------|
| People → Exits | ✗ | — | GET `/api/employees?status=exited&team=mine` |
| People → Confirmation | ✗ | — | GET `/api/employees?confirmation=pending&team=mine` |

### New Personal Pages
| Page | Team Lead | Staff | API Needed |
|------|-----------|-------|-----------|
| Job & Pay | ✗ | ✗ | GET `/api/self-service/job-pay` — salary, grade, pay history |
| Benefits | ✗ | ✗ | GET `/api/self-service/benefits` — enrolled benefits, coverage |
| Wallet → Overview | ✗ | ✗ | GET `/api/wallet/summary` — balance, EWA limit |
| Wallet → Transactions | ✗ | ✗ | GET `/api/wallet/transactions` |
| Wallet → Transfers | ✗ | ✗ | POST `/api/wallet/transfer` |
| Wallet → Earned Wage Access | ✗ | ✗ | GET/POST `/api/wallet/ewa` |
| Assets | ✗ | ✗ | GET `/api/self-service/assets` — list of assigned assets |
| Disciplinary | ✗ | ✗ | GET `/api/self-service/disciplinary` — own warnings/violations |

### Other
| Page | Team Lead | Staff | API Needed |
|------|-----------|-------|-----------|
| Time Tracking → Absence | ✗ | — | GET `/api/time-tracking/absence` |
| Surveys | — | ✗ | GET `/api/surveys` |

---

## SUMMARY COUNT

| Role | Stub pages |
|------|-----------|
| Admin | 69 |
| Team Lead | 21 |
| Staff | 19 |
| **Total** | **109** |

Features with zero API today (need DB schema + endpoints built from scratch):
- Job & Pay, Benefits, Wallet, Assets (staff/TL view), Disciplinary (staff/TL view), Grievance, Exit, Requisitions, Tasks, Calendar, Audit Log, Rent Documents, Contractors, Pay Schedules, Earned Wage Access

---

## PAGES WITH HARDCODED / PLACEHOLDER DATA

These pages are reachable and look functional but show fake data instead of real database values.

### 1. LeavePage — Ratings Tab
**File:** `src/components/pages/LeavePage.tsx`
**Affects:** `admin/requests/leave`, `team-lead/requests/leave`, `staff/requests/leave`

The "Ratings" tab inside the Leave page uses a hardcoded `PLACEHOLDER_RATINGS` object with fake rating entries. The component even says: *"Placeholder data shown."*

What's fake:
- Relief officer ratings given and received
- Rating scores, names, dates
- Summary stats (average rating, assignment count)

What's needed:
- DB table for leave ratings (rater, ratee, leaveRequestId, score, comment, createdAt)
- `POST /api/leave/ratings` — submit a rating
- `GET /api/leave/ratings` — fetch ratings for the current user
- Ratings should auto-trigger 24h after leave starts (relief rates applicant) and 24h after return (applicant rates relief officer)

---

### 2. PayrollPage — Entire Component
**File:** `src/components/pages/PayrollPage.tsx`
**Affects:** `admin/payroll` (NOTE: this component is not currently linked in the admin sidebar nav — it is unused)

The entire component is hardcoded — no fetch calls at all.

What's fake:
- 5 hardcoded employee rows (Amaka Okonkwo, Emeka Nwachukwu, etc.) with fixed salaries
- Summary totals: "Total Gross: ₦52.8M", "Total Deductions: ₦7.6M", "Total Net: ₦45.2M"
- Fixed month: "March 2026"

What's needed:
- Connect to existing `/api/payslips` (already built) or create `/api/payroll/overview`
- The real payslip data already exists in the DB — this component just never fetches it

---

### 3. ReportsPage — Report History Section
**File:** `src/components/pages/ReportsPage.tsx`
**Affects:** `admin/reports`

The "Recent Report History" section at the bottom uses a `MOCK_HISTORY` array of 5 fake entries.

What's fake:
- Report names, who generated them, dates, file sizes
- The download buttons do nothing

What's real:
- The report categories and form fields fetch real employee/department data
- Generating a report itself triggers real API calls

What's needed:
- DB table for generated reports (name, generatedBy, format, fileUrl, createdAt)
- `GET /api/reports/history` — fetch past generated reports
- Store and return actual download URLs after generation

---

### 4. FaqPage — Entire Content + Security Issue
**File:** `src/components/pages/FaqPage.tsx`
**Affects:** `admin/faq`, `team-lead/faq`, `staff/faq`

All 11 FAQ entries are hardcoded in the component file.

What's fake:
- All FAQ questions and answers are static strings in code

**Security issue:**
- Line 17 hardcodes the default account password: `"Welcome@DSN1"` — visible in source code

What's needed:
- DB table for FAQs (question, answer, category, order, isActive)
- `GET /api/faq` — fetch active FAQs
- Admin CRUD interface to add/edit/delete FAQs (could live at `admin/faq`)
- Remove hardcoded password from code entirely
