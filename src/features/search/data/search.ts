import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

import { authManager } from '@/core/auth/authManager';
import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { prefs } from '@/core/storage/storage';
import { companyRepository, type CompanySummary } from '@/features/company/data/company';
import type { ExternalJob } from '@/features/jobs/data/externalJob';
import { jobSearchQuery, type JobSummary } from '@/features/jobs/data/jobsModels';
import { externalJobsRepository, jobsSearchRepository } from '@/features/jobs/data/jobsRepositories';

export type SearchType = 'job' | 'person' | 'company' | 'generic';

export interface RecentSearch {
  id: string;
  query: string;
  type: SearchType;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchType;
}

export interface UserSearchResult {
  userId: string;
  name: string;
  title: string;
  avatarUrl: string;
}

/** Static mock suggestion rows for on-device filtering while typing. */
export const searchSuggestions: SearchSuggestion[] = [
  { id: 'sg_01', title: 'UI UX Designer', subtitle: 'Job opening at SyncUp', type: 'job' },
  { id: 'sg_02', title: 'Senior UI Designer', subtitle: 'Job opening at Dribbble', type: 'job' },
  { id: 'sg_03', title: 'Product Designer', subtitle: 'Role at Figma', type: 'job' },
  { id: 'sg_04', title: 'Alex Johnson', subtitle: 'Product Designer', type: 'person' },
  { id: 'sg_05', title: 'Nitin Sharma', subtitle: 'UI Designer', type: 'person' },
  { id: 'sg_06', title: 'Google', subtitle: 'Company page', type: 'company' },
  { id: 'sg_07', title: 'Canvaloop Fibre', subtitle: 'Company page', type: 'company' },
];

/** `POST /auth-service/user/search`. */
export async function searchUsers(query: string, page = 1, limit = 20): Promise<UserSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await apiClient.post(ApiConstants.auth(ApiConstants.userSearch), { data: { search: q, page, limit } });
    const body = res.data;
    const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
    const users: unknown[] = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
    const s = (v: unknown) => (v == null ? '' : String(v).trim());
    return users
      .filter((u) => u && typeof u === 'object')
      .map((m: any) => ({ userId: s(m.userId), name: s(m.name), title: s(m.userTitle), avatarUrl: s(m.profilePic) }))
      .filter((u) => u.name && u.userId);
  } catch (e) {
    const m = serverMessage(e);
    throw new RepositoryException(m ? m : 'Search failed. Try again.', { cause: e });
  }
}

const ad = { gcTime: 0 } as const;

export function useUserSearch(query: string) {
  return useQuery<UserSearchResult[]>({ queryKey: ['userSearch', query], queryFn: () => searchUsers(query), enabled: !!query.trim(), ...ad });
}

export function useJobSearch(query: string) {
  return useQuery<JobSummary[]>({
    queryKey: ['jobSearch', query],
    queryFn: async () => (await jobsSearchRepository.searchJobs(jobSearchQuery({ q: query.trim(), page: 1, limit: 20 }))).jobs,
    enabled: !!query.trim(),
    ...ad,
  });
}

export function useExternalJobSearch(query: string) {
  return useQuery<ExternalJob[]>({
    queryKey: ['externalJobSearch', query],
    queryFn: () => externalJobsRepository.search({ q: query.trim(), page: 1, limit: 10 }),
    enabled: !!query.trim(),
    ...ad,
  });
}

export function useCompanySearch(query: string) {
  return useQuery<CompanySummary[]>({
    queryKey: ['companySearch', query],
    queryFn: async () => (await companyRepository.searchCompanies(query.trim(), 1, 10)).companies,
    enabled: !!query.trim(),
    ...ad,
  });
}

// ── Recent searches (device-local, account-scoped) ───────────────────────────

const keyPrefix = 'recent_searches_v1_';
export const kMaxRecentSearches = 10;

export function sessionAccountId(): string {
  const u = authManager.currentUser;
  if (!u) return 'anon';
  if (u.id) return u.id;
  return u.userId ? u.userId : 'anon';
}

let pendingWrite: Promise<void> = Promise.resolve();

const recentStore = {
  async load(account: string): Promise<string[]> {
    try {
      return ((await prefs.getStringList(`${keyPrefix}${account}`)) ?? []).slice(0, kMaxRecentSearches);
    } catch {
      return [];
    }
  },
  save(account: string, queries: string[]) {
    const snapshot = queries.slice(0, kMaxRecentSearches);
    pendingWrite = pendingWrite.then(() => prefs.setStringList(`${keyPrefix}${account}`, snapshot).catch(() => {}));
    return pendingWrite;
  },
};

let account = '';
let mutated = false;
let cleared = false;
const removedIds = new Set<string>();
let gen = 0;

/**
 * Recent-search history: hydrated from storage, merged BEHIND this session's
 * mutations, rebuilt when the signed-in account changes.
 */
export const useRecentSearches = create<{
  items: RecentSearch[];
  ensureLoaded: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  record: (query: string) => void;
}>((set, get) => {
  const persist = () => void recentStore.save(account, get().items.map((r) => r.query));

  const rebuild = () => {
    mutated = false;
    cleared = false;
    removedIds.clear();
    account = sessionAccountId();
    set({ items: [] });
    const g = ++gen;
    const acc = account;
    void (async () => {
      const stored = await recentStore.load(acc);
      if (g !== gen || acc !== sessionAccountId() || cleared || !stored.length) return;
      const seen = new Set(get().items.map((r) => r.query.toLowerCase()));
      const merged = [...get().items];
      let added = false;
      for (const raw of stored) {
        const q = raw.trim();
        if (!q) continue;
        const lower = q.toLowerCase();
        if (removedIds.has(lower) || seen.has(lower)) continue;
        seen.add(lower);
        merged.push({ id: lower, query: q, type: 'generic' });
        added = true;
      }
      if (!added) return;
      set({ items: merged.slice(0, kMaxRecentSearches) });
      if (mutated) persist();
    })();
  };

  let started = false;

  return {
    items: [],
    ensureLoaded: () => {
      if (started) return;
      started = true;
      rebuild();
      authManager.addListener(() => {
        if (sessionAccountId() !== account) rebuild();
      });
    },
    remove: (id) => {
      mutated = true;
      removedIds.add(id.toLowerCase());
      set({ items: get().items.filter((r) => r.id !== id) });
      persist();
    },
    clearAll: () => {
      mutated = true;
      cleared = true;
      set({ items: [] });
      persist();
    },
    record: (query) => {
      const t = query.trim();
      if (!t) return;
      mutated = true;
      const lower = t.toLowerCase();
      set({
        items: [{ id: lower, query: t, type: 'generic' as SearchType }, ...get().items.filter((r) => r.query.toLowerCase() !== lower)].slice(
          0,
          kMaxRecentSearches,
        ),
      });
      persist();
    },
  };
});

/** Local filtering of recents + mock suggestions. */
export function filterSearch(query: string, recent: RecentSearch[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return { recentMatches: [] as RecentSearch[], suggestionMatches: [] as SearchSuggestion[] };
  const matches = (v: string) => v.toLowerCase().includes(needle);
  return {
    recentMatches: recent.filter((r) => matches(r.query)),
    suggestionMatches: searchSuggestions.filter((s) => matches(s.title) || matches(s.subtitle ?? '')),
  };
}
