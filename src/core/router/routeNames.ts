/**
 * Single source of truth for every route path in the app. Import this file
 * instead of writing raw path strings anywhere.
 */
export const RouteNames = {
  // ── Core ──
  splash: '/',

  // ── Home shell tabs ──
  home: '/home',
  network: '/network',
  jobs: '/jobs',
  messages: '/messages',

  /** "My Network" (Connections / Received / Sent). `?tab=` picks the tab. */
  networkConnections: '/network-connections',

  /** Job detail: `${jobDetail}/${id}`. */
  jobDetail: '/job',
  /** "All Jobs" browse screen, inside the Jobs tab. */
  allJobs: '/jobs/all',

  /** External job detail + in-app apply browser (extra-only). */
  externalJobDetail: '/external-job',
  externalJobApply: '/external-job/apply',

  /** Company detail — re-fetches by slug. */
  company: '/company',
  companyPath: (slug: string) => `/company/${encodeURIComponent(slug)}`,

  /** Job Readiness Sprint for a job. */
  readinessSprintPath: (jobId: string) => `/job/${encodeURIComponent(jobId)}/sprint`,
  jobDetailPath: (jobId: string) => `/job/${encodeURIComponent(jobId)}`,

  // ── Home / first-run flows ──
  search: '/search',
  /** Inside the Home tab so the bottom nav stays visible. */
  notifications: '/home/notifications',
  savedItems: '/home/saved',
  resumeUpload: '/resume-upload',
  resumeView: '/resume-view',
  profile: '/profile',
  profilePublic: '/profile-public',
  profileCv: '/profile-cv',
  profileEdit: '/profile-edit',
  postComposer: '/post-composer',
  connectPeople: '/connect-people',
  settings: '/settings',
  browser: '/browser',

  // ── Auth — mobile-first account creation ──
  signupMobile: '/signup/mobile',
  signupMobileOtp: '/signup/mobile-otp',
  signupEmail: '/signup/email',
  signupEmailOtp: '/signup/email-otp',
  /** "Choose your vibe" (Gen Z / professional), right after email verification. */
  signupVibe: '/signup/vibe',
  signupDetails: '/signup/details',

  /** Branch-aware onboarding questionnaire. */
  onboardingFlow: '/onboarding/flow',

  /** Where a logged-out user belongs. */
  get loggedOutEntry() {
    return '/signup/mobile';
  },
} as const;
