import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { appliedJobsPageFromBody, type AppliedJobsPage } from './jobApplication';
import { externalJobFromJson, externalQueryToJson, type ExternalJob, type ExternalJobSearchQuery } from './externalJob';
import {
  emptyJobSearchResult,
  jobSearchQueryToJson,
  jobSearchResultFromData,
  jobSummaryFromSearchJson,
  type JobSearchQuery,
  type JobSearchResult,
  type JobSummary,
} from './jobsModels';

/** Outcome of the apply call; "already applied" 400 is a success. */
export interface JobApplyResult {
  applicationId: string;
  firstJobApply: boolean;
  alreadyApplied: boolean;
}

/** `POST /job/search` — the single list/search contract. */
export class JobsSearchRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
    try {
      const res = await this.client.post(ApiConstants.job(ApiConstants.jobSearch), { data: jobSearchQueryToJson(query) });
      const data = res.data?.data;
      return data && typeof data === 'object' ? jobSearchResultFromData(data) : emptyJobSearchResult;
    } catch (e) {
      const status = statusOf(e);
      const msg = serverMessage(e);
      throw new RepositoryException(
        status === 401
          ? msg ?? 'Please sign in again to see jobs.'
          : status === 400
            ? msg ?? 'Could not search jobs with those filters.'
            : msg ?? 'Could not load jobs. Check your connection and try again.',
        { cause: e },
      );
    }
  }
}

/** `POST /job/external/search` (JSearch-backed). */
export class ExternalJobsRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async search(query: ExternalJobSearchQuery): Promise<ExternalJob[]> {
    try {
      const res = await this.client.post(ApiConstants.job(ApiConstants.jobExternalSearch), { data: externalQueryToJson(query) });
      const jobs = res.data?.data?.jobs;
      if (!Array.isArray(jobs)) return [];
      return jobs.filter((j) => j && typeof j === 'object').map(externalJobFromJson).filter((j) => j.id);
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load jobs from the web. Please try again.", { cause: e });
    }
  }
}

/** `POST /application/apply/{jobId}`. */
export class JobsApplyRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async apply(jobId: string, coverLetter?: string): Promise<JobApplyResult> {
    const trimmed = coverLetter?.trim() ?? '';
    try {
      const res = await this.client.post(ApiConstants.job(ApiConstants.applicationApply(jobId)), {
        data: trimmed ? { coverLetter: trimmed } : {},
      });
      const data = res.data?.data;
      return {
        applicationId: data?.application?.id?.toString() ?? '',
        firstJobApply: data?.firstJobApply === true,
        alreadyApplied: false,
      };
    } catch (e) {
      const msg = serverMessage(e);
      if (statusOf(e) === 400 && (msg ?? '').toLowerCase().includes('already applied')) {
        return { applicationId: '', firstJobApply: false, alreadyApplied: true };
      }
      throw new RepositoryException(msg ?? "Couldn't submit your application. Please try again.", { cause: e });
    }
  }
}

/** Job save/bookmark — single owner of job-save state for the whole app. */
export class JobsSaveRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async loadSavedJobs(page = 1, limit = 50): Promise<JobSummary[]> {
    try {
      const res = await this.client.get(ApiConstants.job(ApiConstants.jobSaveList), { params: { page, limit } });
      const raw = res.data?.data?.jobs;
      if (!Array.isArray(raw)) return [];
      return raw.filter((j) => j && typeof j === 'object').map(jobSummaryFromSearchJson);
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load your saved jobs.", { cause: e });
    }
  }

  /** Resolves the authoritative new `isSaved`. Exactly one of jobId/externalJob. */
  async toggleSave(p: { jobId?: string; externalJob?: unknown }): Promise<boolean> {
    const body = p.externalJob != null && `${p.externalJob}` ? { externalJob: p.externalJob } : { jobId: p.jobId };
    try {
      const res = await this.client.post(ApiConstants.job(ApiConstants.jobSaveToggle), { data: body });
      const s = res.data?.data?.isSaved;
      return typeof s === 'boolean' ? s : false;
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't update your saved jobs.", { cause: e });
    }
  }
}

/** `GET /application/applied/all` (0-based page; page+limit required). */
export class JobsApplicationsRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async loadApplied(page: number, limit: number, q?: string): Promise<AppliedJobsPage> {
    const query = q?.trim() ?? '';
    try {
      const res = await this.client.get(ApiConstants.job(ApiConstants.applicationAppliedAll), {
        params: { page, limit, ...(query ? { q: query } : {}) },
      });
      return appliedJobsPageFromBody(res.data);
    } catch (e) {
      const m = serverMessage(e)?.trim();
      throw new RepositoryException(m ? m : "Couldn't load your applications.", { cause: e });
    }
  }
}

export const jobsSearchRepository = new JobsSearchRepository();
export const externalJobsRepository = new ExternalJobsRepository();
export const jobsApplyRepository = new JobsApplyRepository();
export const jobsSaveRepository = new JobsSaveRepository();
export const jobsApplicationsRepository = new JobsApplicationsRepository();
