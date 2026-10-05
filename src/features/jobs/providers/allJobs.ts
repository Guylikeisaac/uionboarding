import { create } from 'zustand';

import { RepositoryException } from '@/core/data/repositoryException';
import type { JobFilter, JobSummary } from '../data/jobsModels';
import { jobsSearchRepository } from '../data/jobsRepositories';
import { jobsQueryFor } from './jobsContent';

export const kAllJobsFilters: JobFilter[] = [
  { id: 'all', label: 'All', value: 'all' },
  { id: 'fulltime', label: 'Full-time', value: 'full_time' },
  { id: 'parttime', label: 'Part-time', value: 'part_time' },
  { id: 'contract', label: 'Contract', value: 'contract' },
  { id: 'remote', label: 'Remote', value: 'remote' },
];

export const kSortBest = 'top';
export const kSortLatest = 'latest';

export interface AllJobsUiState {
  selectedFilterId: string;
  query: string;
  sortBy: string;
}

let debounce: ReturnType<typeof setTimeout> | null = null;

/** UI state (chip / debounced query / sort) driving the All Jobs query. */
export const useAllJobsUi = create<
  AllJobsUiState & { selectFilter: (id: string) => void; setSort: (s: string) => void; setQuery: (q: string) => void }
>((set, get) => ({
  selectedFilterId: 'all',
  query: '',
  sortBy: kSortBest,
  selectFilter: (id) => {
    if (get().selectedFilterId === id) return;
    set({ selectedFilterId: id });
  },
  setSort: (sortBy) => {
    if (get().sortBy === sortBy) return;
    set({ sortBy });
  },
  setQuery: (query) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      const next = query.trim();
      if (get().query === next) return;
      set({ query: next });
    }, 350);
  },
}));

const queryFrom = (ui: AllJobsUiState, page: number) =>
  jobsQueryFor({ filterId: ui.selectedFilterId, query: ui.query, sortBy: ui.sortBy, page, limit: 20 });

export interface AllJobsState {
  jobs: JobSummary[];
  total: number;
  page: number;
  hasNextPage: boolean;
  isInitialLoading: boolean;
  initialError?: string;
  isLoadingMore: boolean;
  loadMoreError?: string;
}

const initial: AllJobsState = { jobs: [], total: 0, page: 1, hasNextPage: false, isInitialLoading: true, isLoadingMore: false };
const messageFor = (e: unknown) => (e instanceof RepositoryException ? e.message : 'Could not load jobs. Please try again.');

let gen = 0;
let started = false;

/** Backend-driven, paginated All Jobs list. */
export const useAllJobs = create<
  AllJobsState & {
    ensureStarted: () => void;
    reload: () => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
  }
>((set, get) => {
  const prepareReload = () => {
    if (get().jobs.length) set({ initialError: undefined, loadMoreError: undefined });
    else set({ ...initial });
  };
  const fetchPageOne = async (g: number, keepListOnError: boolean) => {
    try {
      const r = await jobsSearchRepository.searchJobs(queryFrom(useAllJobsUi.getState(), 1));
      if (g !== gen) return;
      set({ ...initial, jobs: r.jobs, total: r.total, page: 1, hasNextPage: r.hasNextPage, isInitialLoading: false });
    } catch (e) {
      if (g !== gen) return;
      if (keepListOnError && get().jobs.length) set({ isInitialLoading: false });
      else set({ ...initial, isInitialLoading: false, initialError: messageFor(e) });
    }
  };
  return {
    ...initial,
    ensureStarted: () => {
      if (started) return;
      started = true;
      // Reload page 1 on any query/filter/sort change.
      useAllJobsUi.subscribe((s, p) => {
        if (s.selectedFilterId !== p.selectedFilterId || s.query !== p.query || s.sortBy !== p.sortBy) void get().reload();
      });
      void fetchPageOne(++gen, false);
    },
    reload: () => {
      const g = ++gen;
      prepareReload();
      return fetchPageOne(g, false);
    },
    refresh: () => {
      const g = ++gen;
      prepareReload();
      return fetchPageOne(g, true);
    },
    loadMore: async () => {
      const s = get();
      if (s.isInitialLoading || s.isLoadingMore || !s.hasNextPage || !s.jobs.length) return;
      const g = gen;
      const nextPage = s.page + 1;
      set({ isLoadingMore: true, loadMoreError: undefined });
      try {
        const r = await jobsSearchRepository.searchJobs(queryFrom(useAllJobsUi.getState(), nextPage));
        if (g !== gen) return;
        set({ jobs: [...get().jobs, ...r.jobs], total: r.total, page: nextPage, hasNextPage: r.hasNextPage, isLoadingMore: false });
      } catch (e) {
        if (g !== gen) return;
        set({ isLoadingMore: false, loadMoreError: messageFor(e) });
      }
    },
  };
});
