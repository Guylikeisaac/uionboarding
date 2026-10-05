/** Profile feature models. */

export interface ProfileEdit {
  name: string;
  headline: string;
  company: string;
  location: string;
  /** Set only when a new location was picked (drives the current-location write). */
  locationId?: string;
  handle: string;
  website: string;
  about: string;
  openToWork: boolean;
}

/** A single experience or education row, normalized for display + edit. */
export interface ProfileEntry {
  title: string;
  subtitle: string;
  meta?: string;
  bullets: string[];
  trailingBadge?: string;
  id?: string;
  startDate?: Date;
  endDate?: Date;
  currentlyWorking: boolean;
  accentColorHex?: string;
  locationId?: string;
  locationLabel?: string;
  workMode?: string;
  locationType?: string;
  description?: string;
  degreeName?: string;
  fieldOfStudyName?: string;
  grade?: string;
}

export function makeProfileEntry(p: Partial<ProfileEntry> & Pick<ProfileEntry, 'title' | 'subtitle'>): ProfileEntry {
  return { bullets: [], currentlyWorking: false, ...p };
}

export interface TechnicalSkill {
  name: string;
  level: string;
  experience: string;
  progress: number;
  colorValue: number;
}

export interface LanguageEntry {
  name: string;
  level: string;
  progress: number;
}

export interface ProfileProject {
  title: string;
  subtitle: string;
  id?: string;
  description?: string;
  linkUrl?: string;
  coverUrl?: string;
  attachmentKeys: string[];
  currentlyWorking: boolean;
  startDate?: Date;
  endDate?: Date;
  experienceId?: string;
  sortOrder?: number;
}

// ── Links ────────────────────────────────────────────────────────────────────

export type SocialLinkKind =
  | 'linkedin'
  | 'github'
  | 'twitter'
  | 'website'
  | 'stackOverflow'
  | 'leetcode'
  | 'codeforces'
  | 'gitlab'
  | 'hackerRank';

export const socialLinkKinds: SocialLinkKind[] = [
  'linkedin',
  'github',
  'twitter',
  'website',
  'stackOverflow',
  'leetcode',
  'codeforces',
  'gitlab',
  'hackerRank',
];

export const kSocialLinkMeta: Record<SocialLinkKind, { label: string; color: string }> = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  github: { label: 'GitHub', color: '#24292E' },
  twitter: { label: 'Twitter', color: '#111827' },
  website: { label: 'Website', color: '#5B5FF5' },
  stackOverflow: { label: 'Stack Overflow', color: '#F48024' },
  leetcode: { label: 'LeetCode', color: '#FFA116' },
  codeforces: { label: 'Codeforces', color: '#1F8ACB' },
  gitlab: { label: 'GitLab', color: '#FC6D26' },
  hackerRank: { label: 'HackerRank', color: '#2EC866' },
};

/** FontAwesome 6 glyph names per link kind. */
export const kSocialLinkGlyph: Record<SocialLinkKind, string> = {
  linkedin: 'linkedin-in',
  github: 'github',
  twitter: 'x-twitter',
  website: 'globe',
  stackOverflow: 'stack-overflow',
  leetcode: 'code',
  codeforces: 'code',
  gitlab: 'gitlab',
  hackerRank: 'hackerrank',
};

export interface SocialLink {
  kind: SocialLinkKind;
  url: string;
}

/** Typed profile links (work-details); null = unset. */
export interface ProfileLinks {
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  personalWebsite?: string;
  stackOverflowUrl?: string;
  leetcodeUrl?: string;
  codeforcesUrl?: string;
  gitlabUrl?: string;
  hackerRankUrl?: string;
}

export const emptyLinks: ProfileLinks = {};

export function profileLinksFromWorkDetails(wd?: Record<string, any> | null): ProfileLinks {
  if (!wd) return emptyLinks;
  const s = (v: unknown) => {
    const t = v == null ? '' : String(v).trim();
    return t ? t : undefined;
  };
  return {
    linkedinUrl: s(wd.linkedinUrl),
    githubUrl: s(wd.githubUrl),
    twitterUrl: s(wd.twitterUrl),
    personalWebsite: s(wd.personalWebsite),
    stackOverflowUrl: s(wd.stackOverflowUrl),
    leetcodeUrl: s(wd.leetcodeUrl),
    codeforcesUrl: s(wd.codeforcesUrl),
    gitlabUrl: s(wd.gitlabUrl),
    hackerRankUrl: s(wd.hackerRankUrl),
  };
}

export function linkUrlFor(l: ProfileLinks, kind: SocialLinkKind): string | undefined {
  switch (kind) {
    case 'linkedin':
      return l.linkedinUrl;
    case 'github':
      return l.githubUrl;
    case 'twitter':
      return l.twitterUrl;
    case 'website':
      return l.personalWebsite;
    case 'stackOverflow':
      return l.stackOverflowUrl;
    case 'leetcode':
      return l.leetcodeUrl;
    case 'codeforces':
      return l.codeforcesUrl;
    case 'gitlab':
      return l.gitlabUrl;
    case 'hackerRank':
      return l.hackerRankUrl;
  }
}

/** The links actually set, in a stable display order. */
export function resolvedLinks(l: ProfileLinks): SocialLink[] {
  const out: SocialLink[] = [];
  for (const kind of socialLinkKinds) {
    const url = linkUrlFor(l, kind);
    if (url) out.push({ kind, url });
  }
  return out;
}

// ── Aggregate ────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  profilePic: string;
  banner?: string;
  location?: string;
  company: string;
  department: string;
  industry: string;
  handle: string;
  website: string;
  about: string;
  openToWork: boolean;
  completionPercent?: number;
  impressionCount: number;
  experiences: ProfileEntry[];
  educations: ProfileEntry[];
  skills: string[];
  categorizedSkills: Record<string, string[]>;
  technicalSkills: TechnicalSkill[];
  languages: LanguageEntry[];
  projects: ProfileProject[];
  links: ProfileLinks;
  bannerColor?: string;
  skillCategoryColors: Record<string, string>;
  introMediaUrl?: string;
  introMediaType?: string;
  introMediaPublic: boolean;
}

export function makeUserProfile(p: Partial<UserProfile> & Pick<UserProfile, 'id' | 'userId' | 'name' | 'title' | 'profilePic'>): UserProfile {
  return {
    company: '',
    department: '',
    industry: '',
    handle: '',
    website: '',
    about: '',
    openToWork: false,
    impressionCount: 0,
    experiences: [],
    educations: [],
    skills: [],
    categorizedSkills: {},
    technicalSkills: [],
    languages: [],
    projects: [],
    links: emptyLinks,
    skillCategoryColors: {},
    introMediaPublic: false,
    ...p,
  };
}
