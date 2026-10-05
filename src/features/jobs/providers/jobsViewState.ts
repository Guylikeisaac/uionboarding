import { create } from 'zustand';

export type JobsSegment = 'all' | 'applied';
export type JobsViewMode = 'list' | 'cards';

/** Pure view state for the Jobs tab (segment + list/cards toggle). */
export const useJobsViewState = create<{
  segment: JobsSegment;
  allJobsMode: JobsViewMode;
  selectSegment: (s: JobsSegment) => void;
  selectMode: (m: JobsViewMode) => void;
}>((set, get) => ({
  segment: 'all',
  allJobsMode: 'list',
  selectSegment: (segment) => {
    if (get().segment === segment) return;
    set({ segment });
  },
  /** Mode applies to All Jobs only. */
  selectMode: (mode) => {
    if (get().segment !== 'all' || get().allJobsMode === mode) return;
    set({ allJobsMode: mode });
  },
}));

/** Effective mode (Applied is list-only). */
export const effectiveJobsMode = (s: { segment: JobsSegment; allJobsMode: JobsViewMode }): JobsViewMode =>
  s.segment === 'applied' ? 'list' : s.allJobsMode;
