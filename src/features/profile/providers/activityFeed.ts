import { useEffect } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { RepositoryException } from '@/core/data/repositoryException';
import type { Activity } from '@/features/post/data/postModels';
import { activityRepository, kActivityPageSize, kActivityTypePostCreated } from '../data/activityRepository';

/** One feed: the profile's internal UUID plus an optional single-type filter. */
export interface ActivityFeedKey {
  uuid: string;
  type?: string;
}

export interface ActivityFeedState {
  activities: Activity[];
  hasMore: boolean;
  nextPage?: number;
  totalActivities: number;
  pendingIds: Set<string>;
  isInitialLoading: boolean;
  initialError?: string;
  isLoadingMore: boolean;
  loadMoreError?: string;
}

interface ActivityFeedActions {
  retry: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteActivity: (id: string) => Promise<string | null>;
  setVisibility: (id: string, visibility: string) => Promise<string | null>;
}

type FeedStore = UseBoundStore<StoreApi<ActivityFeedState & ActivityFeedActions>>;

const initial = (): ActivityFeedState => ({
  activities: [],
  hasMore: false,
  totalActivities: 0,
  pendingIds: new Set(),
  isInitialLoading: true,
  isLoadingMore: false,
});

const messageFor = (e: unknown) => (e instanceof RepositoryException ? e.message : "We couldn't load this activity.");

function dedupe(existing: Activity[], incoming: Activity[]): Activity[] {
  const seen = new Set(existing.map((a) => a.id));
  const out = [...existing];
  for (const a of incoming) {
    if (!a.id || !seen.has(a.id)) {
      if (a.id) seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

const keyString = (k: ActivityFeedKey) => `${k.uuid}|${k.type ?? ''}`;
const stores = new Map<string, { store: FeedStore; refs: number; disposeTimer?: ReturnType<typeof setTimeout> }>();

function createFeedStore(key: ActivityFeedKey): FeedStore {
  let gen = 0;
  let serverTotal = 0;
  let localDelta = 0;
  const effectiveTotal = () => Math.max(0, serverTotal + localDelta);

  return create<ActivityFeedState & ActivityFeedActions>((set, get) => {
    const fetchFirst = async (g: number) => {
      try {
        const page = await activityRepository.loadUserActivities({ userUuid: key.uuid, page: 1, limit: kActivityPageSize, type: key.type });
        if (g !== gen) return;
        serverTotal = page.pagination.totalActivities;
        set({
          ...initial(),
          activities: dedupe([], page.activities),
          hasMore: page.pagination.hasMore,
          nextPage: page.pagination.nextPage,
          totalActivities: effectiveTotal(),
          isInitialLoading: false,
        });
      } catch (e) {
        if (g !== gen) return;
        set({ ...initial(), isInitialLoading: false, initialError: messageFor(e) });
      }
    };

    const clearPending = (id: string) => {
      const next = new Set(get().pendingIds);
      next.delete(id);
      set({ pendingIds: next });
    };

    /** Posts is a filtered view of Activities — refresh the other tab. */
    const invalidateSibling = () => {
      const sibling: ActivityFeedKey = key.type == null ? { uuid: key.uuid, type: kActivityTypePostCreated } : { uuid: key.uuid };
      invalidateActivityFeed(sibling);
    };

    setTimeout(() => void fetchFirst(++gen), 0);

    return {
      ...initial(),
      retry: () => {
        const g = ++gen;
        serverTotal = 0;
        localDelta = 0;
        set(initial());
        return fetchFirst(g);
      },
      loadMore: async () => {
        const s = get();
        if (s.isInitialLoading || s.isLoadingMore || !s.hasMore || s.nextPage == null) return;
        const g = gen;
        set({ isLoadingMore: true, loadMoreError: undefined });
        try {
          const page = await activityRepository.loadUserActivities({ userUuid: key.uuid, page: s.nextPage, limit: kActivityPageSize, type: key.type });
          if (g !== gen) return;
          serverTotal = page.pagination.totalActivities;
          set({
            activities: dedupe(get().activities, page.activities),
            hasMore: page.pagination.hasMore,
            nextPage: page.pagination.nextPage,
            totalActivities: effectiveTotal(),
            isLoadingMore: false,
          });
        } catch (e) {
          if (g !== gen) return;
          set({ isLoadingMore: false, loadMoreError: messageFor(e) });
        }
      },
      deleteActivity: async (id) => {
        if (get().pendingIds.has(id)) return null;
        const index = get().activities.findIndex((a) => a.id === id);
        if (index < 0) return null;
        const removed = get().activities[index];
        localDelta -= 1;
        set({
          activities: get().activities.filter((a) => a.id !== id),
          totalActivities: effectiveTotal(),
          pendingIds: new Set([...get().pendingIds, id]),
        });
        try {
          await activityRepository.deleteActivity(id);
          clearPending(id);
          invalidateSibling();
          return null;
        } catch (e) {
          localDelta += 1;
          const rows = [...get().activities];
          if (!rows.some((a) => a.id === id)) rows.splice(Math.min(index, rows.length), 0, removed);
          set({ activities: rows, totalActivities: effectiveTotal() });
          clearPending(id);
          return messageFor(e);
        }
      },
      setVisibility: async (id, visibility) => {
        if (get().pendingIds.has(id)) return null;
        const row = get().activities.find((a) => a.id === id);
        if (!row) return null;
        const previous = row.visibility;
        const patchRow = (fn: (a: Activity) => Activity) => set({ activities: get().activities.map((a) => (a.id === id ? fn(a) : a)) });
        patchRow((a) => ({ ...a, visibility }));
        set({ pendingIds: new Set([...get().pendingIds, id]) });
        try {
          const updated = await activityRepository.setActivityVisibility(id, visibility);
          if (updated.id) patchRow(() => updated);
          clearPending(id);
          invalidateSibling();
          return null;
        } catch (e) {
          patchRow((a) => ({ ...a, visibility: previous }));
          clearPending(id);
          return messageFor(e);
        }
      },
    };
  });
}

function acquire(key: ActivityFeedKey) {
  const k = keyString(key);
  let entry = stores.get(k);
  if (!entry) {
    entry = { store: createFeedStore(key), refs: 0 };
    stores.set(k, entry);
  }
  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = undefined;
  }
  return entry;
}

/** autoDispose.family: keyed store, disposed shortly after its last user leaves. */
export function useActivityFeed<T>(key: ActivityFeedKey, select: (s: ActivityFeedState & ActivityFeedActions) => T): T {
  const entry = acquire(key);
  useEffect(() => {
    const e = acquire(key);
    e.refs++;
    return () => {
      e.refs--;
      if (e.refs <= 0) {
        e.disposeTimer = setTimeout(() => stores.delete(keyString(key)), 1000);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key.uuid, key.type]);
  return entry.store(select);
}

export function activityFeedActions(key: ActivityFeedKey): ActivityFeedActions {
  return acquire(key).store.getState();
}

/** Invalidate one feed (or every feed when [key] is omitted). */
export function invalidateActivityFeed(key?: ActivityFeedKey) {
  if (key) {
    const e = stores.get(keyString(key));
    if (e) void e.store.getState().retry();
    return;
  }
  for (const e of stores.values()) void e.store.getState().retry();
}
