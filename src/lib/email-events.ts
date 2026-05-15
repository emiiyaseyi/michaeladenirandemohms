export interface EmailEventDef {
  name: string
  category: "Leave" | "People" | "Documents" | "Admin"
  description: string
  variables: string[]
  defaultSubject: string
  defaultBody: string
}

const LOGO =
  `<div style="text-align:center;padding:4px 0 20px;"><img src="https://hrms.dsnsandbox.com/dsn-logo.svg" alt="DSN" width="150" style="max-width:150px;height:auto;" /></div>`

const ROW = (label: string, val: string) =>
  `<tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;width:130px;">${label}</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${val}</td></tr>`

const TABLE = (...rows: string[]) =>
  `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:20px;">${rows.join("")}</table>`

const H = (t: string) =>
  `<h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">${t}</h2>`

const P = (t: string) =>
  `<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">${t}</p>`

const NOTE = (t = "Log in to your HRMS portal to view the full details.") =>
  `<p style="font-size:13px;color:#9ca3af;margin:0;">${t}</p>`

export const EMAIL_EVENTS: Record<string, EmailEventDef> = {

  // ── Leave ──────────────────────────────────────────────────────────────────

  leave_submitted_pl: {
    name: "Leave Submitted — PL Approval Needed",
    category: "Leave",
    description: "Sent to the assigned project lead(s) when an employee submits a leave request.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "days", "reason"],
    defaultSubject: "Action Required: {{employeeName}} submitted a {{leaveType}} request",
    defaultBody:
      LOGO +
      H("Leave Approval Needed") +
      P("<strong>{{employeeName}}</strong> has submitted a <strong>{{leaveType}}</strong> leave request that requires your approval.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Duration", "{{days}} day(s)"),
        ROW("Reason", "{{reason}}"),
      ) +
      NOTE("Log in to your HRMS portal to approve or reject this request."),
  },

  leave_submitted_hr: {
    name: "Leave Submitted — HR Notified",
    category: "Leave",
    description: "Sent to HR admins when a new leave request is submitted (informational, pending PL approval).",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "days"],
    defaultSubject: "New Leave Request: {{employeeName}} — {{leaveType}}",
    defaultBody:
      LOGO +
      H("New Leave Request Submitted") +
      P("<strong>{{employeeName}}</strong> submitted a <strong>{{leaveType}}</strong> leave request. It is pending Project Lead approval before reaching you.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Duration", "{{days}} day(s)"),
      ) +
      NOTE(),
  },

  leave_progressing: {
    name: "Leave Progressing — PL Approved",
    category: "Leave",
    description: "Sent to the employee when their project lead approves, moving the request to HR.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "days"],
    defaultSubject: "Your {{leaveType}} request is progressing to HR",
    defaultBody:
      LOGO +
      H("Leave Request Update") +
      P("Good news! Your <strong>{{leaveType}}</strong> leave request has been approved by your Project Lead and is now with HR Admin for final review.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Duration", "{{days}} day(s)"),
      ) +
      NOTE("You will receive another notification once HR has made a final decision."),
  },

  leave_approved: {
    name: "Leave Fully Approved",
    category: "Leave",
    description: "Sent to the employee when their leave is fully approved by HR.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "days", "reliefOfficers", "note"],
    defaultSubject: "Your {{leaveType}} leave has been approved",
    defaultBody:
      LOGO +
      H("Leave Request Approved") +
      P("Your <strong>{{leaveType}}</strong> leave request has been fully approved.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Duration", "{{days}} day(s)"),
        ROW("Relief Officer(s)", "{{reliefOfficers}}"),
      ) +
      P("{{note}}") +
      NOTE("Enjoy your time off!"),
  },

  leave_rejected: {
    name: "Leave Rejected",
    category: "Leave",
    description: "Sent to the employee when their leave request is rejected.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "rejectedBy", "reason"],
    defaultSubject: "Your {{leaveType}} request was not approved",
    defaultBody:
      LOGO +
      H("Leave Request Not Approved") +
      P("Unfortunately, your <strong>{{leaveType}}</strong> leave request ({{startDate}} – {{endDate}}) was rejected by <strong>{{rejectedBy}}</strong>.") +
      P("Reason: <em>{{reason}}</em>") +
      NOTE("Please contact HR if you have questions."),
  },

  leave_nudge_pl: {
    name: "Leave Approval Reminder — Project Lead",
    category: "Leave",
    description: "Sent to a project lead reminding them of a pending leave approval.",
    variables: ["requesterName", "leaveType"],
    defaultSubject: "Reminder: {{requesterName}}'s {{leaveType}} request is awaiting your approval",
    defaultBody:
      LOGO +
      H("Pending Leave Approval") +
      P("This is a reminder that <strong>{{requesterName}}</strong>'s <strong>{{leaveType}}</strong> leave request is still waiting for your approval.") +
      NOTE("Log in to your HRMS portal to take action."),
  },

  leave_nudge_hr: {
    name: "Leave Approval Reminder — HR",
    category: "Leave",
    description: "Sent to HR admins reminding them of a pending final leave approval.",
    variables: ["requesterName", "leaveType"],
    defaultSubject: "Reminder: {{requesterName}}'s {{leaveType}} request awaits final approval",
    defaultBody:
      LOGO +
      H("Pending Final Approval") +
      P("<strong>{{requesterName}}</strong>'s <strong>{{leaveType}}</strong> leave request has been approved by all Project Leads and is awaiting your final decision.") +
      NOTE("Log in to the admin panel to approve or reject."),
  },

  leave_auto_nudge: {
    name: "Leave Approval Overdue — Auto Nudge",
    category: "Leave",
    description: "Automatically sent to an approver when their approval deadline has passed.",
    variables: ["requesterName", "leaveType"],
    defaultSubject: "Overdue: {{requesterName}}'s {{leaveType}} approval needs your attention",
    defaultBody:
      LOGO +
      H("Leave Approval Overdue") +
      P("Your approval for <strong>{{requesterName}}</strong>'s <strong>{{leaveType}}</strong> leave request is overdue. Please review and take action as soon as possible.") +
      NOTE("Log in to your HRMS portal to take action."),
  },

  relief_assigned: {
    name: "Relief Duty Confirmed",
    category: "Leave",
    description: "Sent to a relief officer after the leave is fully approved confirming their duty.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "tasks"],
    defaultSubject: "You're confirmed as relief for {{employeeName}}'s {{leaveType}}",
    defaultBody:
      LOGO +
      H("Relief Duty Confirmed") +
      P("You have been confirmed as a relief officer for <strong>{{employeeName}}</strong>'s <strong>{{leaveType}}</strong> leave.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Tasks", "{{tasks}}"),
      ) +
      NOTE("Log in to your HRMS portal to view your handover notes."),
  },

  relief_accepted: {
    name: "Relief Officer Accepted",
    category: "Leave",
    description: "Sent to the leave requester when their relief officer accepts.",
    variables: ["reliefName", "leaveType", "startDate", "endDate"],
    defaultSubject: "Your relief officer accepted for {{leaveType}}",
    defaultBody:
      LOGO +
      H("Relief Officer Accepted") +
      P("<strong>{{reliefName}}</strong> has accepted the relief officer role for your <strong>{{leaveType}}</strong> leave ({{startDate}} – {{endDate}}).") +
      NOTE(),
  },

  relief_all_accepted: {
    name: "All Relief Officers Accepted",
    category: "Leave",
    description: "Sent to the approver (PL/HR) when all relief officers have accepted — request is ready to review.",
    variables: ["employeeName", "leaveType"],
    defaultSubject: "Ready for review: {{employeeName}}'s {{leaveType}} leave",
    defaultBody:
      LOGO +
      H("Leave Request Ready for Your Review") +
      P("All relief officers for <strong>{{employeeName}}</strong>'s <strong>{{leaveType}}</strong> leave request have accepted. The request is now ready for your approval.") +
      NOTE("Log in to the HRMS portal to take action."),
  },

  welcome_back: {
    name: "Welcome Back from Leave",
    category: "Leave",
    description: "Sent to the employee on the day they return from approved leave.",
    variables: ["employeeName", "leaveType"],
    defaultSubject: "Welcome back, {{employeeName}}!",
    defaultBody:
      LOGO +
      H("Welcome Back!") +
      P("Hi <strong>{{employeeName}}</strong>, welcome back from your <strong>{{leaveType}}</strong>! We hope you had a great break.") +
      NOTE("Log in to your portal to catch up."),
  },

  employee_back_hr: {
    name: "Employee Returned from Leave — HR Notified",
    category: "Leave",
    description: "Sent to HR and managers when an employee returns from approved leave.",
    variables: ["employeeName", "leaveType", "returnDate"],
    defaultSubject: "{{employeeName}} has returned from {{leaveType}}",
    defaultBody:
      LOGO +
      H("Employee Returned from Leave") +
      P("<strong>{{employeeName}}</strong> has returned from their <strong>{{leaveType}}</strong> leave today ({{returnDate}}).") +
      NOTE(),
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  personal_doc_uploaded: {
    name: "Personal Document Uploaded — HR Notified",
    category: "Documents",
    description: "Sent to HR when an employee uploads a personal document for review.",
    variables: ["employeeName", "documentType"],
    defaultSubject: "{{employeeName}} uploaded a {{documentType}} for review",
    defaultBody:
      LOGO +
      H("Document Awaiting Review") +
      P("<strong>{{employeeName}}</strong> has uploaded a <strong>{{documentType}}</strong> for review.") +
      NOTE("Log in to the admin panel to review and approve or reject."),
  },

  personal_doc_approved: {
    name: "Personal Document Approved",
    category: "Documents",
    description: "Sent to an employee when their personal document is approved.",
    variables: ["employeeName", "documentType", "note"],
    defaultSubject: "Your {{documentType}} has been approved",
    defaultBody:
      LOGO +
      H("Document Approved") +
      P("Your <strong>{{documentType}}</strong> has been reviewed and approved.") +
      P("{{note}}") +
      NOTE(),
  },

  personal_doc_rejected: {
    name: "Personal Document Rejected",
    category: "Documents",
    description: "Sent to an employee when their personal document is rejected.",
    variables: ["employeeName", "documentType", "note"],
    defaultSubject: "Your {{documentType}} requires attention",
    defaultBody:
      LOGO +
      H("Document Not Approved") +
      P("Your <strong>{{documentType}}</strong> was reviewed and could not be approved.") +
      P("Note: <em>{{note}}</em>") +
      NOTE("Please re-upload a corrected document if needed."),
  },

  // ── People / Profile ──────────────────────────────────────────────────────

  role_changed: {
    name: "Account Role Changed",
    category: "People",
    description: "Sent to an employee when their system role is changed (Staff ↔ Project Lead).",
    variables: ["employeeName", "previousRole", "newRole"],
    defaultSubject: "Your account role has been updated",
    defaultBody:
      LOGO +
      H("Role Update") +
      P("Your account role has been updated from <strong>{{previousRole}}</strong> to <strong>{{newRole}}</strong>.") +
      P("Please sign out and back in for the change to take full effect.") +
      NOTE(),
  },

  profile_update_request: {
    name: "Profile Update Request — HR Notified",
    category: "People",
    description: "Sent to HR admins when an employee submits a profile update request.",
    variables: ["employeeName"],
    defaultSubject: "Profile update request from {{employeeName}}",
    defaultBody:
      LOGO +
      H("Profile Update Request") +
      P("<strong>{{employeeName}}</strong> has submitted a profile update request for review.") +
      NOTE("Log in to the admin panel to review."),
  },

  profile_update_approved: {
    name: "Profile Update Approved",
    category: "People",
    description: "Sent to an employee when their profile update request is approved.",
    variables: ["employeeName"],
    defaultSubject: "Your profile update has been approved",
    defaultBody:
      LOGO +
      H("Profile Update Approved") +
      P("Your profile update request has been reviewed and approved. Your profile has been updated.") +
      NOTE(),
  },

  profile_update_rejected: {
    name: "Profile Update Not Approved",
    category: "People",
    description: "Sent to an employee when their profile update request is rejected.",
    variables: ["employeeName", "reason"],
    defaultSubject: "Your profile update request was not approved",
    defaultBody:
      LOGO +
      H("Profile Update Not Approved") +
      P("Your profile update request was reviewed and could not be approved.") +
      P("Reason: <em>{{reason}}</em>") +
      NOTE("Contact HR if you have questions."),
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  admin_access_granted: {
    name: "Admin Access Granted",
    category: "Admin",
    description: "Sent to a user when they are granted admin access.",
    variables: ["employeeName"],
    defaultSubject: "You have been granted admin access",
    defaultBody:
      LOGO +
      H("Admin Access Granted") +
      P("You have been granted admin access to the HRMS. Use the panel switcher in the top menu to access the admin panel.") +
      NOTE(),
  },

  admin_roles_updated: {
    name: "Admin Roles Updated",
    category: "Admin",
    description: "Sent to a user when their admin role assignments are changed.",
    variables: ["employeeName"],
    defaultSubject: "Your admin role assignments have been updated",
    defaultBody:
      LOGO +
      H("Admin Roles Updated") +
      P("Your admin role assignments have been updated. You may have gained or lost access to certain features. Please sign in again to see your updated permissions.") +
      NOTE(),
  },

  admin_access_removed: {
    name: "Admin Access Removed",
    category: "Admin",
    description: "Sent to a user when their admin access is removed.",
    variables: ["employeeName"],
    defaultSubject: "Your admin access has been removed",
    defaultBody:
      LOGO +
      H("Admin Access Removed") +
      P("Your admin access has been removed. You have been returned to a standard staff account.") +
      NOTE("Contact HR if you believe this is an error."),
  },

  // ── People / Onboarding ───────────────────────────────────────────────────

  employee_invite: {
    name: "Employee Onboarding Invitation",
    category: "People",
    description: "Sent to new employees with their personal invitation link to complete their profile.",
    variables: ["employeeName", "inviteLink"],
    defaultSubject: "You're invited — complete your profile at DSN HRMS",
    defaultBody:
      LOGO +
      `<h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 6px;text-align:center;letter-spacing:-0.4px;">Welcome to the team!</h1>` +
      `<p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 28px;">Hi <strong style="color:#111827;">{{employeeName}}</strong> — your account is ready. Let's get you set up.</p>` +
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 22px;margin-bottom:24px;">` +
      `<p style="font-size:13px;font-weight:700;color:#166534;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">What you need to do</p>` +
      `<ol style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:2;">` +
      `<li>Click the button below to open your personal onboarding page</li>` +
      `<li>Fill in your personal details, home address and banking information</li>` +
      `<li>Submit — HR will be notified once you're done</li>` +
      `</ol></div>` +
      `<div style="text-align:center;margin:28px 0 20px;"><a href="{{inviteLink}}" style="display:inline-block;padding:14px 44px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">Complete My Profile →</a></div>` +
      `<p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 4px;">Or paste this link in your browser:</p>` +
      `<p style="font-size:12px;word-break:break-all;text-align:center;margin:0 0 24px;"><a href="{{inviteLink}}" style="color:#16a34a;">{{inviteLink}}</a></p>` +
      `<div style="border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;"><p style="font-size:12px;color:#9ca3af;margin:0;">⏱ This link expires <strong style="color:#374151;">24 hours</strong> after you first open it. &nbsp;|&nbsp; If you did not expect this, please ignore it.</p></div>`,
  },

  // ── Birthdays ──────────────────────────────────────────────────────────────

  birthday_digest: {
    name: "Birthday Digest — HR Daily",
    category: "People",
    description: "Sent to HR admins each morning with a list of employee birthdays today.",
    variables: ["count", "names", "today"],
    defaultSubject: "🎂 {{count}} birthday(s) today — {{today}}",
    defaultBody:
      LOGO +
      H("Birthday Digest") +
      P("The following employee(s) have a birthday today (<strong>{{today}}</strong>):") +
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:14px;color:#166534;font-weight:600;">{{names}}</div>` +
      NOTE("Consider reaching out or sending a message!"),
  },

  birthday_employee: {
    name: "Birthday Greeting — Employee",
    category: "People",
    description: "Sent to an employee on their birthday.",
    variables: ["employeeName"],
    defaultSubject: "Happy Birthday, {{employeeName}}! 🎉",
    defaultBody:
      LOGO +
      H("Happy Birthday! 🎂") +
      P("Wishing you a wonderful birthday, <strong>{{employeeName}}</strong>! Thank you for everything you bring to the team. Have a fantastic day!") +
      P("From everyone at DSN.") +
      NOTE(),
  },

  // ── Intern Reports ──────────────────────────────────────────────────────────
  intern_report_submitted: {
    name: "Intern Report Submitted",
    description: "Sent to the Project Lead (and CC'd extra reviewers) when an intern submits their weekly report.",
    category: "People",
    variables: ["internName", "weekEnd", "totalHours", "lateFlag", "reviewLink"],
    defaultSubject: "Weekly Report Submitted: {{internName}} ({{weekEnd}})",
    defaultBody:
      LOGO +
      H("Intern Weekly Report Submitted") +
      P("<strong>{{internName}}</strong> has submitted their weekly report for the week ending <strong>{{weekEnd}}</strong>.") +
      TABLE(
        ROW("Total Hours", "{{totalHours}}"),
        ROW("Late Submission", "{{lateFlag}}"),
      ) +
      P("Please log in to review the report and provide your feedback.") +
      `<div style="text-align:center;margin:24px 0;"><a href="{{reviewLink}}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Review Report</a></div>` +
      NOTE("An Excel copy of the report is attached to this email."),
  },

  intern_report_reviewer_assigned: {
    name: "Intern Report — Reviewer Assigned",
    description: "Sent to extra reviewers when an intern includes them on their weekly report submission.",
    category: "People",
    variables: ["internName", "weekEnd", "totalHours", "lateFlag", "reviewLink"],
    defaultSubject: "You've been asked to review {{internName}}'s weekly report",
    defaultBody:
      LOGO +
      H("Intern Report Review Request") +
      P("<strong>{{internName}}</strong> has asked you to review their weekly report for the week ending <strong>{{weekEnd}}</strong>.") +
      TABLE(
        ROW("Total Hours", "{{totalHours}}"),
        ROW("Late Submission", "{{lateFlag}}"),
      ) +
      P("Please log in and provide your comments on this report.") +
      `<div style="text-align:center;margin:24px 0;"><a href="{{reviewLink}}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Review Report</a></div>` +
      NOTE("An Excel copy of the report is attached to this email."),
  },

  intern_report_reviewed: {
    name: "Weekly Report — All Reviews Complete",
    description: "Sent to an intern when all reviewers have completed feedback on their weekly report.",
    category: "People",
    variables: ["internName", "weekEnd", "totalScore"],
    defaultSubject: "Your Weekly Report Has Been Reviewed — {{weekEnd}}",
    defaultBody:
      LOGO +
      H("Your Report Has Been Reviewed") +
      P("Hi <strong>{{internName}}</strong>,") +
      P("Your weekly report for the week ending <strong>{{weekEnd}}</strong> has been reviewed by all assigned reviewers.") +
      P("Your current TL score is <strong>{{totalScore}} / 9</strong>.") +
      P("Log in to your dashboard to view the full feedback.") +
      NOTE(),
  },
}

export const EVENT_CATEGORIES = ["Leave", "Documents", "People", "Admin"] as const
