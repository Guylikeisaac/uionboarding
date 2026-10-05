import { create } from 'zustand';

import { jobSearchQuery, type JobsContent, type JobSearchQuery } from '../data/jobsModels';
import { jobsSaveRepository } from '../data/jobsRepositories';
import { loadMockJobs } from '../data/mockJobsRepository';

/** Chip id → server-side filters (`jobType` / `remoteType`). */
export function jobsQueryFor(p: { filterId: string; query?: string; sortBy?: string; page?: number; limit?: number }): JobSearchQuery {
  const jobType: string[] = [];
  const remoteType: string[] = [];
  switch (p.filterId) {
    case 'fulltime':
      jobType.push('full_time');
      break;
    case 'parttime':
      jobType.push('part_time');
      break;
    case 'contract':
      jobType.push('contract');
      break;
    case 'remote':
      remoteType.push('remote');
      break;
  }
  return jobSearchQuery({ q: p.query ?? '', jobType, remoteType, sortBy: p.sortBy, page: p.page ?? 1, limit: p.limit ?? 20 });
}

interface JobsContentActions {
  selectFilter: (filterId: string) => void;
  /** Optimistic save toggle, persisted via `job/save/toggle`; reverts + rethrows. */
  toggleSave: (jobId: string) => Promise<void>;
  /** Seed saved-state from the backend `isSaved` (additive only). */
  ensureSaved: (jobId: string) => void;
  /** Drop a job from the saved set without a backend call. */
  markUnsaved: (jobId: string) => void;
  isSaved: (jobId: string) => boolean;
  /** Add to the session-wide applied set (additive only). */
  markApplied: (jobId: string) => void;
  isApplied: (jobId: string) => boolean;
}

/**
 * Listing chrome + session-wide saved/applied id sets — the single source of
 * truth for the bookmark and "applied" state across every job surface.
 */
export const useJobsContent = create<JobsContent & JobsContentActions>((set, get) => ({
  ...loadMockJobs(),
  selectFilter: (filterId) => {
    if (get().selectedFilterId === filterId) return;
    set({ selectedFilterId: filterId });
  },
  toggleSave: async (jobId) => {
    const wasSaved = get().savedJobIds.has(jobId);
    const next = new Set(get().savedJobIds);
    if (wasSaved) next.delete(jobId);
    else next.add(jobId);
    set({ savedJobIds: next });
    try {
      await jobsSaveRepository.toggleSave({ jobId });
    } catch (e) {
      const revert = new Set(get().savedJobIds);
      if (wasSaved) revert.add(jobId);
      else revert.delete(jobId);
      set({ savedJobIds: revert });
      throw e;
    }
  },
  ensureSaved: (jobId) => {
    if (get().savedJobIds.has(jobId)) return;
    set({ savedJobIds: new Set([...get().savedJobIds, jobId]) });
  },
  markUnsaved: (jobId) => {
    if (!get().savedJobIds.has(jobId)) return;
    const next = new Set(get().savedJobIds);
    next.delete(jobId);
    set({ savedJobIds: next });
  },
  isSaved: (jobId) => get().savedJobIds.has(jobId),
  markApplied: (jobId) => {
    if (!jobId || get().appliedJobIds.has(jobId)) return;
    set({ appliedJobIds: new Set([...get().appliedJobIds, jobId]) });
  },
  isApplied: (jobId) => get().appliedJobIds.has(jobId),
}));
