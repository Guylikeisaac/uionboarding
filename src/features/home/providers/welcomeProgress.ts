import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

import { queryClient } from '@/core/query/queryClient';
import { activityRepository, kActivityTypePostCreated } from '@/features/profile/data/activityRepository';
import { useMyProfile } from '@/features/profile/providers/profileProviders';
import { kConnectPeopleGoal, useSelfConnectionCount, useSentPendingCount } from '@/features/network/providers/networkProviders';
import { sessionUserKey, useProfileResume } from '@/features/resume/providers/profileResume';

/** Welcome checklist milestones, in PRIORITY order. */
export type WelcomeMilestone = 'profileBasics' | 'resume' | 'firstPost' | 'connections';
export const welcomeMilestones: WelcomeMilestone[] = ['profileBasics', 'resume', 'firstPost', 'connections'];

/** true = verified done, false = verified pending, undefined = unknown. */
export type WelcomeProgress = Partial<Record<WelcomeMilestone, boolean | undefined>>;

export const welcomeCompletedCount = (p: WelcomeProgress) => welcomeMilestones.filter((m) => p[m] === true).length;
export const welcomeNextIncomplete = (p: WelcomeProgress) => welcomeMilestones.find((m) => p[m] !== true);

const hasPostKey = ['hasCreatedPost'] as const;

/** Whether the user has at least one POST_CREATED activity. */
export function useHasCreatedPost() {
  return useQuery<boolean>({
    queryKey: hasPostKey,
    queryFn: async () => {
      const uuid = sessionUserKey();
      if (!uuid) return false;
      const page = await activityRepository.loadUserActivities({ userUuid: uuid, page: 1, limit: 1, type: kActivityTypePostCreated });
      return page.activities.length > 0 || page.pagination.totalActivities > 0;
    },
    gcTime: 0,
  });
}

export const invalidateHasCreatedPost = () => queryClient.invalidateQueries({ queryKey: hasPostKey });

/** Optimistic session record of a successful publish, keyed to the user. */
export const useFirstPostSession = create<{ user: string | null; markCreated: () => void }>((set) => ({
  user: null,
  markCreated: () => set({ user: sessionUserKey() }),
}));

/** Derives the welcome checklist from LIVE feature data. */
export function useWelcomeProgress(): WelcomeProgress {
  const profile = useMyProfile();
  const resume = useProfileResume();
  const firstPost = useHasCreatedPost();
  const connectionCount = useSelfConnectionCount();
  const sentCount = useSentPendingCount();
  const sessionPostUser = useFirstPostSession((s) => s.user);

  const profileDone = profile.data
    ? profile.data.profilePic.trim().length > 0 && profile.data.title.trim().length > 0 && profile.data.about.trim().length > 0
    : undefined;
  const resumeDone = resume.isSuccess ? resume.data != null : undefined;
  const sessionCreated = sessionPostUser != null && sessionPostUser === sessionUserKey();
  const firstPostDone = sessionCreated ? true : firstPost.isSuccess ? firstPost.data : undefined;

  const accepted = connectionCount.data;
  const sent = sentCount.data;
  let connectionsDone: boolean | undefined;
  if ((accepted ?? 0) > 0 || (sent ?? 0) >= kConnectPeopleGoal) connectionsDone = true;
  else if (accepted != null && sent != null) connectionsDone = false;

  return { profileBasics: profileDone, resume: resumeDone, firstPost: firstPostDone, connections: connectionsDone };
}
