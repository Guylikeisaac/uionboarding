import { useQuery } from '@tanstack/react-query';

import { authManager } from '@/core/auth/authManager';
import { queryClient } from '@/core/query/queryClient';
import { profileSummaryRepository } from '../data/profileMenu';

export interface ProfileMenuSummary {
  name: string;
  /** Includes the leading "@" (empty if unknown). */
  handle: string;
  avatarUrl: string;
  followers?: number | null;
  connections?: number | null;
}

const key = ['profileSummary'] as const;

async function loadSummary(): Promise<ProfileMenuSummary> {
  const user = authManager.currentUser;
  const handle = user?.userId ?? '';
  if (!handle) return { name: user?.name ?? '', handle: '', avatarUrl: user?.profilePic ?? '' };
  const [connections, followers] = await Promise.all([
    profileSummaryRepository.connectionCount(),
    profileSummaryRepository.followerCount(handle),
  ]);
  return { name: user?.name ?? '', handle: `@${handle}`, avatarUrl: user?.profilePic ?? '', connections, followers };
}

/** The drawer identity + live counts (non-fatal counts). */
export function useProfileSummary() {
  return useQuery<ProfileMenuSummary>({ queryKey: key, queryFn: loadSummary, staleTime: Infinity });
}

export function invalidateProfileSummary() {
  return queryClient.invalidateQueries({ queryKey: key });
}
