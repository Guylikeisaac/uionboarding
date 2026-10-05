import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@/core/query/queryClient';
import { sprintEligibility, type SprintPendingStatus } from '../data/sprintRepositories';

const pendingKey = ['sprintPendingStatus'] as const;
const availableAgainKey = ['sprintAvailableAgain'] as const;

/** The user's owed sprint, for UI surfaces. */
export function useSprintPendingStatus() {
  return useQuery<SprintPendingStatus | null>({ queryKey: pendingKey, queryFn: () => sprintEligibility.pendingStatus(), staleTime: 0 });
}

/** True when a profile update re-armed the sprint after a completion. */
export function useSprintAvailableAgain() {
  return useQuery<boolean>({ queryKey: availableAgainKey, queryFn: () => sprintEligibility.sprintAvailableAgain(), staleTime: 0 });
}

export function invalidateSprintPendingStatus() {
  return queryClient.invalidateQueries({ queryKey: pendingKey });
}

export function invalidateSprintAvailableAgain() {
  return queryClient.invalidateQueries({ queryKey: availableAgainKey });
}

/**
 * Records a hiring-relevant profile update (skills / resume / experience) and
 * refreshes the sprint's status surfaces. Failures are swallowed.
 */
export function notifySprintOfProfileUpdate() {
  sprintEligibility
    .resetEligibilityAfterProfileUpdate()
    .then(() => {
      void invalidateSprintPendingStatus();
      void invalidateSprintAvailableAgain();
    })
    .catch(() => {});
}
