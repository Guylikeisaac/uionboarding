import type { IconName } from '@/shared/ui/Icon';

/** Option lists for the questionnaire's pickers and grids. */
export const OnboardingCatalog = {
  /** Experienced branch — 6 options. */
  noticePeriods: ['Immediate Joinee', '0-15 days', '1 month', '2 months', '3 months', 'More than 3 months'],

  /** Fresher branch — the same screen with a shorter list. */
  joinAvailability: ['Immediate Joinee', '0-15 days', '1 month', '2 months'],

  genders: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],

  departments: [
    'Engineering',
    'Product',
    'Design',
    'Data & Analytics',
    'Sales',
    'Marketing',
    'Operations',
    'Finance',
    'Human Resources',
    'Customer Success',
  ],

  industries: [
    'Information Technology',
    'Software Product',
    'Financial Services',
    'Healthcare',
    'Education',
    'E-commerce',
    'Manufacturing',
    'Consulting',
    'Media & Entertainment',
    'Telecommunications',
  ],

  employmentTypes: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],

  /** Display label → the `workMode` enum `POST /experience` accepts. */
  employmentTypeToWorkMode: {
    'Full-time': 'fulltime',
    'Part-time': 'parttime',
    Contract: 'contract',
    Internship: 'internship',
    Freelance: 'freelance',
  } as Record<string, string>,

  /** Reverse of employmentTypeToWorkMode. */
  get workModeToEmploymentType(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(OnboardingCatalog.employmentTypeToWorkMode)) out[v] = k;
    return out;
  },

  /** Display label → `noticePeriodDays`. */
  noticePeriodToDays: {
    'Immediate Joinee': 0,
    '0-15 days': 15,
    '1 month': 30,
    '2 months': 60,
    '3 months': 90,
    'More than 3 months': 120,
  } as Record<string, number>,

  get daysToNoticePeriod(): Record<number, string> {
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(OnboardingCatalog.noticePeriodToDays)) out[v] = k;
    return out;
  },

  /** UI label → the `gender` enum `PATCH /user/gender` accepts. */
  genderToApiValue: {
    Male: 'male',
    Female: 'female',
    'Non-binary': 'non_binary',
    'Prefer not to say': 'prefer_not_to_say',
  } as Record<string, string>,

  /** Graduation years plus in-progress statuses. */
  get educationYearOrStatus(): string[] {
    const y = new Date().getFullYear();
    const out = ['Currently studying'];
    for (let i = y + 4; i >= y - 10; i--) out.push(String(i));
    return out;
  },

  /**
   * The **exact** 12 values `PUT .../work-details/interest` accepts — [value]
   * is the contract, [label] is presentation.
   */
  interests: [
    { value: 'career', label: 'Career', icon: 'trending-up' },
    { value: 'entrepreneurship', label: 'Entrepreneurship', icon: 'rocket-launch' },
    { value: 'news', label: 'News & Current Events', icon: 'newspaper' },
    { value: 'inspirational', label: 'Inspirational', icon: 'emoji-objects' },
    { value: 'technology', label: 'Technology', icon: 'computer' },
    { value: 'industry insights', label: 'Industry Insights', icon: 'insights' },
    { value: 'design', label: 'Design', icon: 'brush' },
    { value: 'networking', label: 'Networking', icon: 'groups' },
    { value: 'social impact', label: 'Social Impact', icon: 'volunteer-activism' },
    { value: 'finance', label: 'Finance', icon: 'account-balance' },
    { value: 'sports', label: 'Sports', icon: 'sports-basketball' },
    { value: 'learning', label: 'Learning', icon: 'school' },
  ] as { value: string; label: string; icon: IconName }[],

  minInterests: 3,
  minSkills: 3,
  maxSkills: 5,
  maxJobRoles: 5,
};
