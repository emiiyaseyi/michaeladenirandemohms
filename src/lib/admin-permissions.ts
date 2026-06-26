export interface PermissionItem {
  key: string
  label: string
}

export interface PermissionGroup {
  group: string
  items: PermissionItem[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "People",
    items: [
      { key: "canViewAllEmployees", label: "View all employees" },
      { key: "canCreateEmployee", label: "Add new employees" },
      { key: "canEditEmployee", label: "Edit employee records" },
      { key: "canDeleteEmployee", label: "Delete employees" },
      { key: "canApproveEmployee", label: "Approve employee requests" },
      { key: "canViewOffers", label: "View job offers" },
      { key: "canManageOffers", label: "Manage job offers" },
      { key: "canViewOrgChart", label: "View org chart" },
      { key: "canViewCustomGroups", label: "View custom groups" },
      { key: "canManageCustomGroups", label: "Manage custom groups" },
      { key: "canViewPersonalDetails", label: "View personal details" },
      { key: "canViewPersonalDocuments", label: "View personal documents" },
      { key: "canManageDepartments", label: "Create & edit departments" },
      { key: "canViewJobTitles", label: "View job titles" },
      { key: "canManageJobTitles", label: "Manage job titles" },
    ],
  },
  {
    group: "Hiring",
    items: [
      { key: "canViewJobs", label: "View job postings" },
      { key: "canCreateJob", label: "Create job postings" },
      { key: "canEditJob", label: "Edit job postings" },
      { key: "canDeleteJob", label: "Delete job postings" },
      { key: "canPostJob", label: "Publish job postings" },
      { key: "canApproveJob", label: "Approve job postings" },
      { key: "canViewApplicants", label: "View applicants" },
      { key: "canManageHiringSettings", label: "Manage hiring settings" },
    ],
  },
  {
    group: "Leave",
    items: [
      { key: "canViewAllLeave", label: "View all leave requests" },
      { key: "canCreateLeave", label: "Create leave on behalf of employee" },
      { key: "canEditLeave", label: "Edit leave requests" },
      { key: "canDeleteLeave", label: "Delete leave requests" },
      { key: "canApproveLeave", label: "Approve or reject leave" },
      { key: "canViewLeaveTypes", label: "View leave types" },
      { key: "canManageLeaveTypes", label: "Create & edit leave types" },
    ],
  },
  {
    group: "Intern Reports",
    items: [
      { key: "canViewInternReports", label: "View intern weekly reports" },
      { key: "canReviewInternReports", label: "Fill Project Lead feedback on reports" },
      { key: "canFillAttendance", label: "Fill attendance ratings for interns" },
    ],
  },
  {
    group: "Surveys",
    items: [
      { key: "canViewSurveys", label: "View surveys" },
      { key: "canCreateSurvey", label: "Create surveys" },
      { key: "canEditSurvey", label: "Edit surveys" },
      { key: "canDeleteSurvey", label: "Delete surveys" },
    ],
  },
  {
    group: "Documents",
    items: [
      { key: "canViewDocuments", label: "View documents" },
      { key: "canManageDocuments", label: "Upload & manage documents" },
      { key: "canRecallDocuments", label: "Recall sent documents" },
      { key: "canDeleteDocuments", label: "Delete documents" },
      { key: "canMakeOffers", label: "Make offers via documents" },
      { key: "canManageOfferTemplates", label: "Manage offer templates" },
    ],
  },
  {
    group: "Benefits",
    items: [
      { key: "canViewBenefits", label: "View benefits" },
      { key: "canManageBenefits", label: "Create & edit benefit plans" },
    ],
  },
  {
    group: "Performance",
    items: [
      { key: "canViewPerformance", label: "View appraisal records" },
      { key: "canManageAppraisalCycles", label: "Configure appraisal cycles (questions, weights, bands)" },
      { key: "canAssignReviewers", label: "Assign reviewers & peers" },
      { key: "canCompileAppraisals", label: "Compile & finalize appraisals" },
    ],
  },
  {
    group: "Time Tracking",
    items: [
      { key: "canViewAbsences", label: "View absences" },
      { key: "canCreateAbsence", label: "Create absences" },
      { key: "canEditAbsence", label: "Edit absences" },
      { key: "canDeleteAbsence", label: "Delete absences" },
      { key: "canReviewAbsence", label: "Review & approve absences" },
    ],
  },
  {
    group: "Disciplinary",
    items: [
      { key: "canViewDisciplinary", label: "View disciplinary records" },
      { key: "canManageViolations", label: "Manage violations" },
      { key: "canManagePolicies", label: "Manage disciplinary policies" },
      { key: "canManageViolationTypes", label: "Manage violation types" },
      { key: "canManageTriggers", label: "Manage disciplinary triggers" },
      { key: "canViewSuspensions", label: "View suspensions" },
      { key: "canManageSuspensions", label: "Manage suspensions" },
    ],
  },
  {
    group: "Announcements",
    items: [
      { key: "canViewAnnouncements", label: "View announcements" },
      { key: "canCreateAnnouncement", label: "Create announcements" },
      { key: "canEditAnnouncement", label: "Edit announcements" },
      { key: "canDeleteAnnouncement", label: "Delete announcements" },
      { key: "canManageAnnouncementGroups", label: "Manage announcement groups" },
    ],
  },
  {
    group: "Assets",
    items: [
      { key: "canViewAssets", label: "View assets" },
      { key: "canCreateAsset", label: "Add assets" },
      { key: "canEditAsset", label: "Edit assets" },
      { key: "canDeleteAsset", label: "Delete assets" },
      { key: "canManageAssetAssignments", label: "Assign assets to employees" },
    ],
  },
  {
    group: "Rent Documents",
    items: [
      { key: "canViewRentDocuments", label: "View rent documents" },
      { key: "canManageRentDocuments", label: "Manage rent documents" },
    ],
  },
  {
    group: "Reports & Analytics",
    items: [
      { key: "canViewReports", label: "View reports" },
      { key: "canDownloadReports", label: "Download & export reports" },
      { key: "canViewAnalytics", label: "View analytics dashboard" },
    ],
  },
  {
    group: "Audit Log",
    items: [
      { key: "canViewAuditLog", label: "View audit log" },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "canManageHRSettings", label: "Manage HR settings" },
      { key: "canManageDepartmentSettings", label: "Manage department settings" },
      { key: "canManageLeaveTypeSettings", label: "Manage leave type settings" },
      { key: "canManageHolidaySettings", label: "Manage holiday settings" },
      { key: "canManageCustomization", label: "Manage customization" },

    ],
  },
  {
    group: "Admin Management",
    items: [
      { key: "canManageAdmins", label: "Manage admin users" },
      { key: "canCreateCustomRole", label: "Create custom roles" },
      { key: "canEditCustomRole", label: "Edit custom roles" },
      { key: "canDeleteCustomRole", label: "Delete custom roles" },
    ],
  },
]

export function permissionLabel(key: string): string {
  for (const grp of PERMISSION_GROUPS) {
    const item = grp.items.find(i => i.key === key)
    if (item) return item.label
  }
  return key
}
