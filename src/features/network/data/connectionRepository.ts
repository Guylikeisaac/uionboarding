import { authManager } from '@/core/auth/authManager';
import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, type ApiClient, type ApiResponse } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import {
  makeNetworkPerson,
  relIsAccepted,
  relIsBlocked,
  relIsIncomingPending,
  relIsOutgoingPending,
  type ConnectStatus,
  type ConnectionRelation,
  type ConnectionRequest,
  type MutualConnections,
  type NetworkPerson,
  type NetworkSuggestions,
  type PublicConnectState,
  type SentConnectionRequest,
} from './networkModels';

const str = (v: unknown) => (v == null ? '' : String(v).trim());
const int = (v: unknown) => {
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(String(v ?? ''), 10);
  return Number.isNaN(n) ? 0 : n;
};
const firstNonEmpty = (values: string[]) => values.find(Boolean) ?? '';
const companyName = (v: unknown) => (typeof v === 'string' ? v.trim() : v && typeof v === 'object' ? str((v as any).name) : '');
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {});

/** Unwraps `{data: ...}`, tolerating a bare body. */
function dataOf(res: ApiResponse): any {
  const body = res.data;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) return body.data;
  return body;
}

function mapError(e: unknown, fallback: string): RepositoryException {
  const m = serverMessage(e);
  return new RepositoryException(m ? m : fallback, { cause: e });
}

interface Candidate {
  name: string;
  title: string;
  avatarUrl: string;
  handle: string;
  uniqueId: string;
  mutualCount: number;
  fromMutual: boolean;
}

const connectIdOf = (c: Candidate) => (c.uniqueId ? c.uniqueId : c.handle);
const dedupeKeyOf = (c: Candidate) => (c.handle ? c.handle : connectIdOf(c)).toLowerCase();

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Most mutual first, then name, then id. */
function compareSuggestions(a: NetworkPerson, b: NetworkPerson): number {
  const byMutual = b.mutualCount - a.mutualCount;
  if (byMutual) return byMutual;
  const byName = cmp(a.name.toLowerCase(), b.name.toLowerCase());
  if (byName) return byName;
  return cmp(a.id, b.id);
}

/** Real connection-service client for the Network feature. */
export class ConnectionRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async getPendingRequests(page = 1, limit = 20): Promise<ConnectionRequest[]> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionPending), { params: { page, limit } });
      const data = dataOf(res);
      const list: unknown[] = Array.isArray(data?.pendingConnections) ? data.pendingConnections : [];
      return list
        .filter((r) => r && typeof r === 'object')
        .map((m: any) => {
          const user = obj(m.sentByUser);
          return {
            id: str(m.id),
            userId: str(user.userId),
            name: str(user.name),
            title: str(user.userTitle),
            company: '',
            avatarAsset: '',
            avatarUrl: str(user.profilePic),
            accepted: false,
          };
        })
        .filter((r) => r.id && r.name);
    } catch (e) {
      throw mapError(e, 'Could not load connection requests.');
    }
  }

  /** Self-filtered, de-duplicated, relationship-seeded suggestions. */
  async getPeopleSuggestions(): Promise<NetworkSuggestions> {
    const mutual = await this.fetchMutualCandidates();
    const similar = await this.fetchSimilarCandidates();
    const me = authManager.currentUser;
    const myId = (me?.id ?? '').toLowerCase();
    const myHandle = (me?.userId ?? '').toLowerCase();

    const byKey = new Map<string, Candidate>();
    for (const c of [...mutual, ...similar]) {
      if (!connectIdOf(c) || !c.name) continue;
      if ((myId && c.uniqueId.toLowerCase() === myId) || (myHandle && c.handle.toLowerCase() === myHandle)) continue;
      const k = dedupeKeyOf(c);
      if (!byKey.has(k)) byKey.set(k, c);
    }
    const candidates = [...byKey.values()];
    if (!candidates.length) return { peopleYouMayKnow: [], suggestions: [] };

    const relations = await this.bulkStatusSafe(candidates.map(connectIdOf));
    const excludedIds = Object.keys(relations).length === 0 ? await this.excludedIdsSafe() : new Set<string>();

    const pymk: NetworkPerson[] = [];
    const suggestions: NetworkPerson[] = [];
    for (const c of candidates) {
      const rel: ConnectionRelation = relations[connectIdOf(c)] ?? relations[c.handle] ?? { status: '', isSender: false, connectionId: '' };
      if (relIsAccepted(rel) || relIsBlocked(rel) || relIsIncomingPending(rel)) continue;
      if (Object.keys(relations).length === 0 && c.uniqueId && excludedIds.has(c.uniqueId)) continue;
      const person = this.personOf(c, relIsOutgoingPending(rel) ? 'requested' : 'none');
      (c.fromMutual ? pymk : suggestions).push(person);
    }
    pymk.sort(compareSuggestions);
    suggestions.sort(compareSuggestions);
    return { peopleYouMayKnow: pymk, suggestions };
  }

  /** Accepted connections ("My Network"). */
  async getAcceptedConnections(page = 1, limit = 30, search?: string): Promise<NetworkPerson[]> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionAccepted), {
        params: { page, limit, ...(search?.trim() ? { searchStr: search.trim() } : {}) },
      });
      const data = dataOf(res);
      const list: unknown[] = Array.isArray(data?.acceptedConnections) ? data.acceptedConnections : [];
      const myId = (authManager.currentUser?.id ?? '').toLowerCase();
      return list
        .filter((r) => r && typeof r === 'object')
        .map((m: any) => {
          const user = this.counterpartOf(m, myId);
          const uid = str(user.uniqueId);
          const handle = str(user.userId);
          return makeNetworkPerson({
            id: uid || handle,
            userId: handle,
            name: str(user.name),
            title: str(user.userTitle),
            company: companyName(user.company ?? m.company),
            avatarUrl: str(user.profilePic),
            mutualCount: int(user.mutualConnections ?? m.mutualConnections),
            connectionId: firstNonEmpty([str(m.connectionId), str(m.id)]),
          });
        })
        .filter((p) => p.name);
    } catch (e) {
      throw mapError(e, 'Could not load your connections.');
    }
  }

  async getSentPendingRequests(page = 1, limit = 20): Promise<SentConnectionRequest[]> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionPendingSent), { params: { page, limit } });
      const data = dataOf(res);
      const list: unknown[] = Array.isArray(data?.sentPendingConnections) ? data.sentPendingConnections : [];
      return list
        .filter((r) => r && typeof r === 'object')
        .map((m: any) => {
          const user = obj(m.sentToUser);
          return {
            id: str(m.id),
            receiverId: firstNonEmpty([str(m.sentTo), str(user.uniqueId), str(user.id)]),
            userId: str(user.userId),
            name: str(user.name),
            title: str(user.userTitle),
            avatarUrl: str(user.profilePic),
          };
        })
        .filter((r) => r.name && r.receiverId);
    } catch (e) {
      throw mapError(e, 'Could not load sent requests.');
    }
  }

  /** Non-fatal → 0. */
  async getSentPendingCount(): Promise<number> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionPendingSentCount));
      const data = dataOf(res);
      if (typeof data === 'number') return Math.trunc(data);
      if (data && typeof data === 'object' && data.count != null) return int(data.count);
      return int(data);
    } catch {
      return 0;
    }
  }

  private counterpartOf(m: Record<string, any>, myId: string): Record<string, any> {
    const sentBy = m.sentByUser && typeof m.sentByUser === 'object' ? m.sentByUser : undefined;
    const sentTo = m.sentToUser && typeof m.sentToUser === 'object' ? m.sentToUser : undefined;
    if (myId) {
      if (str(m.sentFrom).toLowerCase() === myId && sentTo) return sentTo;
      if (str(m.sentTo).toLowerCase() === myId && sentBy) return sentBy;
    }
    return (m.user && typeof m.user === 'object' ? m.user : undefined) ?? sentTo ?? sentBy ?? {};
  }

  private async fetchMutualCandidates(): Promise<Candidate[]> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionSuggestionsMutuals));
      const data = dataOf(res);
      const list: unknown[] = Array.isArray(data) ? data : [];
      return list
        .filter((r) => r && typeof r === 'object')
        .map((m: any) => ({
          name: str(m.name),
          title: str(m.userTitle),
          avatarUrl: str(m.profilePic),
          handle: str(m.userId),
          uniqueId: str(m.uniqueId),
          mutualCount: int(m.mutualConnections),
          fromMutual: true,
        }));
    } catch {
      return [];
    }
  }

  private async fetchSimilarCandidates(): Promise<Candidate[]> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeSuggestionsSimilar));
      const data = dataOf(res);
      const list: unknown[] = Array.isArray(data) ? data : [];
      return list
        .filter((r) => r && typeof r === 'object')
        .map((m: any) => ({
          name: str(m.name),
          title: str(m.userTitle),
          avatarUrl: str(m.profilePic),
          handle: str(m.userId),
          uniqueId: str(m.id),
          mutualCount: int(m.mutualSkillsCount),
          fromMutual: false,
        }));
    } catch {
      return [];
    }
  }

  private async bulkStatusSafe(ids: string[]): Promise<Record<string, ConnectionRelation>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    try {
      const res = await this.client.post(ApiConstants.connection(ApiConstants.connectionStatusBulk), { data: { userIds: unique } });
      const data = dataOf(res);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
      const out: Record<string, ConnectionRelation> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object') {
          out[k] = { status: str((v as any).status), isSender: (v as any).isSender === true, connectionId: str((v as any).connectionId) };
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  private async excludedIdsSafe(): Promise<Set<string>> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionIds));
      const data = dataOf(res);
      if (!Array.isArray(data)) return new Set();
      return new Set(data.map(str).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  /** Relationship to [userId] — seeds the public-profile Connect button. */
  async getConnectionState(userId: string): Promise<PublicConnectState> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionStatus(userId)));
      const m = dataOf(res);
      if (!m || typeof m !== 'object') return { kind: 'none', connectionId: '' };
      if (m.isSelf === true) return { kind: 'self', connectionId: '' };
      const status = str(m.status).toUpperCase();
      const connId = str(m.id);
      if (status === 'PENDING') return { kind: m.sentByCurrentUser === true ? 'outgoing' : 'incoming', connectionId: connId };
      if (m.isConnected === true || status === 'ACCEPTED') return { kind: 'connected', connectionId: connId };
      return { kind: 'none', connectionId: '' };
    } catch (e) {
      throw mapError(e, 'Could not load connection status.');
    }
  }

  /** Non-fatal → empty. */
  async getMutuals(userId: string): Promise<MutualConnections> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionMutuals(userId)));
      const m = dataOf(res);
      if (!m || typeof m !== 'object') return { count: 0, sample: [] };
      const users: unknown[] = Array.isArray(m.users) ? m.users : [];
      return {
        count: int(m.count),
        sample: users
          .filter((u) => u && typeof u === 'object')
          .map((u: any) => ({ name: str(u.name), avatarUrl: str(u.profilePic) }))
          .filter((p) => p.name),
      };
    } catch {
      return { count: 0, sample: [] };
    }
  }

  /** Non-fatal → null. */
  async getConnectionCount(userId: string): Promise<number | null> {
    try {
      const res = await this.client.get(ApiConstants.connection(ApiConstants.connectionCount(userId)));
      const data = dataOf(res);
      if (data && typeof data === 'object' && data.connectionCount != null) return int(data.connectionCount);
      if (typeof data === 'number') return Math.trunc(data);
      return null;
    } catch {
      return null;
    }
  }

  async sendConnection(receiverId: string): Promise<string | null> {
    try {
      const res = await this.client.post(ApiConstants.connection(ApiConstants.connectionSend), { data: { receiverId } });
      const data = dataOf(res);
      return data && typeof data === 'object' ? data.connectionId?.toString() ?? null : null;
    } catch (e) {
      throw mapError(e, 'Could not send request. Try again.');
    }
  }

  async withdrawConnection(receiverId: string) {
    try {
      await this.client.post(ApiConstants.connection(ApiConstants.connectionWithdraw), { data: { receiverId } });
    } catch (e) {
      throw mapError(e, 'Could not withdraw request. Try again.');
    }
  }

  /** status ∈ ACCEPTED · REJECTED · BLOCKED */
  async updateConnection(connectionId: string, status: string) {
    try {
      await this.client.put(ApiConstants.connection(ApiConstants.connectionUpdate), { data: { connectionId, status } });
    } catch (e) {
      throw mapError(e, 'Could not update request. Try again.');
    }
  }

  async removeConnection(connectionId: string) {
    try {
      await this.client.delete(ApiConstants.connection(ApiConstants.connectionDelete(connectionId)));
    } catch (e) {
      throw mapError(e, 'Could not remove connection. Try again.');
    }
  }

  private personOf(c: Candidate, status: ConnectStatus): NetworkPerson {
    return makeNetworkPerson({
      id: connectIdOf(c),
      userId: c.handle,
      name: c.name,
      title: c.title,
      company: '',
      avatarUrl: c.avatarUrl,
      mutualCount: c.mutualCount,
      useIconActions: c.fromMutual,
      skillMetric: !c.fromMutual,
      status,
    });
  }
}

export const connectionRepository = new ConnectionRepository();
