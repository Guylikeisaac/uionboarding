import { tryParseDate } from '@/core/helpers/dates';
import { jobSummaryFromSearchJson, type JobSummary } from './jobsModels';

/** Badge states for the Applied Jobs tracker. */
export type ApplicationUiStatus = 'applied' | 'underReview' | 'interview' | 'offerReceived' | 'notSelected';

/** THE status mapper — raw backend status → UI badge. Unknown → applied. */
export function mapApplicationStatus(raw: string): ApplicationUiStatus {
  switch (raw.trim().toLowerCase().replace(/[\s-]+/g, '_')) {
    case 'pending':
    case 'shortlisted':
    case 'global_search':
    case 'under_review':
    case 'in_review':
    case 'reviewing':
    case 'review':
      return 'underReview';
    case 'interview':
    case 'interviewing':
    case 'interview_scheduled':
      return 'interview';
    case 'hired':
    case 'offered':
    case 'offer':
    case 'offer_received':
    case 'accepted':
    case 'selected':
      return 'offerReceived';
    case 'rejected':
    case 'opt_out':
    case 'declined':
    case 'not_selected':
      return 'notSelected';
    default:
      return 'applied';
  }
}

export interface JobApplication {
  applicationId: string;
  job: JobSummary;
  status: string;
  appliedAt?: Date;
  updatedAt?: Date;
}

export const applicationUiStatus = (a: JobApplication) => mapApplicationStatus(a.status);
export const applicationDedupeKey = (a: JobApplication) => (a.applicationId ? `app:${a.applicationId}` : `job:${a.job.id}`);

export function jobApplicationFromJson(json: Record<string, any>, fallbackStatus = ''): JobApplication {
  let jobMap: Record<string, any>;
  if (json.job && typeof json.job === 'object') {
    jobMap = { ...json.job };
  } else {
    jobMap = { ...json };
    const jobId = json.jobId;
    if (jobId != null && `${jobId}`) {
      jobMap.id = `${jobId}`;
      delete jobMap._id;
    }
  }
  let job = jobSummaryFromSearchJson(jobMap);
  if (!job.hasApplied) job = { ...job, hasApplied: true };
  const status = String(json.status ?? json.applicationStatus ?? '').trim();
  const date = (v: unknown) => (typeof v === 'string' ? tryParseDate(v) : undefined);
  return {
    applicationId: String(json.id ?? json._id ?? json.applicationId ?? ''),
    job,
    status: status || fallbackStatus,
    appliedAt: date(json.appliedAt ?? json.createdAt ?? json.applied_at),
    updatedAt: date(json.updatedAt ?? json.updated_at),
  };
}

/** One page of `GET /application/applied/all` (0-based pagination). */
export interface AppliedJobsPage {
  applications: JobApplication[];
  hasMore: boolean;
  nextPage?: number;
}

export function appliedJobsPageFromBody(body: unknown): AppliedJobsPage {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? (body as any).data : body;
  let raw: unknown;
  if (data && typeof data === 'object' && !Array.isArray(data)) raw = (data as any).application ?? (data as any).applications;
  else if (Array.isArray(data)) raw = data;
  const applications = Array.isArray(raw)
    ? raw.filter((i) => i && typeof i === 'object').map((i: any) => jobApplicationFromJson(i))
    : [];
  const m = data && typeof data === 'object' && !Array.isArray(data) ? (data as any) : {};
  const rawNext = m.nextPage;
  return {
    applications,
    hasMore: m.hasMore === true,
    nextPage:
      typeof rawNext === 'number' ? Math.trunc(rawNext) : typeof rawNext === 'string' && /^\d+$/.test(rawNext) ? parseInt(rawNext, 10) : undefined,
  };
}
