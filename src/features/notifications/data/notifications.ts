import { useQuery } from '@tanstack/react-query';

import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { tryParseDate } from '@/core/helpers/dates';
import { relativeTimeFromIso } from '@/core/helpers/relativeTime';
import { serverMessage } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { queryClient } from '@/core/query/queryClient';

export type NotificationKind = 'like' | 'comment' | 'connection' | 'jobMatch' | 'generic';

export interface NotificationItem {
  id: string;
  name: string;
  message: string;
  time: string;
  kind: NotificationKind;
  isUnread: boolean;
  avatarAsset: string;
  avatarUrl: string;
  /** Public handle of the actor (opens their profile); empty otherwise. */
  actorHandle: string;
}

export const notificationIsSystem = (n: NotificationItem) => n.kind === 'jobMatch';

export interface NotificationGroup {
  label: string;
  items: NotificationItem[];
}

export interface NotificationsContent {
  groups: NotificationGroup[];
}

function extractList(body: any): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const data = body.data ?? body.notifications;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const nested = data.notifications ?? data.items ?? data.results;
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

const firstMap = (m: Record<string, any>, keys: string[]) => {
  for (const k of keys) if (m[k] && typeof m[k] === 'object') return m[k] as Record<string, any>;
  return undefined;
};

const firstStr = (m: Record<string, any> | undefined, keys: string[]) => {
  if (!m) return '';
  for (const k of keys) {
    const v = m[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
};

const firstBool = (m: Record<string, any>, keys: string[]) => {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
  }
  return false;
};

function kindOf(raw: string): NotificationKind {
  const t = raw.toLowerCase();
  if (t.includes('like') || t.includes('react')) return 'like';
  if (t.includes('comment') || t.includes('reply')) return 'comment';
  if (t.includes('connect') || t.includes('follow') || t.includes('invite')) return 'connection';
  if (t.includes('job') || t.includes('match') || t.includes('application')) return 'jobMatch';
  return 'generic';
}

function mapEntry(m: Record<string, any>): [NotificationItem, Date | undefined] | null {
  const actor = firstMap(m, ['actor', 'sender', 'fromUser', 'user']);
  const actorName = firstStr(actor, ['name', 'userName']);
  const name = actorName || firstStr(m, ['name', 'title', 'senderName']);
  const message = firstStr(m, ['message', 'text', 'body', 'content', 'description']);
  if (!name && !message) return null;
  const createdAt = firstStr(m, ['createdAt', 'time', 'timestamp', 'date']);
  const at = createdAt ? tryParseDate(createdAt) : undefined;
  return [
    {
      id: firstStr(m, ['id', '_id', 'notificationId']),
      name: name || 'SyncUp',
      message,
      time: relativeTimeFromIso(createdAt),
      kind: kindOf(firstStr(m, ['type', 'kind', 'category', 'event'])),
      isUnread: !firstBool(m, ['read', 'isRead', 'seen']),
      avatarAsset: '',
      avatarUrl: firstStr(actor, ['profilePic', 'avatar', 'image']),
      actorHandle: firstStr(actor, ['userId', 'handle']),
    },
    at,
  ];
}

/** Today / Yesterday / Earlier by timestamp; undated under "Recent". */
function group(entries: [NotificationItem, Date | undefined][]): NotificationGroup[] {
  if (!entries.length) return [];
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  const undated: NotificationItem[] = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  for (const [item, at] of entries) {
    if (!at) {
      undated.push(item);
      continue;
    }
    const day = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
    const days = Math.round((startOfToday - day) / 86_400_000);
    if (days <= 0) today.push(item);
    else if (days === 1) yesterday.push(item);
    else earlier.push(item);
  }
  const out: NotificationGroup[] = [];
  if (today.length) out.push({ label: 'Today', items: today });
  if (yesterday.length) out.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length) out.push({ label: 'Earlier', items: earlier });
  if (undated.length) out.push({ label: 'Recent', items: undated });
  return out;
}

/** `GET /api/notifications` — tolerant parsing. */
export async function fetchNotifications(): Promise<NotificationsContent> {
  try {
    const res = await apiClient.get(ApiConstants.notifications);
    const entries = extractList(res.data)
      .filter((r) => r && typeof r === 'object')
      .map((r) => mapEntry(r as Record<string, any>))
      .filter((e): e is [NotificationItem, Date | undefined] => e != null);
    return { groups: group(entries) };
  } catch (e) {
    const msg = serverMessage(e);
    throw new RepositoryException(msg ? msg : 'Could not load notifications.', { cause: e });
  }
}

const key = ['notifications'] as const;

export function useNotifications() {
  return useQuery<NotificationsContent>({ queryKey: key, queryFn: fetchNotifications, gcTime: 0 });
}

export const invalidateNotifications = () => queryClient.invalidateQueries({ queryKey: key });
export const refreshNotifications = () => queryClient.resetQueries({ queryKey: key });
