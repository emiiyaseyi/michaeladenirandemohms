export interface EmailEventDef {
  name: string
  category: "Leave" | "People" | "Documents" | "Admin"
  description: string
  variables: string[]
  defaultSubject: string
  defaultBody: string
}


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

      H("New Leave Request Submitted") +
      P("<strong>{{employeeName}}</strong> submitted a <strong>{{leaveType}}</strong> leave request. It is pending Project Lead approval before reaching you.") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
        ROW("Duration", "{{days}} day(s)"),
      ) +
      NOTE(),
  },

  leave_approved: {
    name: "Leave Fully Approved",
    category: "Leave",
    description: "Sent to the employee when their leave is fully approved by HR.",
    variables: ["employeeName", "leaveType", "startDate", "endDate", "days", "reliefOfficers", "note"],
    defaultSubject: "Your {{leaveType}} leave has been approved",
    defaultBody:

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

      H("Leave Approval Overdue") +
      P("Your approval for <strong>{{requesterName}}</strong>'s <strong>{{leaveType}}</strong> leave request is overdue. Please review and take action as soon as possible.") +
      NOTE("Log in to your HRMS portal to take action."),
  },

  leave_edited_by_other: {
    name: "Your Leave Request Was Edited",
    category: "Leave",
    description: "Sent to the requester when an admin or approving PL edits their pending leave request.",
    variables: ["employeeName", "editorName", "changes", "leaveType", "startDate", "endDate"],
    defaultSubject: "Your {{leaveType}} request was edited by {{editorName}}",
    defaultBody:

      H("Your Leave Request Was Edited") +
      P("Hi <strong>{{employeeName}}</strong>, <strong>{{editorName}}</strong> updated your {{leaveType}} request.") +
      P("Changes: {{changes}}") +
      TABLE(
        ROW("Period", "{{startDate}} – {{endDate}}"),
      ) +
      NOTE("Log in to your HRMS portal to review the changes."),
  },

  welcome_back: {
    name: "Welcome Back from Leave",
    category: "Leave",
    description: "Sent to the employee on the day they return from approved leave.",
    variables: ["employeeName", "leaveType"],
    defaultSubject: "Welcome back, {{employeeName}}!",
    defaultBody:

      H("Welcome Back!") +
      P("Hi <strong>{{employeeName}}</strong>, welcome back from your <strong>{{leaveType}}</strong>! We hope you had a great break.") +
      NOTE("Log in to your portal to catch up."),
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  personal_doc_approved: {
    name: "Personal Document Approved",
    category: "Documents",
    description: "Sent to an employee when their personal document is approved.",
    variables: ["employeeName", "documentType", "note"],
    defaultSubject: "Your {{documentType}} has been approved",
    defaultBody:

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

      H("Role Update") +
      P("Your account role has been updated from <strong>{{previousRole}}</strong> to <strong>{{newRole}}</strong>.") +
      P("Please sign out and back in for the change to take full effect.") +
      NOTE(),
  },

  profile_update_approved: {
    name: "Profile Update Approved",
    category: "People",
    description: "Sent to an employee when their profile update request is approved.",
    variables: ["employeeName"],
    defaultSubject: "Your profile update has been approved",
    defaultBody:

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

      H("Admin Access Removed") +
      P("Your admin access has been removed. You have been returned to a standard staff account.") +
      NOTE("Contact HR if you believe this is an error."),
  },

  // ── People / Onboarding ───────────────────────────────────────────────────

  employee_invite: {
    name: "Employee Invite — Complete Profile",
    category: "People",
    description: "Sent to new employees added via 'Invite' mode. Invites them to set a password and complete their profile.",
    variables: ["employeeName", "inviteLink", "workEmail", "loginUrl", "defaultPassword"],
    defaultSubject: "You're invited to complete your DSN HRMS profile",
    defaultBody:

      `<h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 6px;text-align:center;letter-spacing:-0.4px;">Welcome to Data Science Nigeria</h1>` +
      `<p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;">Hi <strong style="color:#111827;">{{employeeName}}</strong>, your DSN HRMS account has been created and you've been invited to complete your profile.</p>` +
      `<div style="text-align:center;margin:28px 0 20px;"><a href="{{inviteLink}}" style="display:inline-block;padding:14px 44px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">Set your password</a></div>` +
      `<p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 18px;">Or sign in directly using your work email:</p>` +
      TABLE(
        ROW("Login page", `<a href="{{loginUrl}}" style="color:#16a34a;">{{loginUrl}}</a>`),
        ROW("Email", "{{workEmail}}"),
      ) +
      P("On first sign-in you'll be asked to set your own password. After that, the dashboard will guide you to complete your profile.") +
      `<div style="border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;"><p style="font-size:12px;color:#9ca3af;margin:0;">⏱ The set-password link above expires <strong style="color:#374151;">24 hours</strong> after this email was sent. After that, use the direct-login option.</p></div>`,
  },

  employee_account_created: {
    name: "Employee Account Created",
    category: "People",
    description: "Sent to new employees added via 'Me' mode (admin filled the profile). Provides a set-password link and default credentials.",
    variables: ["employeeName", "inviteLink", "workEmail", "loginUrl", "defaultPassword"],
    defaultSubject: "Your DSN HRMS account is ready",
    defaultBody:

      `<h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 6px;text-align:center;letter-spacing:-0.4px;">Welcome to Data Science Nigeria</h1>` +
      `<p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 24px;">Hi <strong style="color:#111827;">{{employeeName}}</strong>, your DSN HRMS account has been created.</p>` +
      `<div style="text-align:center;margin:28px 0 20px;"><a href="{{inviteLink}}" style="display:inline-block;padding:14px 44px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">Set your password</a></div>` +
      `<p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 18px;">Or sign in directly using your work email:</p>` +
      TABLE(
        ROW("Login page", `<a href="{{loginUrl}}" style="color:#16a34a;">{{loginUrl}}</a>`),
        ROW("Email", "{{workEmail}}"),
      ) +
      P("On first sign-in you'll be asked to set your own password.") +
      `<div style="border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;"><p style="font-size:12px;color:#9ca3af;margin:0;">⏱ The set-password link above expires <strong style="color:#374151;">24 hours</strong> after this email was sent. After that, use the direct-login option.</p></div>`,
  },

  // ── Birthdays ──────────────────────────────────────────────────────────────

  birthday_digest: {
    name: "Birthday Digest — HR Daily",
    category: "People",
    description: "Sent to HR admins each morning with a list of employee birthdays today.",
    variables: ["count", "names", "today"],
    defaultSubject: "🎂 {{count}} birthday(s) today — {{today}}",
    defaultBody:

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

      H("Happy Birthday! 🎂") +
      P("Wishing you a wonderful birthday, <strong>{{employeeName}}</strong>! Thank you for everything you bring to the team. Have a fantastic day!") +
      P("From everyone at DSN.") +
      NOTE(),
  },

  // ── Intern Reports ──────────────────────────────────────────────────────────

  intern_report_missing: {
    name: "Intern Report — Missing (auto-flagged)",
    description: "Sent to the intern's Project Lead on Monday morning when an intern did not submit a weekly report by Sunday midnight.",
    category: "People",
    variables: ["internName", "weekRange", "reviewLink"],
    defaultSubject: "Missed weekly report — {{internName}} ({{weekRange}})",
    defaultBody:

      H("Missed Weekly Report") +
      P("<strong>{{internName}}</strong> did not submit a weekly report for <strong>{{weekRange}}</strong>. A 'Missed' placeholder has been auto-recorded with a 3-point deduction.") +
      P("If this was an oversight or there was a valid reason, please coordinate with HR — an admin can clear the missed-record so the intern can submit retroactively.") +
      `<div style="text-align:center;margin:24px 0;"><a href="{{reviewLink}}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Review in HRMS</a></div>` +
      NOTE("This is an automated notification."),
  },

  announcement_published: {
    name: "Announcement Published",
    category: "Admin",
    description: "Sent to target audience when an announcement is published with email delivery enabled.",
    variables: ["announcementTitle", "announcementBody", "publishedBy"],
    defaultSubject: "📢 New Announcement: {{announcementTitle}}",
    defaultBody:

      H("New Announcement") +
      P("<strong>{{announcementTitle}}</strong>") +
      P("{{announcementBody}}") +
      `<p style="font-size:12px;color:#9ca3af;margin-top:16px;">— {{publishedBy}}</p>` +
      NOTE("Log in to your HRMS portal for more information."),
  },

  external_admin_welcome: {
    name: "External Admin Welcome",
    category: "Admin",
    description: "Sent to a newly-created external admin user with their temporary password.",
    variables: ["name", "tempPassword", "loginUrl"],
    defaultSubject: "Your DSN Admin Account",
    defaultBody:

      H("Welcome to the DSN HRMS Admin Panel") +
      P("Hi {{name}},") +
      P("An admin account has been created for you. Use the credentials below to sign in. You will be prompted to change the password on first login.") +
      TABLE(
        ROW("Login URL", `<a href="{{loginUrl}}" style="color:#2563eb;text-decoration:none;">{{loginUrl}}</a>`),
        ROW("Temporary Password", `<span style="font-family:monospace;">{{tempPassword}}</span>`),
      ) +
      NOTE("Keep this email safe — anyone with the temporary password can log in until you change it."),
  },

  bus_booking_confirmed: {
    name: "Bus Booking Confirmed",
    category: "Admin",
    description: "Sent to an employee when their bus seat is confirmed after allocation.",
    variables: ["name", "seatNumber", "trip", "stop", "loginUrl"],
    defaultSubject: "Your {{trip}} bus seat is confirmed — Seat #{{seatNumber}}",
    defaultBody:

      H("Bus Seat Confirmed ✓") +
      P("Hi {{name}}, your seat on the <strong>{{trip}}</strong> bus has been confirmed.") +
      TABLE(
        ROW("Seat Number", "#{{seatNumber}}"),
        ROW("Stop", "{{stop}}"),
        ROW("Trip", "{{trip}}"),
      ) +
      NOTE("Have a safe trip!"),
  },

  bus_booking_bounced: {
    name: "Bus Booking — No Seat Available",
    category: "Admin",
    description: "Sent to an employee when their bus booking was not allocated a seat.",
    variables: ["name", "trip", "loginUrl"],
    defaultSubject: "{{trip}} bus — No seat available today",
    defaultBody:

      H("No Seat Available") +
      P("Hi {{name}}, unfortunately there is no space for you on the <strong>{{trip}}</strong> bus today.") +
      P("Please find alternative transport home. Thank you for your understanding.") +
      NOTE("You can book again next bus day (Mon/Wed/Fri)."),
  },

  // ── Intern Conversion ──────────────────────────────────────────────────────

  intern_to_staff: {
    name: "Intern Converted to Staff",
    category: "People",
    description: "Sent to an intern when they are converted to a full staff or project lead role.",
    variables: ["employeeName", "newType"],
    defaultSubject: "Welcome to the DSN Team, {{employeeName}}!",
    defaultBody:

      H("Welcome to the Team!") +
      P("Hi <strong>{{employeeName}}</strong>, congratulations! Your employment status has been updated from <strong>Intern</strong> to <strong>{{newType}}</strong>.") +
      P("You are now a full member of the Data Science Nigeria team. Please sign out and back in to see your updated profile and access.") +
      NOTE("We're excited to have you on board — welcome!"),
  },

  intern_conversion_followup: {
    name: "Intern Conversion — 5-Month Follow-up",
    category: "People",
    description: "Sent to HR admins 5 months after an intern was converted to staff. Prompts a check-in before the 6-month mark.",
    variables: ["employeeName", "convertedAt", "profileLink"],
    defaultSubject: "5-Month Check-in: {{employeeName}} (converted {{convertedAt}})",
    defaultBody:

      H("Intern Conversion Follow-up") +
      P("<strong>{{employeeName}}</strong> was converted from Intern to Staff on <strong>{{convertedAt}}</strong> — 5 months ago.") +
      P("Consider scheduling an engagement check-in before the 6-month mark to ensure a smooth transition.") +
      `<div style="text-align:center;margin:24px 0;"><a href="{{profileLink}}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View Profile</a></div>` +
      NOTE("This is an automated reminder from the HRMS."),
  },

  // ── Performance ──────────────────────────────────────────────────────────────

  appraisal_final_report: {
    name: "Appraisal Final Report",
    category: "People",
    description: "Sent to each staff member from HR when an appraisal cycle is closed — their final score and management comment.",
    variables: ["employeeName", "cycleName", "finalPercent", "behaviouralScore", "jobScore", "coreScore", "managementComment"],
    defaultSubject: "Your {{cycleName}} performance appraisal result",
    defaultBody:

      H("Your Performance Appraisal Result") +
      P("Hi <strong>{{employeeName}}</strong>, your performance appraisal for <strong>{{cycleName}}</strong> has been finalized. Here is your result.") +
      TABLE(
        ROW("Final score", "{{finalPercent}}%"),
        ROW("Behavioural (360)", "{{behaviouralScore}}"),
        ROW("Job-specific", "{{jobScore}}"),
        ROW("Core values", "{{coreScore}}"),
      ) +
      H("Management comment") +
      P("{{managementComment}}") +
      NOTE("Log in to your HRMS portal to view the full appraisal breakdown."),
  },
}

export const EVENT_CATEGORIES = ["Leave", "Documents", "People", "Admin"] as const
