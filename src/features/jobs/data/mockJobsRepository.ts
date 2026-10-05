import { makeJobSummary, type JobCompany, type JobDetail, type JobPerson, type JobsContent, type JobSummary } from './jobsModels';

/**
 * In-memory Jobs chrome + the hybrid job detail. The detail overlays the real
 * tapped summary on mock Company/People content.
 */
const fig = (id: string, extra: Partial<JobSummary> = {}) =>
  makeJobSummary({
    id,
    title: 'Senior Product Designer',
    company: 'Figma',
    location: 'Bangalore',
    employmentType: 'Full-time',
    salaryRange: '$130k - $190k',
    ...extra,
  });

const featured: JobSummary[] = [
  fig('feat_01'),
  fig('feat_02', { title: 'UI UX Designer', company: 'ACME Corp.' }),
  fig('feat_03'),
];

const suggestions: JobSummary[] = [fig('sug_01'), fig('sug_02', { highlighted: true }), fig('sug_03'), fig('sug_04'), fig('sug_05')];

export function loadMockJobs(): JobsContent {
  return {
    title: 'Find Jobs',
    openPositions: '2,438 open positions',
    filters: [
      { id: 'all', label: 'All', value: 'all' },
      { id: 'remote', label: 'Remote', value: 'remote' },
      { id: 'fulltime', label: 'Full-time', value: 'full_time' },
      { id: 'parttime', label: 'Part-time', value: 'part_time' },
    ],
    selectedFilterId: 'all',
    featuredTitle: 'Featured for you',
    featured,
    suggestionsTitle: 'Suggestions',
    suggestions,
    savedJobIds: new Set(),
    appliedJobIds: new Set(),
  };
}

const mockResponsibilities = [
  'Design user flows, wireframes, and high-fidelity UI',
  'Collaborate with product and engineering teams',
  'Translate business requirements into user-centric designs',
  'Conduct basic usability testing and iterate designs',
  'Maintain design consistency across the product',
];

const mockCompany: JobCompany = {
  name: 'SyncUp Technologies',
  about:
    'SyncUp is an AI-first hiring platform that helps recruiters hire faster and candidates apply smarter by matching people to the right opportunities not just keywords.',
  whyJoinUs: [
    'Work on a fast-growing AI-driven product',
    'High ownership and real product impact',
    'Collaborative, design-friendly culture',
    'Opportunity to grow with the company',
  ],
  followersLabel: '500+ followers',
  location: 'Bengaluru, India',
  mutualNames: ['Karthik N S', 'Danish Shafi', 'Aisha Khan'],
  mutualLine: 'Karthik N S, Danish Shafi and 8 other mutual connections',
  following: false,
  logoUrl: '',
};

const person = (id: string, name: string, title: string, company: string, mutualCount: number): JobPerson => ({
  id,
  name,
  title,
  company,
  avatarAsset: '',
  mutualCount,
  connectState: 'none',
});

const mockPeople: JobPerson[] = [
  person('jp_01', 'Sarah Chen', 'Product Designer', 'ABC Corp', 12),
  person('jp_02', 'Natalie Jones', 'Senior Business Executive', 'Google', 5),
  person('jp_03', 'Sarah Chen', 'Product Designer', 'ABC Corp', 12),
  person('jp_04', 'Natalie Jones', 'Senior Business Executive', 'Google', 5),
  person('jp_05', 'Harvey Spencer', 'Product Designer', 'Figma', 9),
  person('jp_06', 'Aisha Khan', 'UX Researcher', 'Swiggy', 8),
];

const mockDescription =
  "We're looking for a UI UX Designer who can turn complex problems into simple, elegant user experiences. You'll work closely with product managers & engineers to design intuitive, scalable solutions for real users.";

/** Hybrid detail: live description/identity from [summary], mock elsewhere. */
export function loadMockJobDetail(jobId: string, summary?: JobSummary): JobDetail {
  const s = summary ?? [...featured, ...suggestions].find((j) => j.id === jobId);
  const live = s?.description.trim() ?? '';
  return {
    id: jobId,
    title: s?.title ?? 'Senior Product Designer',
    company: s?.company ?? 'Figma',
    logoAsset: s?.companyLogo ? s.companyLogo : s?.logoAsset ?? '',
    appliedCount: 32,
    stats: [
      { kind: 'type', label: 'Type', value: s?.employmentType ?? 'Full-time' },
      { kind: 'location', label: 'Location', value: s?.location ?? 'Bangalore' },
      { kind: 'salary', label: 'Salary', value: s?.salaryRange ?? '$130k - $190k' },
    ],
    description: live || mockDescription,
    responsibilities: live ? [] : mockResponsibilities,
    companyInfo: s ? { ...mockCompany, name: s.company, logoUrl: s.companyLogo, following: s.companyFollowing } : mockCompany,
    peopleCountLabel: '120+ People',
    people: mockPeople,
    applied: s?.hasApplied ?? false,
    benefits: s?.benefits ?? [],
    experienceLevel: s?.experienceLevel ?? '',
    applicationDeadline: s?.applicationDeadline,
  };
}
