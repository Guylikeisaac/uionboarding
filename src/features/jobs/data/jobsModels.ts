/** Content models for the Jobs flow (listing + detail). */
import { monthShortNames } from '@/core/helpers/relativeTime';
import { tryParseDate } from '@/core/helpers/dates';

// ── Listing ──────────────────────────────────────────────────────────────────

export interface JobFilter {
  id: string;
  label: string;
  value: string;
}

/** Compact job used by the listing cards and carried into the detail. */
export interface JobSummary {
  id: string;
  title: string;
  company: string;
  logoAsset: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  description: string;
  isSaved: boolean;
  hasApplied: boolean;
  benefits: string[];
  experienceLevel: string;
  /** "remote" / "hybrid" / "onsite"; empty when absent. */
  remoteType: string;
  applicationDeadline?: string;
  companyLogo: string;
  companyIndustry: string;
  companyFollowing: boolean;
  highlighted: boolean;
  /** For external saved jobs, the payload un-save must send. */
  externalJob?: unknown;
}

export function makeJobSummary(p: Partial<JobSummary> & Pick<JobSummary, 'id' | 'title' | 'company' | 'location' | 'employmentType' | 'salaryRange'>): JobSummary {
  return {
    logoAsset: '',
    description: '',
    isSaved: false,
    hasApplied: false,
    benefits: [],
    experienceLevel: '',
    remoteType: '',
    companyLogo: '',
    companyIndustry: '',
    companyFollowing: false,
    highlighted: false,
    ...p,
  };
}

export const jobDisplayLogo = (j: JobSummary) => (j.companyLogo ? j.companyLogo : j.logoAsset);
export const jobIsExternal = (j: JobSummary) => j.externalJob != null;

/** First non-empty string among [keys]. */
export function pickString(json: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = json[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Clean company name, '' when unknown. */
export function jobCompanyName(company: unknown): string {
  if (typeof company === 'string' && company.trim()) return company.trim();
  if (company && typeof company === 'object') {
    for (const k of ['name', 'companyName', 'displayName', 'title']) {
      const v = (company as any)[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

function jobLocation(location: unknown): string {
  return typeof location === 'string' && location.trim() ? location.trim() : '—';
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
    : [];
}

function jobCompanyLogo(company: unknown): string {
  if (company && typeof company === 'object') {
    const logo = (company as any).logo;
    if (typeof logo === 'string' && logo.trim()) return logo.trim();
  }
  return '';
}

/** True for machine identifiers (UUIDs, long hex tokens). */
export function looksLikeIdentifier(value: string): boolean {
  const v = value.trim();
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)) return true;
  return /^[0-9a-fA-F-]{16,}$/.test(v);
}

/** Company industry as a display label — never a raw id. */
function jobCompanyIndustry(company: unknown): string {
  if (!company || typeof company !== 'object') return '';
  const raw = (company as any).industry;
  let label: string | undefined;
  if (typeof raw === 'string') label = raw.trim();
  else if (raw && typeof raw === 'object') {
    for (const k of ['name', 'label', 'title']) {
      const v = raw[k];
      if (typeof v === 'string' && v.trim()) {
        label = v.trim();
        break;
      }
    }
  }
  if (!label || looksLikeIdentifier(label)) return '';
  return label;
}

const jobCompanyFollowing = (company: unknown) => !!company && typeof company === 'object' && (company as any).isFollowing === true;

/** "full_time" → "Full Time"; falls back to "Full-time". */
export function jobEmploymentType(jobType: unknown): string {
  if (typeof jobType === 'string' && jobType.trim()) {
    return jobType
      .trim()
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .map((w) => (w ? `${w[0].toUpperCase()}${w.substring(1).toLowerCase()}` : w))
      .join(' ');
  }
  return 'Full-time';
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** Compact, India-first formatting (₹, lakhs/thousands). */
export function money(value: number): string {
  if (value >= 100000) {
    const l = value / 100000;
    return `₹${l.toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    return `₹${k.toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₹${value}`;
}

export function jobSalaryRange(min: unknown, max: unknown): string {
  const lo = toNum(min);
  const hi = toNum(max);
  if (lo != null && lo > 0 && hi != null && hi > 0) return `${money(lo)} - ${money(hi)}`;
  if (lo != null && lo > 0) return `From ${money(lo)}`;
  if (hi != null && hi > 0) return `Up to ${money(hi)}`;
  return 'Not disclosed';
}

/** Card-ready summary from one item of `POST /job/search`. Defensive. */
export function jobSummaryFromSearchJson(json: Record<string, any>): JobSummary {
  return makeJobSummary({
    id: String(json._id ?? json.id ?? ''),
    title: pickString(json, ['title', 'jobTitle', 'role', 'position']) ?? 'Untitled role',
    company: jobCompanyName(json.company ?? json.companyName ?? json.companyDetails),
    location: jobLocation(json.location ?? json.jobLocation ?? json.city),
    employmentType: jobEmploymentType(json.jobType ?? json.employmentType ?? json.type),
    salaryRange: jobSalaryRange(
      json.salaryMin ?? json.minSalary ?? json.salary_min,
      json.salaryMax ?? json.maxSalary ?? json.salary_max,
    ),
    description: pickString(json, ['description', 'jobDescription', 'desc']) ?? '',
    isSaved: json.isSaved === true,
    hasApplied: json.hasApplied === true,
    benefits: stringList(json.benefits),
    experienceLevel: pickString(json, ['experienceLevel']) ?? '',
    remoteType: pickString(json, ['remoteType']) ?? '',
    applicationDeadline: pickString(json, ['applicationDeadline']),
    companyLogo: jobCompanyLogo(json.company),
    companyIndustry: jobCompanyIndustry(json.company),
    companyFollowing: jobCompanyFollowing(json.company),
    externalJob: json.externalJob ?? json.externalId ?? json.externalJobId ?? undefined,
  });
}

/** Request params for `POST /job/search`; empty fields are omitted. */
export interface JobSearchQuery {
  q: string;
  jobType: string[];
  remoteType: string[];
  sortBy?: string;
  page: number;
  limit: number;
}

export function jobSearchQuery(p: Partial<JobSearchQuery> = {}): JobSearchQuery {
  return { q: '', jobType: [], remoteType: [], page: 1, limit: 20, ...p };
}

export function jobSearchQueryToJson(q: JobSearchQuery): Record<string, unknown> {
  const body: Record<string, unknown> = { page: q.page, limit: q.limit };
  const t = q.q.trim();
  if (t) body.q = t;
  if (q.jobType.length) body.jobType = q.jobType;
  if (q.remoteType.length) body.remoteType = q.remoteType;
  if (q.sortBy) body.sortBy = q.sortBy;
  return body;
}

/** Paginated jobs list. [total] is the server's real result count. */
export interface JobSearchResult {
  jobs: JobSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export const emptyJobSearchResult: JobSearchResult = { jobs: [], total: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false };

export function jobSearchResultFromData(data: Record<string, any>): JobSearchResult {
  const jobs = Array.isArray(data.jobs)
    ? data.jobs.filter((j: unknown) => j && typeof j === 'object').map((j: any) => jobSummaryFromSearchJson(j))
    : [];
  const p = data.pagination;
  if (p && typeof p === 'object') {
    const intOf = (keys: string[], fallback: number) => {
      for (const k of keys) {
        const v = p[k];
        if (typeof v === 'number') return Math.trunc(v);
        if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
      }
      return fallback;
    };
    const page = intOf(['page', 'currentPage'], 1);
    const totalPages = intOf(['totalPages', 'pages'], 1);
    const hasFlag = 'hasNextPage' in p || 'hasNext' in p;
    const hasNext = hasFlag ? p.hasNextPage === true || p.hasNext === true : page < totalPages;
    return {
      jobs,
      total: intOf(['total', 'totalJobs', 'totalResults', 'totalCount'], jobs.length),
      page,
      limit: intOf(['limit', 'pageSize'], jobs.length),
      totalPages,
      hasNextPage: hasNext,
    };
  }
  return { ...emptyJobSearchResult, jobs, total: jobs.length };
}

/** Listing-page aggregate + session-wide saved/applied id sets. */
export interface JobsContent {
  title: string;
  openPositions: string;
  filters: JobFilter[];
  selectedFilterId: string;
  featuredTitle: string;
  featured: JobSummary[];
  suggestionsTitle: string;
  suggestions: JobSummary[];
  savedJobIds: Set<string>;
  appliedJobIds: Set<string>;
}

// ── Detail ───────────────────────────────────────────────────────────────────

export type JobStatKind = 'type' | 'location' | 'salary';

export interface JobStat {
  kind: JobStatKind;
  label: string;
  value: string;
}

export type JobDetailTab = 'description' | 'company' | 'people';

export type ConnectState = 'none' | 'requested';

export interface JobPerson {
  id: string;
  name: string;
  title: string;
  company: string;
  avatarAsset: string;
  mutualCount: number;
  connectState: ConnectState;
}

export interface JobCompany {
  name: string;
  about: string;
  whyJoinUs: string[];
  followersLabel: string;
  location: string;
  mutualNames: string[];
  mutualLine: string;
  following: boolean;
  logoUrl: string;
}

export interface JobDetail {
  id: string;
  title: string;
  company: string;
  logoAsset: string;
  appliedCount: number;
  stats: JobStat[];
  description: string;
  responsibilities: string[];
  companyInfo: JobCompany;
  peopleCountLabel: string;
  people: JobPerson[];
  applied: boolean;
  benefits: string[];
  experienceLevel: string;
  applicationDeadline?: string;
}

/** "entry_level" → "Entry level". */
export function experienceLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const words = t.replace(/[_-]+/g, ' ').trim().split(/\s+/);
  if (!words.length) return '';
  const first = words[0];
  const head = `${first[0].toUpperCase()}${first.substring(1).toLowerCase()}`;
  return [head, ...words.slice(1).map((w) => w.toLowerCase())].join(' ');
}

/** "Pencil • Entry level". */
export function jobHeroMeta(d: JobDetail): string {
  const exp = experienceLabel(d.experienceLevel);
  if (!d.company) return exp;
  return exp ? `${d.company} • ${exp}` : d.company;
}

/** "5 Jul 2026" from the ISO deadline. */
export function deadlineLabel(iso?: string): string {
  if (!iso || !iso.trim()) return '';
  const dt = tryParseDate(iso);
  if (!dt) return '';
  return `${dt.getDate()} ${monthShortNames[dt.getMonth()]} ${dt.getFullYear()}`;
}
