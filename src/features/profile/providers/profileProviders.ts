import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

import { authManager } from '@/core/auth/authManager';
import { errorMessage, type SubmitStatus } from '@/core/data/repositoryException';
import { queryClient } from '@/core/query/queryClient';
import { homeFeedActions } from '@/features/home/providers/homeFeed';
import { connectionRepository } from '@/features/network/data/connectionRepository';
import type { PublicConnectState } from '@/features/network/data/networkModels';
import { invalidateProfileSummary } from '@/features/profileMenu/providers/profileMenuProviders';
import type { ProfileEdit, UserProfile } from '../data/profileModels';
import { profileRepository } from '../data/profileRepository';

const myKey = ['myProfile'] as const;

/** Self-loading current-user profile (autoDispose). */
export function useMyProfile() {
  return useQuery<UserProfile>({ queryKey: myKey, queryFn: () => profileRepository.getMyProfile(), gcTime: 0 });
}

export function invalidateMyProfile() {
  return queryClient.invalidateQueries({ queryKey: myKey });
}

/** Read-only profile of another user by public handle. */
export function usePublicProfile(handle: string) {
  return useQuery<UserProfile>({
    queryKey: ['publicProfile', handle],
    queryFn: () => profileRepository.getPublicProfile(handle),
    enabled: !!handle,
    gcTime: 0,
  });
}

/** Profile + connection status together (status degrades to "none"). */
export interface PublicProfileBundle {
  profile: UserProfile;
  connect: PublicConnectState;
}

export function usePublicProfileBundle(handle: string) {
  return useQuery<PublicProfileBundle>({
    queryKey: ['publicProfileBundle', handle],
    queryFn: async () => {
      const profileF = profileRepository.getPublicProfile(handle);
      const connectF = connectionRepository
        .getConnectionState(handle)
        .catch((): PublicConnectState => ({ kind: 'none', connectionId: '' }));
      return { profile: await profileF, connect: await connectF };
    },
    enabled: !!handle,
    gcTime: 0,
  });
}

export function invalidatePublicProfileBundle(handle?: string) {
  return queryClient.invalidateQueries({ queryKey: handle ? ['publicProfileBundle', handle] : ['publicProfileBundle'] });
}

// ── Edit command ─────────────────────────────────────────────────────────────

export const useProfileEditController = create<{
  status: SubmitStatus;
  error?: string;
  submit: (edit: ProfileEdit) => Promise<boolean>;
}>((set) => ({
  status: 'idle',
  submit: async (edit) => {
    set({ status: 'submitting', error: undefined });
    try {
      await profileRepository.updateProfile(edit);
      await authManager.refreshCurrentUser();
      authManager.applyLocalProfileEdits({ name: edit.name, userTitle: edit.headline });
      set({ status: 'success' });
      void invalidateMyProfile();
      void invalidateProfileSummary();
      void homeFeedActions.invalidate();
      return true;
    } catch (e) {
      set({ status: 'error', error: errorMessage(e) });
      return false;
    }
  },
}));
