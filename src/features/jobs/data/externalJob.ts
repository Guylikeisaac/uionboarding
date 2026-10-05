/**
 * External/web-scraped job listing from `POST /job/external/search`. A flat
 * shape distinct from JobSummary; [applyUrl] leads off-platform.
 */
export interface ExternalJob {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  jobType: string;
  salary: string;
  description: string;
  skills: string[];
  applyUrl: string;
  sourcePlatform: string;
  postingDate: string;
  isSaved: boolean;
  /** The full wire item — sent as the `externalJob` save payload. */
  raw: Record<string, any>;
}

export function externalJobFromJson(json: Record<string, any>): ExternalJob {
  const text = (k: string) => (json[k] == null ? '' : String(json[k]));
  return {
    id: text('id'),
    title: text('title') || 'Untitled role',
    companyName: text('companyName'),
    companyLogo: text('companyLogo'),
    location: text('location'),
    jobType: text('jobType'),
    salary: text('salary'),
    description: text('description'),
    skills: Array.isArray(json.skills) ? json.skills.filter((s: unknown) => s != null && `${s}`).map(String) : [],
    applyUrl: text('applyUrl'),
    sourcePlatform: text('sourcePlatform'),
    postingDate: text('postingDate'),
    isSaved: json.isSaved === true,
    raw: { ...json },
  };
}

/** "fulltime"/"full-time" → "Full Time", etc. */
export function externalEmploymentLabel(j: ExternalJob): string {
  const n = j.jobType.toLowerCase().replace(/[ _-]/g, '');
  switch (n) {
    case 'fulltime':
      return 'Full Time';
    case 'parttime':
      return 'Part Time';
    case 'contract':
    case 'contractor':
      return 'Contract';
    case 'internship':
    case 'intern':
      return 'Internship';
    case 'temporary':
      return 'Temporary';
    case '':
      return '';
    default:
      return j.jobType[0].toUpperCase() + j.jobType.substring(1);
  }
}

export interface ExternalJobSearchQuery {
  q: string;
  location?: string;
  page?: number;
  /** Capped at 10 by the endpoint. */
  limit?: number;
  /** all | today | 3days | week | month */
  datePosted?: string;
  workFromHome?: boolean;
}

export function externalQueryToJson(q: ExternalJobSearchQuery): Record<string, unknown> {
  return {
    q: q.q,
    ...(q.location ? { location: q.location } : {}),
    page: q.page ?? 1,
    limit: Math.max(1, Math.min(10, q.limit ?? 10)),
    ...(q.datePosted != null ? { datePosted: q.datePosted } : {}),
    ...(q.workFromHome != null ? { workFromHome: q.workFromHome } : {}),
  };
}
