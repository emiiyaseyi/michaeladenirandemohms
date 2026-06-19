// Default appraisal template — sourced from the org's "Performance Appraisal New Template".
// Admin can load these into a cycle and then edit per cycle.

export type SectionKey = "BEHAVIOURAL" | "LEADERSHIP" | "CORE_VALUE" | "PEER"

export interface DefaultQuestion {
  section: SectionKey
  text: string
  scaleMax: number
  order: number
  adminScored?: boolean
}

// Section II — team-member behavioural items. Scale 0–5.
// Rated by the SUBJECT (self / Employee column), their TEAM LEAD (Reviewer column),
// and their PEERS. Pooled (lead + peers + member-upward) = the 360.
export const DEFAULT_BEHAVIOURAL: { text: string }[] = [
  { text: "Quality of Work: work is completed accurately (few or no errors), efficiently and within deadlines with minimal supervision." },
  { text: "Timely Task Delivery: tasks are completed within agreed deadlines and meet expected standards." },
  { text: "Reliability/Dependability: consistently performs at a high level; manages time and workload effectively to meet responsibilities." },
  { text: "Communication Skills: written and oral communications are clear, organized and effective; listens and comprehends well." },
  { text: "Judgment & Decision-Making: makes thoughtful, well-reasoned decisions; exercises good judgment, resourcefulness and creativity in problem-solving." },
  { text: "Initiative & Flexibility: demonstrates initiative, seeks additional responsibility; identifies problems and solutions; adjusts to unexpected changes." },
  { text: "Cooperation & Teamwork: respectful of colleagues and makes valuable contributions to help the group achieve its goals." },
]

// Leadership items — a team lead's direct reports rate their lead (upward). Scale 0–5.
// Only applies when the subject is a lead → feeds the Team Lead Score.
export const DEFAULT_LEADERSHIP: { text: string }[] = [
  { text: "Promotes Teamwork & Inclusion: effectively promotes teamwork across functions, values diverse perspectives, and empowers all team members to contribute." },
  { text: "Develops Leadership Potential: develops your leadership through stretch assignments, feedback, mentorship, and exposure to senior leaders." },
  { text: "Fosters Positive Culture & Trust: ability to foster a positive culture, build trust, and provide autonomy in your role." },
  { text: "Provides Clarity of Role & Goals: clearly defines responsibilities, sets clear goals, and explains how they connect to the team's overall vision." },
  { text: "Embodies Values & Encourages Innovation: consistently embodies DSN values, encourages innovation, and supports risk-taking as part of learning." },
  { text: "Demonstrates Empathy & Support: demonstrates empathy and provides emotional or practical support during challenges." },
  { text: "Drives Team Success, Morale & Retention: drives the team's success in achieving key objectives, and strengthens team morale." },
]

// Section IV — organisation core values. Scale 0–3 (self + reviewer rate each).
// `adminScored` items also get a locked admin-entered score (attendance from HR records).
export const DEFAULT_CORE_VALUES: { text: string; adminScored?: boolean }[] = [
  { text: "CanDo: demonstrates enthusiasm, actively contributes beyond assigned duties, takes on new tasks with a positive and committed attitude." },
  { text: "Excellence: striving for the highest performance and quality standards in every task and interaction." },
  { text: "Impact: creating meaningful, positive, and lasting contributions that make a difference in the team and organisation." },
  { text: "Innovation: embracing creativity and forward-thinking to deliver groundbreaking solutions and improve processes." },
  { text: "Integrity: upholding honesty, accountability, and strong moral principles in all actions and decisions." },
  { text: "Leadership: inspiring, guiding, and empowering others while setting an example of responsibility and vision." },
  { text: "Selflessness: prioritising the needs of others and the organisation above personal interests, fostering teamwork." },
  { text: "Work Discipline & Attendance: showing commitment to work through regular attendance and adherence to official hours.", adminScored: true },
]

export function defaultQuestions(): DefaultQuestion[] {
  const out: DefaultQuestion[] = []
  DEFAULT_BEHAVIOURAL.forEach((q, i) => out.push({ section: "BEHAVIOURAL", text: q.text, scaleMax: 5, order: i }))
  DEFAULT_LEADERSHIP.forEach((q, i) => out.push({ section: "LEADERSHIP", text: q.text, scaleMax: 5, order: i }))
  DEFAULT_CORE_VALUES.forEach((q, i) => out.push({ section: "CORE_VALUE", text: q.text, scaleMax: 3, order: i, adminScored: q.adminScored }))
  return out
}

// SMART-framework guidance shown beside Section VII "Areas for Improvement" and
// "Development Plan" so both staff and reviewer know how to write them.
export const SMART_GUIDANCE = {
  areasForImprovement:
    "SMART — Specific: what exactly to improve? Measurable: how is progress tracked? Achievable: realistic this cycle? Relevant: how it ties to the role/goals. Time-bound: by when?",
  developmentPlan:
    "SMART — Specific: 1–2 key development actions. Measurable: success indicators. Achievable: resources/support in place. Relevant: links to career growth & team priorities. Time-bound: target date.",
}

// ── Section weights (Overall Performance Summary). Sum of weighted sections = 100. ──
export interface SectionWeights {
  behavioural: number   // 360 behavioural
  jobSpecific: number   // job-specific / projects
  coreValues: number    // organisation core values
  recommendation: number
  query: number         // query weight is 0 — it subtracts raw points
}

export const DEFAULT_WEIGHTS: SectionWeights = {
  behavioural: 18,
  jobSpecific: 50,
  coreValues: 21,
  recommendation: 11,
  query: 0,
}

// ── Query bands (Section V) — negative points based on warnings / official query badges. ──
export interface QueryBand { label: string; warnings?: number; badges?: number; points: number }
export const DEFAULT_QUERY_BANDS: QueryBand[] = [
  { label: "1 - 2 Warnings", warnings: 2, points: -2 },
  { label: "3 - 4 Warnings", warnings: 4, points: -4 },
  { label: "1 Official Query Badge", badges: 1, points: -6 },
  { label: "2 Official Query Badges", badges: 2, points: -9 },
]

// ── Recommendation bands (Section VI) — positive points. ──
export interface RecommendationBand { label: string; min: number; max: number; points: number }
export const DEFAULT_RECOMMENDATION_BANDS: RecommendationBand[] = [
  { label: "1 Recommendation", min: 1, max: 1, points: 4 },
  { label: "2 Recommendations", min: 2, max: 2, points: 8 },
  { label: "3 - 5 Recommendations", min: 3, max: 5, points: 11 },
]

// ── Admin-filled global KPI rows (same for everyone) — part of the Job-Specific table. ──
export interface GlobalKpiTemplate { projectName: string; deliverable: string; kpi: string; weight: number }
export const DEFAULT_GLOBAL_KPIS: GlobalKpiTemplate[] = [
  { projectName: "Learning & Development", deliverable: "Course/Training/Conference", kpi: "Complete 3 courses (Data Protection & Privacy, Time Management, and Developing Corporate Behavior) by the end of June 2026.", weight: 4 },
  { projectName: "Strategic Brand Visibility & Engagement", deliverable: "Number of organisational social media posts engaged", kpi: "Engage 100% of social media posts within the review cycle.", weight: 7 },
]

// Per-KPI score scale (job-specific). Each KPI is scored 0..KPI_SCORE_SCALE; weighted by its weight.
export const KPI_SCORE_SCALE = 10
