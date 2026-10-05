import { create } from 'zustand';

import { RepositoryException } from '@/core/data/repositoryException';
import { sprintEligibility } from '@/features/readinessSprint/data/sprintRepositories';
import { invalidateSprintPendingStatus } from '@/features/readinessSprint/providers/sprintProviders';
import { jobsApplyRepository } from '../data/jobsRepositories';
import { useAppliedJobs } from '../providers/appliedJobs';
import { useJobsContent } from '../providers/jobsContent';
import { jobsListActions } from '../providers/jobsList';

export type JobApplySubmissionOutcome = 'applied' | 'alreadyApplied' | 'failed' | 'duplicate';

export interface JobApplySubmission {
  outcome: JobApplySubmissionOutcome;
  /** The owed-sprint debt has ALREADY been recorded when true. */
  sprintEligible: boolean;
  errorMessage?: string;
}

/**
 * Lifecycle-independent apply pipeline. State is the global set of in-flight
 * job ids; [submit] refuses duplicates.
 */
export const useJobApplyCoordinator = create<{
  inFlight: Set<string>;
  submit: (jobId: string, jobTitle: string) => Promise<JobApplySubmission>;
}>((set, get) => ({
  inFlight: new Set(),
  submit: async (jobId, jobTitle) => {
    if (get().inFlight.has(jobId)) return { outcome: 'duplicate', sprintEligible: false };
    set({ inFlight: new Set([...get().inFlight, jobId]) });
    try {
      const result = await jobsApplyRepository.apply(jobId);
      // Commit applied-state UNCONDITIONALLY.
      useJobsContent.getState().markApplied(jobId);
      jobsListActions.markApplied(jobId);
      useAppliedJobs.getState().invalidate();
      if (result.alreadyApplied) return { outcome: 'alreadyApplied', sprintEligible: false };
      let openSprint = false;
      try {
        openSprint = await sprintEligibility.shouldOpenSprintAfterApply(jobId);
      } catch {
        // never break the apply
      }
      if (openSprint) {
        try {
          await sprintEligibility.markSprintOwed(jobId, jobTitle);
        } catch {
          // best-effort
        }
        void invalidateSprintPendingStatus();
      }
      return { outcome: 'applied', sprintEligible: openSprint };
    } catch (e) {
      return {
        outcome: 'failed',
        sprintEligible: false,
        errorMessage: e instanceof RepositoryException ? e.message : "Couldn't submit your application. Please try again.",
      };
    } finally {
      const next = new Set(get().inFlight);
      next.delete(jobId);
      set({ inFlight: next });
    }
  },
}));

/** A completion whose originating surface was no longer on screen. */
export interface JobApplyCompletionEvent {
  seq: number;
  jobId: string;
  jobTitle: string;
  outcome: JobApplySubmissionOutcome;
  sprintEligible: boolean;
  errorMessage?: string;
}

let seq = 0;

export const useJobApplyEvents = create<{
  event: JobApplyCompletionEvent | null;
  announce: (e: Omit<JobApplyCompletionEvent, 'seq'>) => void;
}>((set) => ({
  event: null,
  announce: (e) => set({ event: { ...e, seq: ++seq } }),
}));
