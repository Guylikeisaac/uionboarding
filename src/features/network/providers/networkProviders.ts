import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

import { queryClient } from '@/core/query/queryClient';
import { invalidateProfileSummary } from '@/features/profileMenu/providers/profileMenuProviders';
import { connectionRepository as repo } from '../data/connectionRepository';
import type {
  ConnectStatus,
  ConnectionRequest,
  ConnectionStatus,
  MutualConnections,
  NetworkPerson,
  NetworkTab,
  PeopleTabData,
  PublicConnectState,
  SentConnectionRequest,
  SuggestedPerson,
} from '../data/networkModels';

/** How many sent requests complete the guided "Connect with People" goal. */
export const kConnectPeopleGoal = 5;

export const NetworkKeys = {
  people: ['peopleNetwork'] as const,
  pending: ['pendingRequests'] as const,
  accepted: ['acceptedConnections'] as const,
  sent: ['sentPendingRequests'] as const,
  sentCount: ['sentPendingCount'] as const,
  publicConnect: (handle: string) => ['publicConnectState', handle] as const,
  publicConnectAll: ['publicConnectState'] as const,
  mutuals: (handle: string) => ['publicMutuals', handle] as const,
  suggestions: ['connectSuggestions'] as const,
};

/** autoDispose ≈ drop the cache as soon as nothing observes it. */
const autoDispose = { gcTime: 0 } as const;

// ── Network chrome (header + tab selection) ──────────────────────────────────

export const useNetworkContent = create<{
  selectedTab: NetworkTab;
  title: string;
  subtitle: string;
  selectTab: (t: NetworkTab) => void;
}>((set, get) => ({
  selectedTab: 'people',
  title: 'Network',
  subtitle: 'Grow your professional circle',
  selectTab: (t) => {
    if (get().selectedTab === t) return;
    set({ selectedTab: t });
  },
}));

// ── People tab ───────────────────────────────────────────────────────────────

async function loadPeople(): Promise<PeopleTabData> {
  const requests = await repo.getPendingRequests();
  let sugg = { peopleYouMayKnow: [] as NetworkPerson[], suggestions: [] as NetworkPerson[] };
  try {
    sugg = await repo.getPeopleSuggestions();
  } catch {
    // non-fatal
  }
  return { requests, peopleYouMayKnow: sugg.peopleYouMayKnow, suggestions: sugg.suggestions };
}

/** Real People-tab content: pending requests + mutual/similar suggestions. */
export function usePeopleNetwork() {
  return useQuery<PeopleTabData>({ queryKey: NetworkKeys.people, queryFn: loadPeople, staleTime: Infinity, gcTime: Infinity });
}

const getPeople = () => queryClient.getQueryData<PeopleTabData>(NetworkKeys.people);
const setPeople = (d: PeopleTabData) => queryClient.setQueryData(NetworkKeys.people, d);

function applyStatus(d: PeopleTabData, id: string, status: ConnectStatus): PeopleTabData {
  const f = (p: NetworkPerson) => (p.id === id ? { ...p, status } : p);
  return { ...d, peopleYouMayKnow: d.peopleYouMayKnow.map(f), suggestions: d.suggestions.map(f) };
}

/** Invalidates every surface affected by accepting a request. */
function syncAfterAccept() {
  void queryClient.invalidateQueries({ queryKey: NetworkKeys.accepted });
  void queryClient.invalidateQueries({ queryKey: NetworkKeys.pending });
  void invalidateProfileSummary();
}

export const peopleNetworkActions = {
  /** Re-fetch everything (error-state Retry). */
  refresh() {
    return queryClient.resetQueries({ queryKey: NetworkKeys.people });
  },

  /** Accept an incoming request (optimistic remove; reverts + rethrows). */
  async acceptRequest(connectionId: string) {
    const current = getPeople();
    if (!current) return;
    setPeople({ ...current, requests: current.requests.filter((r) => r.id !== connectionId) });
    try {
      await repo.updateConnection(connectionId, 'ACCEPTED');
      syncAfterAccept();
    } catch (e) {
      setPeople(current);
      throw e;
    }
  },

  /** Send ⇄ withdraw. Optimistic; reverts + rethrows. */
  async toggleConnect(personId: string) {
    const current = getPeople();
    if (!current) return;
    const person = [...current.peopleYouMayKnow, ...current.suggestions].find((p) => p.id === personId);
    if (!person) return;
    const wasRequested = person.status === 'requested';
    setPeople(applyStatus(current, personId, wasRequested ? 'none' : 'requested'));
    try {
      if (wasRequested) await repo.withdrawConnection(personId);
      else await repo.sendConnection(personId);
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.sent });
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.sentCount });
    } catch (e) {
      setPeople(current);
      throw e;
    }
  },

  /** Reflect a request sent from another surface, in-memory only. */
  markRequested(personId: string) {
    const current = getPeople();
    if (!current) return;
    setPeople(applyStatus(current, personId, 'requested'));
  },

  invalidate() {
    return queryClient.invalidateQueries({ queryKey: NetworkKeys.people });
  },
};

// ── "Connect with People" goal screen ────────────────────────────────────────

/** Genuinely connectable people only (no relationship yet). */
export function useConnectSuggestions() {
  return useQuery<SuggestedPerson[]>({
    queryKey: NetworkKeys.suggestions,
    queryFn: async () => {
      const people = await repo.getPeopleSuggestions();
      return [...people.peopleYouMayKnow, ...people.suggestions]
        .filter((p) => p.status === 'none')
        .map((p) => ({
          id: p.id,
          userId: p.userId,
          name: p.name,
          title: p.title,
          company: p.company,
          avatarUrl: p.avatarUrl,
          mutualCount: p.mutualCount,
          skillMetric: p.skillMetric,
        }));
    },
    ...autoDispose,
  });
}

/** Per-person status overlay for the goal screen. */
export const useConnectionStatus = create<{
  statuses: Record<string, ConnectionStatus>;
  statusOf: (id: string) => ConnectionStatus;
  connect: (id: string) => Promise<void>;
}>((set, get) => ({
  statuses: {},
  statusOf: (id) => get().statuses[id] ?? 'notConnected',
  connect: async (id) => {
    if (get().statusOf(id) !== 'notConnected') return;
    set({ statuses: { ...get().statuses, [id]: 'connecting' } });
    try {
      await repo.sendConnection(id);
      set({ statuses: { ...get().statuses, [id]: 'requested' } });
      peopleNetworkActions.markRequested(id);
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.sent });
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.sentCount });
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.publicConnectAll });
    } catch (e) {
      set({ statuses: { ...get().statuses, [id]: 'notConnected' } });
      throw e;
    }
  },
}));

// ── My Network: Requests / Connections / Sent ────────────────────────────────

export function usePendingRequests() {
  return useQuery<ConnectionRequest[]>({ queryKey: NetworkKeys.pending, queryFn: () => repo.getPendingRequests(1, 50), ...autoDispose });
}

async function respond(connectionId: string, status: string) {
  const current = queryClient.getQueryData<ConnectionRequest[]>(NetworkKeys.pending);
  if (!current) return;
  queryClient.setQueryData(
    NetworkKeys.pending,
    current.filter((r) => r.id !== connectionId),
  );
  try {
    await repo.updateConnection(connectionId, status);
    void peopleNetworkActions.invalidate();
    if (status === 'ACCEPTED') syncAfterAccept();
  } catch (e) {
    queryClient.setQueryData(NetworkKeys.pending, current);
    throw e;
  }
}

export const pendingRequestsActions = {
  accept: (id: string) => respond(id, 'ACCEPTED'),
  ignore: (id: string) => respond(id, 'REJECTED'),
  refresh: () => queryClient.resetQueries({ queryKey: NetworkKeys.pending }),
};

export function useAcceptedConnections() {
  return useQuery<NetworkPerson[]>({ queryKey: NetworkKeys.accepted, queryFn: () => repo.getAcceptedConnections(1, 50), ...autoDispose });
}

export const acceptedConnectionsActions = {
  refresh: () => queryClient.resetQueries({ queryKey: NetworkKeys.accepted }),
  async remove(connectionId: string) {
    const current = queryClient.getQueryData<NetworkPerson[]>(NetworkKeys.accepted);
    if (!current || !connectionId) return;
    queryClient.setQueryData(
      NetworkKeys.accepted,
      current.filter((p) => p.connectionId !== connectionId),
    );
    try {
      await repo.removeConnection(connectionId);
      void invalidateProfileSummary();
      void peopleNetworkActions.invalidate();
    } catch (e) {
      queryClient.setQueryData(NetworkKeys.accepted, current);
      throw e;
    }
  },
};

/** The signed-in user's connection count, DERIVED from the accepted list. */
export function useSelfConnectionCount() {
  return useQuery<NetworkPerson[], Error, number>({
    queryKey: NetworkKeys.accepted,
    queryFn: () => repo.getAcceptedConnections(1, 50),
    select: (list) => list.length,
    ...autoDispose,
  });
}

export function useSentPendingRequests() {
  return useQuery<SentConnectionRequest[]>({ queryKey: NetworkKeys.sent, queryFn: () => repo.getSentPendingRequests(1, 50), ...autoDispose });
}

export const sentPendingActions = {
  refresh: () => queryClient.resetQueries({ queryKey: NetworkKeys.sent }),
  /** [receiverId] is the recipient UUID the withdraw endpoint expects. */
  async withdraw(connectionId: string, receiverId: string) {
    const current = queryClient.getQueryData<SentConnectionRequest[]>(NetworkKeys.sent);
    if (!current) return;
    queryClient.setQueryData(
      NetworkKeys.sent,
      current.filter((r) => r.id !== connectionId),
    );
    try {
      await repo.withdrawConnection(receiverId);
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.sentCount });
      void peopleNetworkActions.invalidate();
      void queryClient.invalidateQueries({ queryKey: NetworkKeys.publicConnectAll });
    } catch (e) {
      queryClient.setQueryData(NetworkKeys.sent, current);
      throw e;
    }
  },
};

export function useSentPendingCount() {
  return useQuery<number>({ queryKey: NetworkKeys.sentCount, queryFn: () => repo.getSentPendingCount(), ...autoDispose });
}

// ── Public profile relationship ──────────────────────────────────────────────

export function usePublicConnectState(handle: string) {
  return useQuery<PublicConnectState>({
    queryKey: NetworkKeys.publicConnect(handle),
    queryFn: () => repo.getConnectionState(handle),
    enabled: !!handle,
    ...autoDispose,
  });
}

export function usePublicMutuals(handle: string) {
  return useQuery<MutualConnections>({
    queryKey: NetworkKeys.mutuals(handle),
    queryFn: () => repo.getMutuals(handle),
    enabled: !!handle,
    ...autoDispose,
  });
}

export function invalidatePublicConnectState() {
  return queryClient.invalidateQueries({ queryKey: NetworkKeys.publicConnectAll });
}
