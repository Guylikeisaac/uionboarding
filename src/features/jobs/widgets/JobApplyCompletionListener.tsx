import { useEffect } from 'react';

import { push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { showSnackbar } from '@/shared/ui/snackbar';
import { useJobApplyEvents } from '../flows/jobApplyCoordinator';

/**
 * App-level delivery of apply completions whose originating surface was no
 * longer on screen. Only NOTIFIES — never redirects.
 */
export function JobApplyCompletionListener() {
  const event = useJobApplyEvents((s) => s.event);
  useEffect(() => {
    if (!event) return;
    switch (event.outcome) {
      case 'failed':
        showSnackbar(event.errorMessage ?? "Couldn't submit your application. Please try again.", { isError: true });
        break;
      case 'alreadyApplied':
        showSnackbar("You've already applied to this job.");
        break;
      case 'applied':
        if (event.sprintEligible) {
          showSnackbar('Application submitted ✓', {
            actionLabel: 'Start Sprint',
            onAction: () => push(RouteNames.readinessSprintPath(event.jobId), { jobTitle: event.jobTitle }),
          });
        } else {
          showSnackbar('Application submitted ✓');
        }
        break;
      case 'duplicate':
        break;
    }
  }, [event]);
  return null;
}
