import { useQuery } from '@tanstack/react-query';

import { authManager, useAuth } from '@/core/auth/authManager';
import { queryClient } from '@/core/query/queryClient';
import type { ResumeFile } from '../data/resumeFile';
import { resumeRepository } from '../data/resumeRepository';

/** Session identity key: internal UUID preferred, falling back to the handle. */
export function sessionUserKey(): string {
  const u = authManager.currentUser;
  if (!u) return '';
  return u.id ? u.id : u.userId;
}

const key = ['profileResume'] as const;

/** The signed-in user's latest uploaded resume FILE, or null. */
export function useProfileResume() {
  const userId = useAuth(() => sessionUserKey());
  return useQuery<ResumeFile | null>({
    queryKey: [...key, userId],
    queryFn: () => (userId ? resumeRepository.latestResumeFile(userId) : Promise.resolve(null)),
  });
}

export function invalidateProfileResume() {
  return queryClient.invalidateQueries({ queryKey: key });
}
