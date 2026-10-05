import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { create } from 'zustand';

import { queryClient } from '@/core/query/queryClient';
import type { JobSearchResult, JobSummary } from '../data/jobsModels';
import { jobsSearchRepository } from '../data/jobsRepositories';
import { jobsQueryFor, useJobsContent } from './jobsContent';

const key = (filterId: string) => ['jobsList', filterId] as const;

/** `/jobs` tab list — server-side filtered by the selected chip. */
export function useJobsList() {
  const filterId = useJobsContent((s) => s.selectedFilterId);
  return useQuery<JobSearchResult>({
    queryKey: key(filterId),
    queryFn: () => jobsSearchRepository.searchJobs(jobsQueryFor({ filterId, limit: 20 })),
    staleTime: Infinity,
  });
}

export const jobsListActions = {
  /** Re-run the search for the current filter. */
  refresh() {
    const filterId = useJobsContent.getState().selectedFilterId;
    return queryClient.refetchQueries({ queryKey: key(filterId) });
  },
  /** Flip `hasApplied` in the loaded result, no refetch. */
  markApplied(jobId: string) {
    const filterId = useJobsContent.getState().selectedFilterId;
    queryClient.setQueryData<JobSearchResult>(key(filterId), (r) => {
      if (!r) return r;
      const i = r.jobs.findIndex((j) => j.id === jobId && !j.hasApplied);
      if (i === -1) return r;
      const jobs = [...r.jobs];
      jobs[i] = { ...jobs[i], hasApplied: true };
      return { ...r, jobs };
    });
  },
  invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['jobsList'] });
  },
};

// ── Card deck session ────────────────────────────────────────────────────────

interface DeckSession {
  filterId: string;
  dismissed: Set<string>;
  applied: Set<string>;
}

/** Session-local deck state; resets when the filter changes. */
export const useJobDeckSession = create<
  DeckSession & {
    dismiss: (jobId: string) => void;
    markConsumedByApply: (jobId: string, filterId: string) => void;
    reset: () => void;
    syncFilter: (filterId: string) => void;
  }
>((set, get) => ({
  filterId: useJobsContent.getState().selectedFilterId,
  dismissed: new Set(),
  applied: new Set(),
  dismiss: (jobId) => {
    if (get().dismissed.has(jobId)) return;
    set({ dismissed: new Set([...get().dismissed, jobId]) });
  },
  markConsumedByApply: (jobId, filterId) => {
    if (get().filterId !== filterId || get().applied.has(jobId)) return;
    set({ applied: new Set([...get().applied, jobId]) });
  },
  reset: () => {
    if (!get().dismissed.size && !get().applied.size) return;
    set({ dismissed: new Set(), applied: new Set() });
  },
  syncFilter: (filterId) => {
    if (get().filterId === filterId) return;
    set({ filterId, dismissed: new Set(), applied: new Set() });
  },
}));

// A new filter is a NEW deck.
useJobsContent.subscribe((s, prev) => {
  if (s.selectedFilterId !== prev.selectedFilterId) useJobDeckSession.getState().syncFilter(s.selectedFilterId);
});

export const deckConsumed = (s: DeckSession) => s.dismissed.size + s.applied.size;

/** The cards left to swipe: list minus dismissed and already-applied jobs. */
export function useJobDeck(): JobSummary[] {
  const list = useJobsList();
  const dismissed = useJobDeckSession((s) => s.dismissed);
  const applied = useJobsContent((s) => s.appliedJobIds);
  return useMemo(
    () => (list.data?.jobs ?? []).filter((j) => !dismissed.has(j.id) && !j.hasApplied && !applied.has(j.id)),
    [list.data, dismissed, applied],
  );
}
