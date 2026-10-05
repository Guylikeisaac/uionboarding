import { create } from 'zustand';

import { RepositoryException } from '@/core/data/repositoryException';
import { applicationDedupeKey, type JobApplication } from '../data/jobApplication';
import { jobsApplicationsRepository } from '../data/jobsRepositories';

/** Page size (limit is REQUIRED by the endpoint). */
export const kAppliedJobsPageSize = 20;

export interface AppliedJobsState {
  applications: JobApplication[];
  hasMore: boolean;
  nextPage?: number;
  isInitialLoading: boolean;
  initialError?: string;
  isLoadingMore: boolean;
  loadMoreError?: string;
}

const initial: AppliedJobsState = { applications: [], hasMore: false, isInitialLoading: true, isLoadingMore: false };

const messageFor = (e: unknown) =>
  e instanceof RepositoryException ? e.message : "Couldn't load your applications. Please try again.";

function dedupe(existing: JobApplication[], incoming: JobApplication[]): JobApplication[] {
  const seen = new Set(existing.map(applicationDedupeKey));
  const out = [...existing];
  for (const a of incoming) {
    const k = applicationDedupeKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

let gen = 0;
let started = false;
let q = '';
let autoRefresh: Promise<string | null> | null = null;

/**
 * Paginated Applied Jobs over `application/applied/all` (0-based pages). Lazy:
 * page 0 loads on first [ensureStarted]. A generation counter drops stale
 * responses.
 */
export const useAppliedJobs = create<
  AppliedJobsState & {
    ensureStarted: () => void;
    refresh: () => Promise<string | null>;
    ensureFresh: () => Promise<string | null>;
    retry: () => Promise<void>;
    setQuery: (q: string) => Promise<void>;
    loadMore: () => Promise<void>;
    invalidate: () => void;
  }
>((set, get) => {
  const prepareReload = () => {
    const s = get();
    if (s.applications.length) set({ initialError: undefined, loadMoreError: undefined });
    else set({ ...initial });
  };

  const fetchFirstPage = async (g: number, keepListOnError: boolean): Promise<string | null> => {
    try {
      const page = await jobsApplicationsRepository.loadApplied(0, kAppliedJobsPageSize, q);
      if (g !== gen) return null;
      set({
        applications: dedupe([], page.applications),
        hasMore: page.hasMore,
        nextPage: page.nextPage,
        isInitialLoading: false,
        initialError: undefined,
        isLoadingMore: false,
        loadMoreError: undefined,
      });
      return null;
    } catch (e) {
      if (g !== gen) return null;
      if (keepListOnError && get().applications.length) {
        set({ isInitialLoading: false });
        return messageFor(e);
      }
      set({ ...initial, isInitialLoading: false, initialError: messageFor(e) });
      return null;
    }
  };

  return {
    ...initial,
    ensureStarted: () => {
      if (started) return;
      started = true;
      void fetchFirstPage(++gen, false);
    },
    refresh: () => {
      const g = ++gen;
      prepareReload();
      return fetchFirstPage(g, true);
    },
    ensureFresh: () => {
      if (get().isInitialLoading) return Promise.resolve(null);
      if (!autoRefresh) {
        autoRefresh = get()
          .refresh()
          .finally(() => {
            autoRefresh = null;
          });
      }
      return autoRefresh;
    },
    retry: async () => {
      const g = ++gen;
      prepareReload();
      await fetchFirstPage(g, false);
    },
    setQuery: async (next) => {
      const t = next.trim();
      if (q === t) return;
      q = t;
      await get().retry();
    },
    loadMore: async () => {
      const s = get();
      if (s.isInitialLoading || s.isLoadingMore || !s.hasMore || s.nextPage == null || !s.applications.length) return;
      const g = gen;
      set({ isLoadingMore: true, loadMoreError: undefined });
      try {
        const page = await jobsApplicationsRepository.loadApplied(s.nextPage, kAppliedJobsPageSize, q);
        if (g !== gen) return;
        set({
          applications: dedupe(get().applications, page.applications),
          hasMore: page.hasMore,
          nextPage: page.nextPage,
          isLoadingMore: false,
        });
      } catch (e) {
        if (g !== gen) return;
        set({ isLoadingMore: false, loadMoreError: messageFor(e) });
      }
    },
    /** Riverpod `invalidate`: reset and reload on next use. */
    invalidate: () => {
      gen++;
      set({ ...initial });
      if (started) void fetchFirstPage(++gen, false);
    },
  };
});
