/** Network content models. */

export type NetworkTab = 'people' | 'groups' | 'events';
export type ConnectStatus = 'none' | 'requested';

/** An inbound connection request. `id` is the connectionId. */
export interface ConnectionRequest {
  id: string;
  userId: string;
  name: string;
  title: string;
  company: string;
  avatarAsset: string;
  avatarUrl: string;
  accepted: boolean;
}

export const requestSubtitle = (r: ConnectionRequest) => (r.company ? `${r.title} @${r.company}` : r.title);

/** An outgoing (sent) pending request. */
export interface SentConnectionRequest {
  id: string;
  /** Recipient UUID — the withdraw key. */
  receiverId: string;
  userId: string;
  name: string;
  title: string;
  avatarUrl: string;
}

/** A person in "People you may know" / "Suggestions" / "Connections". */
export interface NetworkPerson {
  /** Connection receiver id (UUID or handle). */
  id: string;
  /** Public handle — opens the public profile. */
  userId: string;
  name: string;
  title: string;
  company: string;
  avatarAsset: string;
  avatarUrl: string;
  mutualCount: number;
  /** Accepted-connection record id (Connections only). */
  connectionId: string;
  mutualCapped: boolean;
  useIconActions: boolean;
  /** mutualCount counts shared SKILLS, not mutual connections. */
  skillMetric: boolean;
  status: ConnectStatus;
}

export function makeNetworkPerson(p: Partial<NetworkPerson> & Pick<NetworkPerson, 'id' | 'name' | 'title' | 'company' | 'mutualCount'>): NetworkPerson {
  return {
    userId: '',
    avatarAsset: '',
    avatarUrl: '',
    connectionId: '',
    mutualCapped: false,
    useIconActions: false,
    skillMetric: false,
    status: 'none',
    ...p,
  };
}

export const personSubtitle = (p: NetworkPerson) => (p.company ? `${p.title} · ${p.company}` : p.title);

/** Honest relationship metric. */
export function personMetricLabel(p: { skillMetric: boolean; mutualCount: number; mutualCapped?: boolean }): string {
  if (p.skillMetric) {
    if (p.mutualCount <= 0) return 'Suggested for you';
    return p.mutualCount === 1 ? '1 shared skill' : `${p.mutualCount} shared skills`;
  }
  const capped = p.mutualCapped ? '+' : '';
  return p.mutualCount === 1 ? '1 mutual connection' : `${p.mutualCount}${capped} mutual connections`;
}

export interface PeopleTabData {
  requests: ConnectionRequest[];
  peopleYouMayKnow: NetworkPerson[];
  suggestions: NetworkPerson[];
}

/** A person suggested on the "Connect with People" goal screen. */
export interface SuggestedPerson {
  id: string;
  userId: string;
  name: string;
  title: string;
  company: string;
  avatarUrl: string;
  mutualCount: number;
  skillMetric: boolean;
}

export type ConnectionStatus = 'notConnected' | 'connecting' | 'requested';

// ── Relationship ─────────────────────────────────────────────────────────────

export interface ConnectionRelation {
  status: string;
  isSender: boolean;
  connectionId: string;
}

export const relIsAccepted = (r: ConnectionRelation) => r.status.toUpperCase() === 'ACCEPTED';
export const relIsBlocked = (r: ConnectionRelation) => r.status.toUpperCase() === 'BLOCKED';
export const relIsPending = (r: ConnectionRelation) => r.status.toUpperCase() === 'PENDING';
export const relIsOutgoingPending = (r: ConnectionRelation) => relIsPending(r) && r.isSender;
export const relIsIncomingPending = (r: ConnectionRelation) => relIsPending(r) && !r.isSender;

export type PublicConnectKind = 'none' | 'outgoing' | 'incoming' | 'connected' | 'self';

export interface PublicConnectState {
  kind: PublicConnectKind;
  connectionId: string;
}

export interface MutualPerson {
  name: string;
  avatarUrl: string;
}

export interface MutualConnections {
  count: number;
  sample: MutualPerson[];
}

export interface NetworkSuggestions {
  peopleYouMayKnow: NetworkPerson[];
  suggestions: NetworkPerson[];
}
